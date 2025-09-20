import cv2
import mediapipe as mp
import numpy as np
import time
from playsound import playsound
import os
import math
from collections import deque
try:
    import torch
    TORCH_OK = True
except Exception:
    TORCH_OK = False

import warnings
warnings.filterwarnings("ignore", category=FutureWarning)


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
            "DIM_BACKGROUND_ON_BREAK": True,  # Dim screen behind the break banner

            "YOLO_ENABLED": TORCH_OK,                  # auto-disabled if torch missing
            "YOLO_MODEL_NAME": 'yolov5m',               # stronger than 's' (better recall)
            "YOLO_CONF": 0.20,                          # more sensitive
            "YOLO_IOU": 0.45,
            "YOLO_IMG_SIZE": 896,                       # better for small bottles (must be multiple of 32)
            "YOLO_CLASSES": ['bottle', 'cup'],          # classes considered as drink containers
            "YOLO_INTERVAL_SEC": 1.0,                   # run YOLO roughly every 3 seconds
            "YOLO_IN_FOCUS_ONLY": False,                # set True to skip YOLO during break
            "DRAW_YOLO_BOX": True,                       # show the detected container box

            # Proximity heuristic: bottle/cup near the mouth
            "DRINK_DIST_SCALE": 0.60,                   # threshold = scale * face_width_px
            "DRINK_MIN_FRAMES": 3,                      # need this many consecutive frames near mouth
            "DRINK_COOLDOWN_SEC": 3,                   # min seconds between drink events
            "HYDRATION_BANNER_SEC": 2.5                  # banner duration after detection
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

        self.yolo_model = self.load_yolov5()
        # YOLO drinking detection state
        self.last_yolo_time = 0.0
        self.last_yolo_det = []           # cached boxes between runs
        self.drink_consec = 0
        self.drink_banner_until = 0
        self.hydration_count = 0          # number of detected drinks

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
    

    def clamp(self, v, lo, hi):
        return max(lo, min(hi, v))

    def head_roi_from_pose(self, l_ear, r_ear, l_sh, r_sh, W, H, pad_scale=1.6, up_pad=1.1):
        """
        Rectangle covering head/neck/upper chest to help detect small/tilted bottles.
        """
        if None in (l_ear, r_ear, l_sh, r_sh):
            return (0, 0, W, H)

        ear_cx = (l_ear[0] + r_ear[0]) / 2.0
        ear_cy = (l_ear[1] + r_ear[1]) / 2.0
        ear_dist = max(20.0, math.hypot(r_ear[0] - l_ear[0], r_ear[1] - l_ear[1]))

        w = ear_dist * pad_scale * 1.6
        h_up = ear_dist * up_pad
        sh_y = min(l_sh[1], r_sh[1])
        h_down = max(ear_dist * 2.0, (sh_y - ear_cy) * 1.2)

        x1 = int(self.clamp(ear_cx - w / 2, 0, W - 1))
        x2 = int(self.clamp(ear_cx + w / 2, 0, W - 1))
        y1 = int(self.clamp(ear_cy - h_up, 0, H - 1))
        y2 = int(self.clamp(ear_cy + h_down, 0, H - 1))
        return x1, y1, x2, y2
    
    def point_to_rect_distance(self, px, py, x1, y1, x2, y2):
        """Shortest Euclidean distance from point to rectangle (x1,y1,x2,y2)."""
        cx = self.clamp(px, x1, x2)
        cy = self.clamp(py, y1, y2)
        return math.hypot(px - cx, py - cy)

    def load_yolov5(self):
        if not self.config["YOLO_ENABLED"]:
            # print("YOLO is not enabled !!!!!!!!!!!!!!!!!.")
            return None
        # else:
            # print("YOLO is enabled ++++++++++++++++++++.")
        try:
            # Torch hub online
            model = torch.hub.load('ultralytics/yolov5', self.config["YOLO_MODEL_NAME"], pretrained=True)
            # print("YOLO model loaded successfully.")
        except Exception:
            # Local fallback: clone repo to ./yolov5 and place yolov5m.pt in working directory
            model = torch.hub.load('yolov5', 'custom', path=f'{self.config["YOLO_MODEL_NAME"]}.pt', source='local')
        model.conf = self.config["YOLO_CONF"]
        model.iou  = self.config["YOLO_IOU"]
        if torch.cuda.is_available():
            model.to('cuda')
        return model
    
    def run_yolo_on_image(self, model, img_bgr, size):
        """Return [(x1,y1,x2,y2,name,conf), ...]"""
        if model is None:
            return []
        with torch.no_grad():
            res = model(img_bgr, size=size)
        boxes = []
        try:
            df = res.pandas().xyxy[0]
            df = df[df['name'].isin(self.config["YOLO_CLASSES"]) & (df['confidence'] >= self.config["YOLO_CONF"])]
            for _, row in df.iterrows():
                boxes.append((int(row['xmin']), int(row['ymin']), int(row['xmax']), int(row['ymax']),
                            row['name'], float(row['confidence'])))
        except Exception:
            arr = res.xyxy[0].cpu().numpy()  # [x1,y1,x2,y2,conf,cls]
            names = model.names
            for x1, y1, x2, y2, conf, cls_id in arr:
                name = names[int(cls_id)]
                if name in self.config["YOLO_CLASSES"] and conf >= self.config["YOLO_CONF"]:
                    boxes.append((int(x1), int(y1), int(x2), int(y2), name, float(conf)))
        
        # print(f"Detected {len(boxes)} objects with YOLO")

        return boxes

    def get_posture_status(self):
        return self.posture_status
    
    def drinking_water_test(self):
        # Ensure YOLO is run frequently
        self.full_boxes = self.run_yolo_on_image(self.yolo_model, self.frame, self.config["YOLO_IMG_SIZE"])
        self.roi_boxes_global = []

        if self.pose_ok:
            lm = self.results.pose_landmarks.landmark
            l_sh = (int(lm[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value].x * self.W),
                    int(lm[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value].y * self.H))
            r_sh = (int(lm[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x * self.W),
                    int(lm[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y * self.H))
            l_ear = (int(lm[self.mp_pose.PoseLandmark.LEFT_EAR.value].x * self.W),
                    int(lm[self.mp_pose.PoseLandmark.LEFT_EAR.value].y * self.H))
            r_ear = (int(lm[self.mp_pose.PoseLandmark.RIGHT_EAR.value].x * self.W),
                    int(lm[self.mp_pose.PoseLandmark.RIGHT_EAR.value].y * self.H))

            # Detect head region for better water detection
            rx1, ry1, rx2, ry2 = self.head_roi_from_pose(l_ear, r_ear, l_sh, r_sh, self.W, self.H)
            self.roi = self.frame[ry1:ry2, rx1:rx2]

            if self.roi.size > 0:
                self.roi_boxes = self.run_yolo_on_image(self.yolo_model, self.roi, self.config["YOLO_IMG_SIZE"])
                for x1, y1, x2, y2, name, conf in self.roi_boxes:
                    self.roi_boxes_global.append((x1 + rx1, y1 + ry1, x2 + rx1, y2 + ry1, name, conf))

        self.bottle_boxes = self.full_boxes + self.roi_boxes_global

        self.chosen_box = None
        if self.results.pose_landmarks is not None:
            landmarks = self.results.pose_landmarks.landmark
            # Mouth detection
            l_mouth = (int(landmarks[self.mp_pose.PoseLandmark.MOUTH_LEFT.value].x * self.W),
                    int(landmarks[self.mp_pose.PoseLandmark.MOUTH_LEFT.value].y * self.H))
            r_mouth = (int(landmarks[self.mp_pose.PoseLandmark.MOUTH_RIGHT.value].x * self.W),
                    int(landmarks[self.mp_pose.PoseLandmark.MOUTH_RIGHT.value].y * self.H))
            mouth_center = ((l_mouth[0] + r_mouth[0]) // 2, (l_mouth[1] + r_mouth[1]) // 2)

            face_width_px = max(1.0, math.hypot(r_mouth[0] - l_mouth[0], r_mouth[1] - l_mouth[1]))

            prox_thresh = max(30.0, self.config["DRINK_DIST_SCALE"] * face_width_px)
            best_d = 1e9
            for (x1, y1, x2, y2, name, conf) in self.bottle_boxes:
                d = self.point_to_rect_distance(mouth_center[0], mouth_center[1], x1, y1, x2, y2)
                near_vert = (y1 <= mouth_center[1] + 0.35 * face_width_px)
                if d < best_d and d <= prox_thresh and near_vert:
                    best_d = d
                    self.chosen_box = (x1, y1, x2, y2, name, conf)

            if self.chosen_box is not None:
                self.drink_consec += 1
            else:
                self.drink_consec = max(0, self.drink_consec - 2)

        if self.chosen_box is not None and (self.drink_consec >= self.config["DRINK_MIN_FRAMES"]) and ((time.time() - time.mktime(self.last_drink_time)) >= self.config["DRINK_COOLDOWN_SEC"]):
            # print("Hydration: drink detected!")
            self.last_drink_time = time.localtime(time.time())
            self.drink_banner_until = time.time() + self.config["HYDRATION_BANNER_SEC"]
            print("Hydration: drink detected!")

        
    
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

            self.frame = cv2.flip(frame, 1)
            self.H, self.W = self.frame.shape[:2]
            now = time.time()

            rgb_frame = cv2.cvtColor(self.frame, cv2.COLOR_BGR2RGB)
            self.results = self.pose.process(rgb_frame)
            self.pose_ok = self.results.pose_landmarks is not None

            # Extract landmarks (even in break mode, to keep detecting)
            if self.pose_ok:
                landmarks = self.results.pose_landmarks.landmark
                l_sh = (int(landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value].x * self.W),
                        int(landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value].y * self.H))
                r_sh = (int(landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x * self.W),
                        int(landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y * self.H))
                l_ear = (int(landmarks[self.mp_pose.PoseLandmark.LEFT_EAR.value].x * self.W),
                        int(landmarks[self.mp_pose.PoseLandmark.LEFT_EAR.value].y * self.H))

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
                    self.drinking_water_test()

        print("Exiting run loop ~~~~~~~~~~~~~~~~~~~.")
 