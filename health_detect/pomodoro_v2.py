import cv2
import mediapipe as mp
import numpy as np
import time
# from playsound import playsound
import os
import math
from collections import deque

# Optional: torch (YOLOv5). If torch isn't available, script still runs without drinking detection.
try:
    import torch
    TORCH_OK = True
except Exception:
    TORCH_OK = False

# Config
POMODORO_MINUTES = 1      # Focus duration before break
BREAK_MINUTES = 5           # Break duration
MOVEMENT_WINDOW_SEC = 3.0   # Window to estimate motion (seconds)
STILL_SPEED_THRESH = 15.0   # px/sec; below this = "still"
STANDUP_MOVE_THRESH = 100.0 # px displacement that counts as "stood/moved"
ABSENCE_RESET_SEC = 3.0     # If away > this, reset focus timer
POSTURE_ALERT_COOLDOWN = 5  # seconds for posture alert sound
SOUND_FILE = "alert.mp3"    # sound file to play if exists
REQUIRE_CONTINUOUS_SIT = True  # focus timer resets on large movement/absence

# --- Hydration reminder (yours, kept) ---
HYDRATE_EVERY_MINUTES = 0.75          # remind to drink every N minutes
HYDRATE_ALERT_COOLDOWN = 30           # seconds between hydration alert beeps
BABY_BLUE_BGR = (240, 207, 137)       # Baby blue (#89CFF0) in BGR

# Visual preferences
SHOW_POSE_IN_BREAK = False            # Hide skeleton/angles in break mode (still detect)
DIM_BACKGROUND_ON_BREAK = True        # Dim screen behind the break banner

# YOLOv5 drinking detection config
YOLO_ENABLED = TORCH_OK                    # auto-disabled if torch missing
YOLO_MODEL_NAME = 'yolov5m'               # stronger than 's' (better recall)
YOLO_CONF = 0.20                          # more sensitive
YOLO_IOU = 0.45
YOLO_IMG_SIZE = 896                       # better for small bottles (must be multiple of 32)
YOLO_CLASSES = ['bottle', 'cup']          # classes considered as drink containers
YOLO_INTERVAL_SEC = 3.0                   # run YOLO roughly every 3 seconds
YOLO_IN_FOCUS_ONLY = False                # set True to skip YOLO during break
DRAW_YOLO_BOX = True                      # show the detected container box

# Proximity heuristic: bottle/cup near the mouth
DRINK_DIST_SCALE = 0.60                   # threshold = scale * face_width_px
DRINK_MIN_FRAMES = 7                      # need this many consecutive frames near mouth
DRINK_COOLDOWN_SEC = 15                   # min seconds between drink events
HYDRATION_BANNER_SEC = 2.5                # banner duration after detection

SHOW_HEAD_ROI = False                     # debug: draw ROI rect used for second YOLO pass

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

# def play_beep():
#     if os.path.exists(SOUND_FILE):
#         try:
#             playsound(SOUND_FILE)
#         except Exception:
#             pass

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

def clamp(v, lo, hi):
    return max(lo, min(hi, v))

def head_roi_from_pose(l_ear, r_ear, l_sh, r_sh, W, H, pad_scale=1.6, up_pad=1.1):
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

    x1 = int(clamp(ear_cx - w / 2, 0, W - 1))
    x2 = int(clamp(ear_cx + w / 2, 0, W - 1))
    y1 = int(clamp(ear_cy - h_up, 0, H - 1))
    y2 = int(clamp(ear_cy + h_down, 0, H - 1))
    return x1, y1, x2, y2

def point_to_rect_distance(px, py, x1, y1, x2, y2):
    """Shortest Euclidean distance from point to rectangle (x1,y1,x2,y2)."""
    cx = clamp(px, x1, x2)
    cy = clamp(py, y1, y2)
    return math.hypot(px - cx, py - cy)

