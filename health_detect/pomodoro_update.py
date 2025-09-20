import cv2
import mediapipe as mp
import numpy as np
import time
from playsound import playsound
import os
import math
from collections import deque

# Config
POMODORO_MINUTES = 0.5      # Focus duration before break
BREAK_MINUTES = 5           # Break duration
MOVEMENT_WINDOW_SEC = 3.0   # Window to estimate motion (seconds)
STILL_SPEED_THRESH = 15.0   # px/sec; below this = "still"
STANDUP_MOVE_THRESH = 100.0 # px displacement that counts as "stood/moved"
ABSENCE_RESET_SEC = 3.0     # If away > this, reset focus timer
POSTURE_ALERT_COOLDOWN = 5  # seconds for posture alert sound
SOUND_FILE = "alert.mp3"    # sound file to play if exists
REQUIRE_CONTINUOUS_SIT = True  # focus timer resets on large movement/absence

# --- Hydration reminder (new) ---
HYDRATE_EVERY_MINUTES = 0.25          # remind to drink every N minutes
HYDRATE_ALERT_COOLDOWN = 30         # seconds between hydration alert beeps
BABY_BLUE_BGR = (240, 207, 137)     # Baby blue (#89CFF0) in OpenCV's BGR

# Visual preferences
SHOW_POSE_IN_BREAK = False      # <<< Hide skeleton/angles in break mode (still detect)
DIM_BACKGROUND_ON_BREAK = True  # Dim screen behind the break banner

# Helpers
def calculate_angle(a, b, c):
    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)
    c = np.array(c, dtype=np.float32)
    ba = a - b
    bc = c - b
    denom = (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    cosine_angle = float(np.dot(ba, bc) / denom)
    angle = np.degrees(np.arccos(np.clip(cosine_angle, -1.0, 1.0)))
    return angle

def draw_angle(image, a, b, c, angle, color):
    cv2.line(image, a, b, color, 2)
    cv2.line(image, b, c, color, 2)
    cv2.circle(image, b, 5, color, -1)
    cv2.putText(image, f"{int(angle)}°", (b[0]+6, b[1]-6), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

def play_beep():
    if os.path.exists(SOUND_FILE):
        try:
            playsound(SOUND_FILE)
        except Exception:
            pass

def format_mmss(seconds):
    seconds = max(0, int(seconds))
    return f"{seconds//60:02d}:{seconds%60:02d}"

def draw_centered_text(img, text, y, font, scale, color, thickness):
    (tw, th), _ = cv2.getTextSize(text, font, scale, thickness)
    x = (img.shape[1] - tw) // 2
    cv2.putText(img, text, (x, y), font, scale, color, thickness, cv2.LINE_AA)

def draw_dim_overlay(img, alpha=0.35):
    overlay = img.copy()
    cv2.rectangle(overlay, (0, 0), (img.shape[1], img.shape[0]), (0, 0, 0), -1)
    cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)

# MediaPipe
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
pose = mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5, min_tracking_confidence=0.5)
cap = cv2.VideoCapture(0)

# State & Vars
is_calibrated = False
calibration_frames = 0
calibration_shoulder_angles, calibration_neck_angles = [], []
shoulder_threshold = None
neck_threshold = None
last_posture_alert_time = 0

pomodoro_seconds = POMODORO_MINUTES * 60
break_seconds = BREAK_MINUTES * 60
hydrate_seconds = HYDRATE_EVERY_MINUTES * 60  # (new)

mode = "focus"               # "focus" or "break"
sit_timer_start = None       # focus start time
break_timer_start = None     # break start time
last_seen_time = None

# Hydration timers (new)
hydrate_timer_start = time.time()
last_hydrate_alert_time = 0

centroid_history = deque()   # (t, (x,y))
last_centroid_for_standup = None

def add_centroid(xy, now):
    centroid_history.append((now, xy))
    horizon = now - MOVEMENT_WINDOW_SEC
    while centroid_history and centroid_history[0][0] < horizon:
        centroid_history.popleft()

def avg_speed_px_per_sec():
    if len(centroid_history) < 2:
        return 0.0
    dist = 0.0
    duration = centroid_history[-1][0] - centroid_history[0][0]
    if duration <= 0:
        return 0.0
    for i in range(1, len(centroid_history)):
        p0 = centroid_history[i-1][1]
        p1 = centroid_history[i][1]
        dist += math.hypot(p1[0]-p0[0], p1[1]-p0[1])
    return dist / duration

