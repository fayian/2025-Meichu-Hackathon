import cv2
import mediapipe as mp
import numpy as np
import time
from playsound import playsound
import os
import math
from collections import deque

class PosturePomodoroModel:
    def __init__(self, config=None):
        print("Model initialized")
        self.config = config or {
            # Config
            "POMODORO_MINUTES": 0.5,      # Focus duration before break
            "BREAK_MINUTES": 5,           # Break duration
            "MOVEMENT_WINDOW_SEC": 3.0,   # Window to estimate motion (seconds)
            "STILL_SPEED_THRESH": 15.0,   # px/sec; below this = "still"
            "STANDUP_MOVE_THRESH": 100.0, # px displacement that counts as "stood/moved"
            "ABSENCE_RESET_SEC": 3.0,     # If away > this, reset focus timer
            "POSTURE_ALERT_COOLDOWN": 5,  # seconds for posture alert sound
            "SOUND_FILE": "alert.mp3",    # sound file to play if exists
            "REQUIRE_CONTINUOUS_SIT": True,  # focus timer resets on large movement/absence

            # --- Hydration reminder (new) ---
            "HYDRATE_EVERY_MINUTES": 0.25,          # remind to drink every N minutes
            "HYDRATE_ALERT_COOLDOWN": 30,         # seconds between hydration alert beeps
            "BABY_BLUE_BGR": (240, 207, 137),     # Baby blue (#89CFF0) in OpenCV's BGR

            # Visual preferences
            "SHOW_POSE_IN_BREAK": False,      # <<< Hide skeleton/angles in break mode (still detect)
            "DIM_BACKGROUND_ON_BREAK": True  # Dim screen behind the break banner
        }

        # MediaPipe
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.pose = self.mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5, min_tracking_confidence=0.5)
        # self.cap = cv2.VideoCapture(0)
        self.cap = None

        # State & Vars
        self.is_calibrated = False
        self.calibration_frames = 0
        self.calibration_shoulder_angles, self.calibration_neck_angles = [], []
        self.shoulder_threshold = None
        self.neck_threshold = None
        self.last_posture_alert_time = 0

        self.pomodoro_seconds = self.config["POMODORO_MINUTES"] * 60
        self.break_seconds = self.config["BREAK_MINUTES"] * 60
        self.hydrate_seconds = self.config["HYDRATE_EVERY_MINUTES"] * 60  # (new)

        self.mode = "focus"               # "focus" or "break"
        self.sit_timer_start = None       # focus start time
        self.break_timer_start = None     # break start time
        self.last_seen_time = None

        # Hydration timers (new)
        self.hydrate_timer_start = time.time()
        self.last_hydrate_alert_time = 0

        self.centroid_history = deque()   # (t, (x,y))
        self.last_centroid_for_standup = None

        self.posture_status = None
        self.do_posture_test = False
        self.do_drinking_test = False
        self.last_drink_time = time.localtime(time.time())

    def calculate_angle(self, a, b, c):
        a = np.array(a, dtype=np.float32)
        b = np.array(b, dtype=np.float32)
        c = np.array(c, dtype=np.float32)
        ba = a - b
        bc = c - b
        denom = (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
        cosine_angle = float(np.dot(ba, bc) / denom)
        angle = np.degrees(np.arccos(np.clip(cosine_angle, -1.0, 1.0)))
        return angle
    
    def draw_angle(self, image, a, b, c, angle, color):
        cv2.line(image, a, b, color, 2)
        cv2.line(image, b, c, color, 2)
        cv2.circle(image, b, 5, color, -1)
        cv2.putText(image, f"{int(angle)}°", (b[0]+6, b[1]-6), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

    def play_beep(self):
        if os.path.exists(self.config["SOUND_FILE"]):
            try:
                playsound(self.config["SOUND_FILE"])
            except Exception:
                pass

    def format_mmss(self, seconds):
        seconds = max(0, int(seconds))
        return f"{seconds//60:02d}:{seconds%60:02d}"

    def draw_centered_text(self, img, text, y, font, scale, color, thickness):
        (tw, th), _ = cv2.getTextSize(text, font, scale, thickness)
        x = (img.shape[1] - tw) // 2
        cv2.putText(img, text, (x, y), font, scale, color, thickness, cv2.LINE_AA)

    def draw_dim_overlay(self, img, alpha=0.35):
        overlay = img.copy()
        cv2.rectangle(overlay, (0, 0), (img.shape[1], img.shape[0]), (0, 0, 0), -1)
        cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)

    def add_centroid(self, xy, now):
        self.centroid_history.append((now, xy))
        horizon = now - self.config["MOVEMENT_WINDOW_SEC"]
        while self.centroid_history and self.centroid_history[0][0] < horizon:
            self.centroid_history.popleft()

    def avg_speed_px_per_sec(self):
        if len(self.centroid_history) < 2:
            return 0.0
        dist = 0.0
        duration = self.centroid_history[-1][0] - self.centroid_history[0][0]
        if duration <= 0:
            return 0.0
        for i in range(1, len(self.centroid_history)):
            p0 = self.centroid_history[i-1][1]
            p1 = self.centroid_history[i][1]
            dist += math.hypot(p1[0]-p0[0], p1[1]-p0[1])
        return dist / duration

    def is_still(self):
        return self.avg_speed_px_per_sec() < self.config["STILL_SPEED_THRESH"]
    
    def get_posture_status(self):
        return self.posture_status
    
    def drinking_water_test(self, left_shoulder, right_shoulder, left_wrist, right_wrist):
        if left_wrist.y < left_shoulder.y and left_wrist.x > left_shoulder.x:
            self.last_drink_time = time.localtime(time.time())
            print("Detected drinking with left hand.")       

        if right_wrist.y < right_shoulder.y and right_wrist.x < right_shoulder.x:
            self.last_drink_time = time.localtime(time.time())
            print("Detected drinking with right hand.")
    
    def posture_test(self, shoulder_angle, neck_angle):
        if shoulder_angle < self.shoulder_threshold or neck_angle < self.neck_threshold:
            status = "Poor Posture"
            self.posture_status = status
        else:
            status = "Good Posture"
            self.posture_status = status

    def start_posture_detection(self):
        self.do_posture_test = True
        if self.cap is None:
            self.cap = cv2.VideoCapture(0)


    def start_drinking_detection(self):
        self.do_drinking_test = True
        if self.cap is None:
            self.cap = cv2.VideoCapture(0)

    
    def stop_posture_detection(self):
        self.do_posture_test = False
    
    def stop_drinking_detection(self):
        self.do_drinking_test = False

    def run(self):
        while self.cap.isOpened() and (self.do_posture_test or self.do_drinking_test):
            ret, frame = self.cap.read()
            if not ret:
                continue

            frame = cv2.flip(frame, 1)
            H, W = frame.shape[:2]
            now = time.time()

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.pose.process(rgb_frame)
            pose_ok = results.pose_landmarks is not None

            # Extract landmarks (even in break mode, to keep detecting)
            if pose_ok:
                landmarks = results.pose_landmarks.landmark
                l_sh = (int(landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value].x * W),
                        int(landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value].y * H))
                r_sh = (int(landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x * W),
                        int(landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y * H))
                l_ear = (int(landmarks[self.mp_pose.PoseLandmark.LEFT_EAR.value].x * W),
                        int(landmarks[self.mp_pose.PoseLandmark.LEFT_EAR.value].y * H))

                centroid = ((l_sh[0] + r_sh[0]) // 2, (l_sh[1] + r_sh[1]) // 2)
                self.add_centroid(centroid, now)

                shoulder_angle = self.calculate_angle(l_sh, r_sh, (r_sh[0], 0))
                neck_angle = self.calculate_angle(l_ear, l_sh, (l_sh[0], 0))

                # Calibration
                if not self.is_calibrated and self.calibration_frames < 30:
                    self.calibration_shoulder_angles.append(shoulder_angle)
                    self.calibration_neck_angles.append(neck_angle)
                    self.calibration_frames += 1
                elif not self.is_calibrated:
                    self.shoulder_threshold = float(np.mean(self.calibration_shoulder_angles) - 10.0)
                    self.neck_threshold = float(np.mean(self.calibration_neck_angles) - 10.0)
                    self.is_calibrated = True
                    print(f"Calibration complete. Shoulder threshold: {self.shoulder_threshold:.1f}, Neck threshold: {self.neck_threshold:.1f}")
            
            if self.is_calibrated:
                if self.do_posture_test:
                    self.posture_test(shoulder_angle, neck_angle)
                if self.do_drinking_test:
                    self.drinking_water_test(left_shoulder=landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value],
                                    right_shoulder=landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value],
                                    left_wrist=landmarks[self.mp_pose.PoseLandmark.LEFT_WRIST.value],
                                    right_wrist=landmarks[self.mp_pose.PoseLandmark.RIGHT_WRIST.value])

        print("Exiting run loop ~~~~~~~~~~~~~~~~~~~.")
            

    '''
    def run(self):
        while self.cap.isOpened() and not self.stop_detection:
            ret, frame = self.cap.read()
            if not ret:
                continue

            frame = cv2.flip(frame, 1)
            H, W = frame.shape[:2]
            now = time.time()

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.pose.process(rgb_frame)
            pose_ok = results.pose_landmarks is not None

            # Extract landmarks (even in break mode, to keep detecting)
            if pose_ok:
                landmarks = results.pose_landmarks.landmark
                l_sh = (int(landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value].x * W),
                        int(landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value].y * H))
                r_sh = (int(landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x * W),
                        int(landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y * H))
                l_ear = (int(landmarks[self.mp_pose.PoseLandmark.LEFT_EAR.value].x * W),
                        int(landmarks[self.mp_pose.PoseLandmark.LEFT_EAR.value].y * H))

                centroid = ((l_sh[0] + r_sh[0]) // 2, (l_sh[1] + r_sh[1]) // 2)
                self.add_centroid(centroid, now)

                shoulder_angle = self.calculate_angle(l_sh, r_sh, (r_sh[0], 0))
                neck_angle = self.calculate_angle(l_ear, l_sh, (l_sh[0], 0))

                # Calibration
                if not self.is_calibrated and self.calibration_frames < 30:
                    self.calibration_shoulder_angles.append(shoulder_angle)
                    self.calibration_neck_angles.append(neck_angle)
                    self.calibration_frames += 1
                    if self.mode == "focus":  # show text only in focus to reduce clutter
                        cv2.putText(frame, f"Calibrating... {self.calibration_frames}/30", (10, 30),
                                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2, cv2.LINE_AA)
                elif not self.is_calibrated:
                    self.shoulder_threshold = float(np.mean(self.calibration_shoulder_angles) - 10.0)
                    self.neck_threshold = float(np.mean(self.calibration_neck_angles) - 10.0)
                    self.is_calibrated = True
                    print(f"Calibration complete. Shoulder threshold: {self.shoulder_threshold:.1f}, Neck threshold: {self.neck_threshold:.1f}")

                if self.mode == "focus":
                    self.mp_drawing.draw_landmarks(frame, results.pose_landmarks, self.mp_pose.POSE_CONNECTIONS)
                    mid = ((l_sh[0] + r_sh[0]) // 2, (l_sh[1] + r_sh[1]) // 2)
                    self.draw_angle(frame, l_sh, mid, (mid[0], 0), shoulder_angle, (255, 0, 0))
                    self.draw_angle(frame, l_ear, l_sh, (l_sh[0], 0), neck_angle, (0, 255, 0))

                    # Posture feedback (focus mode only)
                    if self.is_calibrated:
                        if shoulder_angle < self.shoulder_threshold or neck_angle < self.neck_threshold:
                            status = "Poor Posture"
                            self.posture_status = status
                            color = (0, 0, 255)
                            if now - self.last_posture_alert_time > self.config["POSTURE_ALERT_COOLDOWN"]:
                                print("Poor posture detected! Please sit up straight.")
                                self.play_beep()
                                self.last_posture_alert_time = now
                        else:
                            status = "Good Posture"
                            self.posture_status = status
                            color = (0, 255, 0)
                        cv2.putText(frame, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2, cv2.LINE_AA)
                        cv2.putText(frame, f"Shoulder: {shoulder_angle:.1f}/{self.shoulder_threshold:.1f}", (10, 60),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 1, cv2.LINE_AA)
                        cv2.putText(frame, f"Neck: {neck_angle:.1f}/{self.neck_threshold:.1f}", (10, 90),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 1, cv2.LINE_AA)

                self.last_seen_time = now

                # print("test drinking water .......")
                self.is_drinking_water(left_shoulder=landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value],
                                    right_shoulder=landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value],
                                    left_wrist=landmarks[self.mp_pose.PoseLandmark.LEFT_WRIST.value],
                                    right_wrist=landmarks[self.mp_pose.PoseLandmark.RIGHT_WRIST.value])

                if self.mode == "focus":
                    # Consider "sitting/focusing" when relatively still
                    if self.is_still():
                        if self.sit_timer_start is None:
                            self.sit_timer_start = now
                            self.last_centroid_for_standup = centroid
                        elapsed = now - self.sit_timer_start
                        remaining = self.pomodoro_seconds - elapsed

                        # Focus timer (top-right)
                        cv2.putText(frame, f"Focus: {self.format_mmss(remaining)}", (W - 220, 30),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (139,0,139), 2, cv2.LINE_AA)

                        # Hydration reminder (placed below "Focus")
                        hydrate_elapsed = now - self.hydrate_timer_start
                        hydrate_remaining = self.hydrate_seconds - hydrate_elapsed
                        if hydrate_remaining > 0:
                            cv2.putText(frame, f"Hydrate: {self.format_mmss(hydrate_remaining)}",
                                        (W - 220, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, self.config["BABY_BLUE_BGR"], 2, cv2.LINE_AA)
                        else:
                            # Alert to drink water
                            cv2.putText(frame, "Hydrate now! (press [h] after drinking)",
                                        (W - 420, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, self.config["BABY_BLUE_BGR"], 2, cv2.LINE_AA)
                            if now - self.last_hydrate_alert_time > self.config["HYDRATE_ALERT_COOLDOWN"]:
                                print("Hydration reminder: Please drink some water.")
                                self.play_beep()
                                self.last_hydrate_alert_time = now

                        # Reached focus target → start break
                        if elapsed >= self.pomodoro_seconds:
                            self.mode = "break"
                            self.break_timer_start = now
                            self.sit_timer_start = None
                            self.last_centroid_for_standup = None
                            print(f"Pomodoro up! {self.config['POMODORO_MINUTES']} min reached. Break starts ({self.config['BREAK_MINUTES']} min).")
                            self.play_beep()
                    else:
                        # Movement in focus → reset if continuous focus required
                        if self.config["REQUIRE_CONTINUOUS_SIT"] and self.sit_timer_start is not None:
                            if self.last_centroid_for_standup is not None:
                                disp = math.hypot(centroid[0]-self.last_centroid_for_standup[0],
                                                centroid[1]-self.last_centroid_for_standup[1])
                                if disp > self.config["STANDUP_MOVE_THRESH"]:
                                    self.sit_timer_start = None
                                    self.last_centroid_for_standup = None
                            else:
                                self.sit_timer_start = None

                elif self.mode == "break":
                    # Live break countdown
                    if break_timer_start is None:
                        break_timer_start = now
                    break_elapsed = now - break_timer_start
                    break_remaining = self.break_seconds - break_elapsed

                    if self.config["DIM_BACKGROUND_ON_BREAK"]:
                        self.draw_dim_overlay(frame, alpha=0.35)

                    # Centered break UI
                    self.draw_centered_text(frame, f"BREAK: {self.format_mmss(break_remaining)}",
                                    int(H*0.45), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (0, 0, 255), 3)
                    self.draw_centered_text(frame, "Stand, stretch, move around!",
                                    int(H*0.55), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
                    if self.is_still():
                        self.draw_centered_text(frame, "Tip: try walking or stretching",
                                        int(H*0.63), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

                    # When break finishes, auto-ready to resume focus
                    if break_remaining <= 0:
                        self.draw_centered_text(frame, "Break over! Press [n] or sit to resume.",
                                        int(H*0.72), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 200, 0), 2)
                        if pose_ok and self.is_still():
                            mode = "focus"
                            sit_timer_start = now
                            break_timer_start = None
                            self.centroid_history.clear()
                            self.last_centroid_for_standup = None
                            print("Resuming focus.")
                            self.play_beep()

            else:
                # No pose detected
                if self.last_seen_time is not None and (now - self.last_seen_time) > self.config["ABSENCE_RESET_SEC"] and self.mode == "focus":
                    self.sit_timer_start = None
                    self.last_centroid_for_standup = None
                cv2.putText(frame, "No person detected", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (200, 200, 200), 2, cv2.LINE_AA)

                # Keep break countdown even if you step away
                if self.mode == "break":
                    if break_timer_start is None:
                        break_timer_start = now
                    break_elapsed = now - break_timer_start
                    break_remaining = self.break_seconds - break_elapsed
                    if self.config["DIM_BACKGROUND_ON_BREAK"]:
                        self.draw_dim_overlay(frame, alpha=0.35)
                    self.draw_centered_text(frame, f"BREAK: {self.format_mmss(break_remaining)}",
                                    int(H*0.45), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (0, 0, 255), 3)

            # Footer / hotkeys
            footer = ("Mode: {mode} | Focus: {fm}m  Break: {bm}m  Hydrate: {hm}m   "
                    "[r]=reset focus   [h]=mark water   [n]=end break now   [q]=quit").format(
                mode=self.mode.upper(), fm=self.config["POMODORO_MINUTES"], bm=self.config["BREAK_MINUTES"], hm=self.config["HYDRATE_EVERY_MINUTES"]
            )
            cv2.putText(frame, footer, (10, H-10), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (180,255,180), 1, cv2.LINE_AA)

            # Render
            # cv2.imshow('Posture + Pomodoro', frame)
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('r'):
                # Reset focus timer (only meaningful in focus mode)
                self.sit_timer_start = None
                self.centroid_history.clear()
                self.last_centroid_for_standup = None
                print("Focus timer reset.")
            elif key == ord('n'):
                # End break immediately and resume focus
                if self.mode == "break":
                    self.mode = "focus"
                    self.sit_timer_start = time.time()
                    self.break_timer_start = None
                    self.centroid_history.clear()
                    self.last_centroid_for_standup = None
                    print("Break ended manually. Resuming focus.")
                    self.play_beep()
            elif key == ord('h'):
                # Mark that you drank water (reset hydration timer)
                self.hydrate_timer_start = time.time()
                print("Hydration timer reset. Stay hydrated!")
    '''