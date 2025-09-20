from model import PosturePomodoroModel
import threading
import time

model = PosturePomodoroModel()
is_running = False

run_thread = threading.Thread(target=model.run)

# def query_status():
#     while model.cap.isOpened() and not model.stop_detection:
#         status = model.get_posture_status()
#         print(f"Current Status: {status}")
#         time.sleep(5)

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
    print("Run thread alive:", run_thread.is_alive())
    if not run_thread.is_alive():
        run_thread = threading.Thread(target=model.run)
        run_thread.start()

def start_drinking_test():
    global run_thread
    model.start_drinking_detection()
    print("Starting drinking water test...")
    
    if not run_thread.is_alive():
        run_thread = threading.Thread(target=model.run)
        run_thread.start()

def stop_posture_test():
    model.stop_posture_detection()
    print("Stopping posture test...")

def stop_drinking_test():
    model.stop_drinking_detection()
    print("Stopping drinking water test...")

def temp_input():
    while True:
        command = input("Enter command: (A)start_posture_test (B)stop_posture_test (C)start_drinking_test, (D)stop_drinking_test, (E)posture_status, (F)last_drink_time: ")
        if command == "A":
            start_posture_test()
        elif command == "B":
            stop_posture_test()
        elif command == "C":
            start_drinking_test()
        elif command == "D":
            stop_drinking_test()
        elif command == "E":
            query_posture_status()
        elif command == "F":
            query_last_drink_time()


tem_input_thread = threading.Thread(target=temp_input)
tem_input_thread.start()



tem_input_thread.join()
run_thread.join()

# def stop_model():
#     time.sleep(20)
#     model.stop_detection = True
#     print("Stopping model...")


# print(f"Start: {time.localtime(time.time())}")

# run_thread = threading.Thread(target=model.run)
# run_thread.start()

# status_thread = threading.Thread(target=query_status)
# status_thread.start()

# stop_thread = threading.Thread(target=stop_model)
# stop_thread.start()

# run_thread.join()
# status_thread.join()
# stop_thread.join()

# print(f"Last drink time: {model.last_drink_time}")

    