def is_still():
    return avg_speed_px_per_sec() < STILL_SPEED_THRESH

# Main Loop
while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        continue

    frame = cv2.flip(frame, 1)
    H, W = frame.shape[:2]
    now = time.time()

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(rgb_frame)
    pose_ok = results.pose_landmarks is not None

    # Extract landmarks (even in break mode, to keep detecting)
    if pose_ok:
        landmarks = results.pose_landmarks.landmark
        l_sh = (int(landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x * W),
                int(landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y * H))
        r_sh = (int(landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x * W),
                int(landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y * H))
        l_ear = (int(landmarks[mp_pose.PoseLandmark.LEFT_EAR.value].x * W),
                 int(landmarks[mp_pose.PoseLandmark.LEFT_EAR.value].y * H))

        centroid = ((l_sh[0] + r_sh[0]) // 2, (l_sh[1] + r_sh[1]) // 2)
        add_centroid(centroid, now)

        shoulder_angle = calculate_angle(l_sh, r_sh, (r_sh[0], 0))
        neck_angle = calculate_angle(l_ear, l_sh, (l_sh[0], 0))

        # Calibration
        if not is_calibrated and calibration_frames < 30:
            calibration_shoulder_angles.append(shoulder_angle)
            calibration_neck_angles.append(neck_angle)
            calibration_frames += 1
            if mode == "focus":  # show text only in focus to reduce clutter
                cv2.putText(frame, f"Calibrating... {calibration_frames}/30", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2, cv2.LINE_AA)
        elif not is_calibrated:
            shoulder_threshold = float(np.mean(calibration_shoulder_angles) - 10.0)
            neck_threshold = float(np.mean(calibration_neck_angles) - 10.0)
            is_calibrated = True
            print(f"Calibration complete. Shoulder threshold: {shoulder_threshold:.1f}, Neck threshold: {neck_threshold:.1f}")

        if mode == "focus":
            mp_drawing.draw_landmarks(frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
            mid = ((l_sh[0] + r_sh[0]) // 2, (l_sh[1] + r_sh[1]) // 2)
            draw_angle(frame, l_sh, mid, (mid[0], 0), shoulder_angle, (255, 0, 0))
            draw_angle(frame, l_ear, l_sh, (l_sh[0], 0), neck_angle, (0, 255, 0))

            # Posture feedback (focus mode only)
            if is_calibrated:
                if shoulder_angle < shoulder_threshold or neck_angle < neck_threshold:
                    status = "Poor Posture"
                    color = (0, 0, 255)
                    if now - last_posture_alert_time > POSTURE_ALERT_COOLDOWN:
                        print("Poor posture detected! Please sit up straight.")
                        play_beep()
                        last_posture_alert_time = now
                else:
                    status = "Good Posture"
                    color = (0, 255, 0)
                cv2.putText(frame, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2, cv2.LINE_AA)
                cv2.putText(frame, f"Shoulder: {shoulder_angle:.1f}/{shoulder_threshold:.1f}", (10, 60),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 1, cv2.LINE_AA)
                cv2.putText(frame, f"Neck: {neck_angle:.1f}/{neck_threshold:.1f}", (10, 90),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 1, cv2.LINE_AA)

        last_seen_time = now

        if mode == "focus":
            # Consider "sitting/focusing" when relatively still
            if is_still():
                if sit_timer_start is None:
                    sit_timer_start = now
                    last_centroid_for_standup = centroid
                elapsed = now - sit_timer_start
                remaining = pomodoro_seconds - elapsed

                # Focus timer (top-right)
                cv2.putText(frame, f"Focus: {format_mmss(remaining)}", (W - 220, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (139,0,139), 2, cv2.LINE_AA)

                # Hydration reminder (placed below "Focus")
                hydrate_elapsed = now - hydrate_timer_start
                hydrate_remaining = hydrate_seconds - hydrate_elapsed
                if hydrate_remaining > 0:
                    cv2.putText(frame, f"Hydrate: {format_mmss(hydrate_remaining)}",
                                (W - 220, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, BABY_BLUE_BGR, 2, cv2.LINE_AA)
                else:
                    # Alert to drink water
                    cv2.putText(frame, "Hydrate now! (press [h] after drinking)",
                                (W - 420, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, BABY_BLUE_BGR, 2, cv2.LINE_AA)
                    if now - last_hydrate_alert_time > HYDRATE_ALERT_COOLDOWN:
                        print("Hydration reminder: Please drink some water.")
                        play_beep()
                        last_hydrate_alert_time = now

                # Reached focus target → start break
                if elapsed >= pomodoro_seconds:
                    mode = "break"
                    break_timer_start = now
                    sit_timer_start = None
                    last_centroid_for_standup = None
                    print(f"Pomodoro up! {POMODORO_MINUTES} min reached. Break starts ({BREAK_MINUTES} min).")
                    play_beep()
            else:
                # Movement in focus → reset if continuous focus required
                if REQUIRE_CONTINUOUS_SIT and sit_timer_start is not None:
                    if last_centroid_for_standup is not None:
                        disp = math.hypot(centroid[0]-last_centroid_for_standup[0],
                                          centroid[1]-last_centroid_for_standup[1])
                        if disp > STANDUP_MOVE_THRESH:
                            sit_timer_start = None
                            last_centroid_for_standup = None
                    else:
                        sit_timer_start = None

        elif mode == "break":
            # Live break countdown
            if break_timer_start is None:
                break_timer_start = now
            break_elapsed = now - break_timer_start
            break_remaining = break_seconds - break_elapsed

            if DIM_BACKGROUND_ON_BREAK:
                draw_dim_overlay(frame, alpha=0.35)

            # Centered break UI
            draw_centered_text(frame, f"BREAK: {format_mmss(break_remaining)}",
                               int(H*0.45), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (0, 0, 255), 3)
            draw_centered_text(frame, "Stand, stretch, move around!",
                               int(H*0.55), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
            if is_still():
                draw_centered_text(frame, "Tip: try walking or stretching",
                                   int(H*0.63), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

            # When break finishes, auto-ready to resume focus
            if break_remaining <= 0:
                draw_centered_text(frame, "Break over! Press [n] or sit to resume.",
                                   int(H*0.72), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 200, 0), 2)
                if pose_ok and is_still():
                    mode = "focus"
                    sit_timer_start = now
                    break_timer_start = None
                    centroid_history.clear()
                    last_centroid_for_standup = None
                    print("Resuming focus.")
                    play_beep()

    else:
        # No pose detected
        if last_seen_time is not None and (now - last_seen_time) > ABSENCE_RESET_SEC and mode == "focus":
            sit_timer_start = None
            last_centroid_for_standup = None
        cv2.putText(frame, "No person detected", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (200, 200, 200), 2, cv2.LINE_AA)

        # Keep break countdown even if you step away
        if mode == "break":
            if break_timer_start is None:
                break_timer_start = now
            break_elapsed = now - break_timer_start
            break_remaining = break_seconds - break_elapsed
            if DIM_BACKGROUND_ON_BREAK:
                draw_dim_overlay(frame, alpha=0.35)
            draw_centered_text(frame, f"BREAK: {format_mmss(break_remaining)}",
                               int(H*0.45), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (0, 0, 255), 3)

    # Footer / hotkeys
    footer = ("Mode: {mode} | Focus: {fm}m  Break: {bm}m  Hydrate: {hm}m   "
              "[r]=reset focus   [h]=mark water   [n]=end break now   [q]=quit").format(
        mode=mode.upper(), fm=POMODORO_MINUTES, bm=BREAK_MINUTES, hm=HYDRATE_EVERY_MINUTES
    )
    cv2.putText(frame, footer, (10, H-10), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (180,255,180), 1, cv2.LINE_AA)

    # Render
    cv2.imshow('Posture + Pomodoro', frame)
    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):
        break
    elif key == ord('r'):
        # Reset focus timer (only meaningful in focus mode)
        sit_timer_start = None
        centroid_history.clear()
        last_centroid_for_standup = None
        print("Focus timer reset.")
    elif key == ord('n'):
        # End break immediately and resume focus
        if mode == "break":
            mode = "focus"
            sit_timer_start = time.time()
            break_timer_start = None
            centroid_history.clear()
            last_centroid_for_standup = None
            print("Break ended manually. Resuming focus.")
            play_beep()
    elif key == ord('h'):
        # Mark that you drank water (reset hydration timer)
        hydrate_timer_start = time.time()
        print("Hydration timer reset. Stay hydrated!")

cap.release()
cv2.destroyAllWindows()
