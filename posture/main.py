from model import PosturePomodoroModel
import threading
import time
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()
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
