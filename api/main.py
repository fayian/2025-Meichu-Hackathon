import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from posture.model import PosturePomodoroModel
from scheduler.scheduler import schedule_all_tasks, get_calendar_service, get_calendar_events_as_tasks
import threading
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import datetime as dt
import sys
import io

app = FastAPI()
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
model = PosturePomodoroModel()

run_thread = threading.Thread(target=model.run)


def query_posture_status():
    status = model.get_posture_status()
    print(f"Current Posture Status: {status}")

def query_last_drink_time():
    last_drink_time = model.last_drink_time
    print(f"Last Drink Time: {last_drink_time}")

def start_posture_test():
    global run_thread
    model.start_posture_detection()
    print("Starting posture test...")
    if not run_thread.is_alive():
        model.is_calibrated = False
        run_thread = threading.Thread(target=model.run)
        run_thread.start()

def start_drinking_test():
    global run_thread
    model.start_drinking_detection()
    print("Starting drinking water test...")
    if not run_thread.is_alive():
        model.is_calibrated = False
        run_thread = threading.Thread(target=model.run)
        run_thread.start()

def stop_posture_test():
    model.stop_posture_detection()
    print("Stopping posture test...")

def stop_drinking_test():
    model.stop_drinking_detection()
    print("Stopping drinking water test...")

# def temp_input():
#     while True:
#         command = input("Enter command: (A)start_posture_test (B)stop_posture_test (C)start_drinking_test, (D)stop_drinking_test, (E)posture_status, (F)last_drink_time: ")
#         if command == "A":
#             start_posture_test()
#         elif command == "B":
#             stop_posture_test()
#         elif command == "C":
#             start_drinking_test()
#         elif command == "D":
#             stop_drinking_test()
#         elif command == "E":
#             query_posture_status()
#         elif command == "F":
#             query_last_drink_time()

# class StatusResponse(BaseModel):
#     posture_status: str
#     last_drink_time: str

class PostureStatusResponse(BaseModel):
    posture: str

class DrinkStatusResponse(BaseModel):
    year: int
    month: int
    day: int
    hour: int
    minute: int
    second: int

class Task(BaseModel):
    id: str
    name: str
    deadline: str
    priority: str
    duration: float
    completed: bool
    createdAt: str

class ScheduledTaskResult(BaseModel):
    name: str
    start: Optional[str] = None
    end: Optional[str] = None
    reason: Optional[str] = None

class ScheduleResponse(BaseModel):
    successful: List[ScheduledTaskResult]
    failed: List[ScheduledTaskResult]
    logs: List[str]

class Capturing(list):
    def __enter__(self):
        self._stdout = sys.stdout
        sys.stdout = self._stringio = io.StringIO()
        return self
    def __exit__(self, *args):
        self.extend(self._stringio.getvalue().splitlines())
        sys.stdout = self._stdout

class TaskFromCalendar(BaseModel):
    id: str
    name: str
    deadline: str
    startTime: str
    priority: str
    duration: float
    completed: bool
    createdAt: Optional[str]
    source: str

ScheduleSyncResponse = List[TaskFromCalendar]

@app.get("/")
async def root():
    return {"message": "Welcome to the PosturePomodoroModel API!"}

@app.post("/start_posture_test")
async def start_posture():
    start_posture_test()
    return {"message": "Posture test started."}


@app.post("/start_drinking_test")
async def start_drinking():
    start_drinking_test()
    return {"message": "Drinking water test started."}


@app.post("/stop_posture_test")
async def stop_posture():
    stop_posture_test()
    return {"message": "Posture test stopped."}


@app.post("/stop_drinking_test")
async def stop_drinking():
    stop_drinking_test()
    return {"message": "Drinking water test stopped."}


@app.get("/get_posture", response_model=PostureStatusResponse)
async def get_posture():
    posture_status = model.get_posture_status()
    return PostureStatusResponse(posture=posture_status)

@app.get("/get_last_drink_time", response_model=DrinkStatusResponse)
async def get_last_drink_time():
    last_drink_time = model.last_drink_time
    return DrinkStatusResponse(
        year=last_drink_time.tm_year,
        month=last_drink_time.tm_mon,
        day=last_drink_time.tm_mday,
        hour=last_drink_time.tm_hour,
        minute=last_drink_time.tm_min,
        second=last_drink_time.tm_sec
    )

@app.post("/schedule", response_model=ScheduleResponse)
async def schedule_tasks_endpoint(tasks_from_frontend: List[Task]):
    # ... (保留之前的數據格式轉換邏輯)
    priority_map_frontend_to_backend = {'high': '高', 'medium': '中', 'low': '低'}
    tasks_for_scheduler = []
    local_tz = dt.datetime.now().astimezone().tzinfo

    for task in tasks_from_frontend:
        if not task.completed:
            tasks_for_scheduler.append({
                "name": task.name,
                "duration_minutes": int(task.duration * 60),
                "due_date": dt.datetime.fromisoformat(task.deadline).astimezone(local_tz),
                "priority": priority_map_frontend_to_backend.get(task.priority, '中')
            })

    # --- 執行排程邏輯 ---
    service = get_calendar_service()
    if not service:
        raise HTTPException(status_code=500, detail="Failed to authenticate with Google Calendar API")

    results = None
    with Capturing() as output_logs:
        # 執行並接收回傳結果
        results = schedule_all_tasks(service, tasks_for_scheduler)
    
    print("Scheduler logs:", output_logs)

    if not results:
         raise HTTPException(status_code=500, detail="Scheduler failed to return results.")

    return {
        "successful": results["successful"],
        "failed": results["failed"],
        "logs": output_logs
    }

@app.post("/schedule-and-sync", response_model=ScheduleSyncResponse) # 更改路徑和回應模型
async def schedule_and_sync_endpoint(tasks_from_frontend: List[Task]):
    # ... (保留之前的數據格式轉換邏輯)
    priority_map_frontend_to_backend = {'high': '高', 'medium': '中', 'low': '低'}
    tasks_for_scheduler = []
    local_tz = dt.datetime.now().astimezone().tzinfo
    now = dt.datetime.now(local_tz)
    last_due_date = now

    for task in tasks_from_frontend:
        if not task.completed:
            due_date = dt.datetime.fromisoformat(task.deadline).astimezone(local_tz)
            if due_date > last_due_date:
                last_due_date = due_date
            tasks_for_scheduler.append({
                "name": task.name,
                "duration_minutes": int(task.duration * 60),
                "due_date": due_date,
                "priority": priority_map_frontend_to_backend.get(task.priority, '中')
            })

    # 1. 執行排程
    service = get_calendar_service()
    if not service:
        raise HTTPException(status_code=500, detail="Failed to authenticate with Google Calendar API")
    
    with Capturing() as output_logs:
        schedule_all_tasks(service, tasks_for_scheduler)
    
    print("Scheduler logs:", output_logs)

    # 2. 排程後，讀取整個行事曆的事件
    # 將讀取範圍擴大一天，以包含可能的跨日排程
    end_range = last_due_date + dt.timedelta(days=1)
    
    synced_tasks = get_calendar_events_as_tasks(service, now, end_range)

    # 3. 回傳完整的、已排序的任務列表
    return synced_tasks

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)