# MediaPipe
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
pose = mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5, min_tracking_confidence=0.5)
cap = cv2.VideoCapture(0)

# YOLOv5 load
def load_yolov5():
    if not YOLO_ENABLED:
        return None
    try:
        # Torch hub online
        model = torch.hub.load('ultralytics/yolov5', YOLO_MODEL_NAME, pretrained=True)
    except Exception:
        # Local fallback: clone repo to ./yolov5 and place yolov5m.pt in working directory
        model = torch.hub.load('yolov5', 'custom', path=f'{YOLO_MODEL_NAME}.pt', source='local')
    model.conf = YOLO_CONF
    model.iou  = YOLO_IOU
    if torch.cuda.is_available():
        model.to('cuda')
    return model

def run_yolo_on_image(model, img_bgr, size):
    """Return [(x1,y1,x2,y2,name,conf), ...]"""
    if model is None:
        return []
    with torch.no_grad():
        res = model(img_bgr, size=size)
    boxes = []
    try:
        df = res.pandas().xyxy[0]
        df = df[df['name'].isin(YOLO_CLASSES) & (df['confidence'] >= YOLO_CONF)]
        for _, row in df.iterrows():
            boxes.append((int(row['xmin']), int(row['ymin']), int(row['xmax']), int(row['ymax']),
                          row['name'], float(row['confidence'])))
    except Exception:
        arr = res.xyxy[0].cpu().numpy()  # [x1,y1,x2,y2,conf,cls]
        names = model.names
        for x1, y1, x2, y2, conf, cls_id in arr:
            name = names[int(cls_id)]
            if name in YOLO_CLASSES and conf >= YOLO_CONF:
                boxes.append((int(x1), int(y1), int(x2), int(y2), name, float(conf)))
    return boxes

yolo_model = load_yolov5()

# State & Vars (yours, kept) + YOLO state (NEW)
is_calibrated = False
calibration_frames = 0
calibration_shoulder_angles, calibration_neck_angles = [], []
shoulder_threshold = None
neck_threshold = None
last_posture_alert_time = 0

pomodoro_seconds = POMODORO_MINUTES * 60
break_seconds = BREAK_MINUTES * 60
hydrate_seconds = HYDRATE_EVERY_MINUTES * 60

mode = "focus"               # "focus" or "break"
sit_timer_start = None       # focus start time
break_timer_start = None     # break start time
last_seen_time = None

# Hydration reminder timers (manual loop, as in your script)
hydrate_timer_start = time.time()
last_hydrate_alert_time = 0

centroid_history = deque()   # (t, (x,y))
last_centroid_for_standup = None

# YOLO drinking detection state
last_yolo_time = 0.0
last_yolo_det = []           # cached boxes between runs
drink_consec = 0
last_drink_time = 0
drink_banner_until = 0
hydration_count = 0          # number of detected drinks

# Motion helpers
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

    # ---- MediaPipe pose ----
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(rgb_frame)
    pose_ok = results.pose_landmarks is not None

    # ---- YOLO every ~3 sec (full frame + head ROI) ----
    bottle_boxes = last_yolo_det
    do_yolo = YOLO_ENABLED and ((now - last_yolo_time) >= YOLO_INTERVAL_SEC) and (mode == "focus" or not YOLO_IN_FOCUS_ONLY)
    if do_yolo:
        full_boxes = run_yolo_on_image(yolo_model, frame, YOLO_IMG_SIZE)
        roi_boxes_global = []

        # Prepare pose landmarks we’ll also need later
        l_sh = r_sh = l_ear = r_ear = None
        l_mouth = r_mouth = None

        if pose_ok:
            lm = results.pose_landmarks.landmark
            l_sh = (int(lm[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x * W),
                    int(lm[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y * H))
            r_sh = (int(lm[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x * W),
                    int(lm[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y * H))
            l_ear = (int(lm[mp_pose.PoseLandmark.LEFT_EAR.value].x * W),
                     int(lm[mp_pose.PoseLandmark.LEFT_EAR.value].y * H))
            r_ear = (int(lm[mp_pose.PoseLandmark.RIGHT_EAR.value].x * W),
                     int(lm[mp_pose.PoseLandmark.RIGHT_EAR.value].y * H))

            rx1, ry1, rx2, ry2 = head_roi_from_pose(l_ear, r_ear, l_sh, r_sh, W, H)
            if SHOW_HEAD_ROI:
                cv2.rectangle(frame, (rx1, ry1), (rx2, ry2), (128, 255, 128), 1)

            roi = frame[ry1:ry2, rx1:rx2]
            if roi.size > 0:
                roi_boxes = run_yolo_on_image(yolo_model, roi, YOLO_IMG_SIZE)
                for x1, y1, x2, y2, name, conf in roi_boxes:
                    roi_boxes_global.append((x1 + rx1, y1 + ry1, x2 + rx1, y2 + ry1, name, conf))

        bottle_boxes = full_boxes + roi_boxes_global
        last_yolo_det = bottle_boxes
        last_yolo_time = now

    # Pose-driven logic (angles, timers, UI)
    mouth_center = None
    face_width_px = None

    if pose_ok:
        landmarks = results.pose_landmarks.landmark
        l_sh = (int(landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x * W),
                int(landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y * H))
        r_sh = (int(landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x * W),
                int(landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y * H))
        l_ear = (int(landmarks[mp_pose.PoseLandmark.LEFT_EAR.value].x * W),
                 int(landmarks[mp_pose.PoseLandmark.LEFT_EAR.value].y * H))

        r_ear = (int(landmarks[mp_pose.PoseLandmark.RIGHT_EAR.value].x * W),
                 int(landmarks[mp_pose.PoseLandmark.RIGHT_EAR.value].y * H))
        l_mouth = (int(landmarks[mp_pose.PoseLandmark.MOUTH_LEFT.value].x * W),
                   int(landmarks[mp_pose.PoseLandmark.MOUTH_LEFT.value].y * H))
        r_mouth = (int(landmarks[mp_pose.PoseLandmark.MOUTH_RIGHT.value].x * W),
                   int(landmarks[mp_pose.PoseLandmark.MOUTH_RIGHT.value].y * H))
        mouth_center = ((l_mouth[0] + r_mouth[0]) // 2, (l_mouth[1] + r_mouth[1]) // 2)
        face_width_px = max(1.0, math.hypot(r_ear[0] - l_ear[0], r_ear[1] - l_ear[1]))

        centroid = ((l_sh[0] + r_sh[0]) // 2, (l_sh[1] + r_sh[1]) // 2)
        add_centroid(centroid, now)

        shoulder_angle = calculate_angle(l_sh, r_sh, (r_sh[0], 0))
        neck_angle = calculate_angle(l_ear, l_sh, (l_sh[0], 0))

        # --- Calibration (kept) ---
        if not is_calibrated and calibration_frames < 30:
            calibration_shoulder_angles.append(shoulder_angle)
            calibration_neck_angles.append(neck_angle)
            calibration_frames += 1
            if mode == "focus":
                cv2.putText(frame, f"Calibrating... {calibration_frames}/30", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2, cv2.LINE_AA)
        elif not is_calibrated:
            shoulder_threshold = float(np.mean(calibration_shoulder_angles) - 10.0)
            neck_threshold = float(np.mean(calibration_neck_angles) - 10.0)
            is_calibrated = True
            print(f"Calibration complete. Shoulder threshold: {shoulder_threshold:.1f}, Neck threshold: {neck_threshold:.1f}")

        # --- Draw pose only in FOCUS mode (kept) ---
        if mode == "focus":
            mp_drawing.draw_landmarks(frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
            mid = ((l_sh[0] + r_sh[0]) // 2, (l_sh[1] + r_sh[1]) // 2)
            draw_angle(frame, l_sh, mid, (mid[0], 0), shoulder_angle, (255, 0, 0))
            draw_angle(frame, l_ear, l_sh, (l_sh[0], 0), neck_angle, (0, 255, 0))

            # Posture feedback
            if is_calibrated:
                if shoulder_angle < shoulder_threshold or neck_angle < neck_threshold:
                    status = "Poor Posture"
                    color = (0, 0, 255)
                    if now - last_posture_alert_time > POSTURE_ALERT_COOLDOWN:
                        print("Poor posture detected! Please sit up straight.")
                        # play_beep()
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

        # Focus / Break state machine
        if mode == "focus":
            if is_still():
                if sit_timer_start is None:
                    sit_timer_start = now
                    last_centroid_for_standup = centroid
                elapsed = now - sit_timer_start
                remaining = pomodoro_seconds - elapsed

                # Focus timer (top-right)
                cv2.putText(frame, f"Focus: {format_mmss(remaining)}", (W - 220, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (139, 0, 139), 2, cv2.LINE_AA)

                # Hydration reminder
                hydrate_elapsed = now - hydrate_timer_start
                hydrate_remaining = hydrate_seconds - hydrate_elapsed
                if hydrate_remaining > 0:
                    cv2.putText(frame, f"Hydrate: {format_mmss(hydrate_remaining)}",
                                (W - 220, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, BABY_BLUE_BGR, 2, cv2.LINE_AA)
                else:
                    cv2.putText(frame, "Hydrate now! (press [h] after drinking)",
                                (W - 420, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, BABY_BLUE_BGR, 2, cv2.LINE_AA)
                    if now - last_hydrate_alert_time > HYDRATE_ALERT_COOLDOWN:
                        print("Hydration reminder: Please drink some water.")
                        # play_beep()
                        last_hydrate_alert_time = now

                # Reached focus target → start break
                if elapsed >= pomodoro_seconds:
                    mode = "break"
                    break_timer_start = now
                    sit_timer_start = None
                    last_centroid_for_standup = None
                    print(f"Pomodoro up! {POMODORO_MINUTES} min reached. Break starts ({BREAK_MINUTES} min).")
                    # play_beep()
            else:
                if REQUIRE_CONTINUOUS_SIT and sit_timer_start is not None:
                    if last_centroid_for_standup is not None:
                        disp = math.hypot(centroid[0] - last_centroid_for_standup[0],
                                          centroid[1] - last_centroid_for_standup[1])
                        if disp > STANDUP_MOVE_THRESH:
                            sit_timer_start = None
                            last_centroid_for_standup = None
                    else:
                        sit_timer_start = None

        elif mode == "break":
            if break_timer_start is None:
                break_timer_start = now
            break_elapsed = now - break_timer_start
            break_remaining = break_seconds - break_elapsed

            if DIM_BACKGROUND_ON_BREAK:
                draw_dim_overlay(frame, alpha=0.35)

            draw_centered_text(frame, f"BREAK: {format_mmss(break_remaining)}",
                               int(H * 0.45), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (0, 0, 255), 3)
            draw_centered_text(frame, "Stand, stretch, move around!",
                               int(H * 0.55), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
            if is_still():
                draw_centered_text(frame, "Tip: try walking or stretching",
                                   int(H * 0.63), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

            if break_remaining <= 0:
                draw_centered_text(frame, "Break over! Press [n] or sit to resume.",
                                   int(H * 0.72), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 200, 0), 2)
                if pose_ok and is_still():
                    mode = "focus"
                    sit_timer_start = now
                    break_timer_start = None
                    centroid_history.clear()
                    last_centroid_for_standup = None
                    print("Resuming focus.")
                    # play_beep()

    else:
        # No pose detected
        if last_seen_time is not None and (now - last_seen_time) > ABSENCE_RESET_SEC and mode == "focus":
            sit_timer_start = None
            last_centroid_for_standup = None
        cv2.putText(frame, "No person detected", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (200, 200, 200), 2, cv2.LINE_AA)

        if mode == "break":
            if break_timer_start is None:
                break_timer_start = now
            break_elapsed = now - break_timer_start
            break_remaining = break_seconds - break_elapsed
            if DIM_BACKGROUND_ON_BREAK:
                draw_dim_overlay(frame, alpha=0.35)
            draw_centered_text(frame, f"BREAK: {format_mmss(break_remaining)}",
                               int(H * 0.45), cv2.FONT_HERSHEY_SIMPLEX, 1.4, (0, 0, 255), 3)

    # Drinking detection (YOLO + mouth proximity)
    chosen_box = None
    if pose_ok and mouth_center is not None and face_width_px is not None and len(bottle_boxes) > 0:
        prox_thresh = max(30.0, DRINK_DIST_SCALE * face_width_px)
        best_d = 1e9
        for (x1, y1, x2, y2, name, conf) in bottle_boxes:
            # distance from mouth center to nearest point on box
            d = point_to_rect_distance(mouth_center[0], mouth_center[1], x1, y1, x2, y2)
            near_vert = (y1 <= mouth_center[1] + 0.35 * face_width_px)
            if d < best_d and d <= prox_thresh and near_vert:
                best_d = d
                chosen_box = (x1, y1, x2, y2, name, conf)

        if chosen_box is not None:
            drink_consec += 1
        else:
            drink_consec = max(0, drink_consec - 2)
    else:
        drink_consec = max(0, drink_consec - 2)

    # Trigger drinking event
    if chosen_box is not None and (drink_consec >= DRINK_MIN_FRAMES) and ((now - last_drink_time) >= DRINK_COOLDOWN_SEC):
        last_drink_time = now
        drink_banner_until = now + HYDRATION_BANNER_SEC
        hydration_count += 1
        hydrate_timer_start = now            # auto-reset your hydration reminder
        last_hydrate_alert_time = now        # avoid immediate reminder
        print("Hydration: drink detected!")
        # play_beep()

    # Draw YOLO box if desired
    if chosen_box is not None and DRAW_YOLO_BOX:
        x1, y1, x2, y2, name, conf = chosen_box
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 255), 2)
        cv2.putText(frame, f"{name}:{conf:.2f}", (x1, y1 - 6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

    # Hydration banner
    if now < drink_banner_until:
        draw_centered_text(frame, "Hydration: Drink Detected",
                           int(H * 0.20), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 200, 0), 3)

    # Footer / hotkeys
    footer = ("Mode: {mode} | Focus: {fm}m  Break: {bm}m  Hydrate: {hm}m  "
              "Drinks: {dc}   [r]=reset focus   [h]=mark water   [n]=end break now   [q]=quit").format(
        mode=mode.upper(), fm=POMODORO_MINUTES, bm=BREAK_MINUTES, hm=HYDRATE_EVERY_MINUTES, dc=hydration_count
    )
    cv2.putText(frame, footer, (10, H - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (180, 255, 180), 1, cv2.LINE_AA)

    # Render & keys
    cv2.imshow('Posture + Pomodoro + Hydration (YOLO)', frame)
    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):
        break
    elif key == ord('r'):
        sit_timer_start = None
        centroid_history.clear()
        last_centroid_for_standup = None
        print("Focus timer reset.")
    elif key == ord('n'):
        if mode == "break":
            mode = "focus"
            sit_timer_start = time.time()
            break_timer_start = None
            centroid_history.clear()
            last_centroid_for_standup = None
            print("Break ended manually. Resuming focus.")
            # play_beep()
    elif key == ord('h'):
        # Manual hydration mark
        hydrate_timer_start = time.time()
        print("Hydration timer reset. Stay hydrated!")

cap.release()
cv2.destroyAllWindows()
