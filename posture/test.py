import time
import requests

# FastAPI server URL
BASE_URL = "http://127.0.0.1:8000"  # Update with your FastAPI server URL

# Start the posture test
def start_posture_test():
    response = requests.post(f"{BASE_URL}/start_posture_test")
    print(response.json())

# Start the drinking test
def start_drinking_test():
    response = requests.post(f"{BASE_URL}/start_drinking_test")
    print(response.json())

# Get the posture status
def get_posture_status():
    response = requests.get(f"{BASE_URL}/get_posture")
    print(f"Posture Status: {response.json()}")

# Get the last drink time
def get_last_drink_time():
    response = requests.get(f"{BASE_URL}/get_last_drink_time")
    print(f"Last Drink Time: {response.json()}")

# Main test sequence
def run_tests():
    # Start the posture and drinking tests
    start_posture_test()
    start_drinking_test()
    time.sleep(5)  # Wait for a moment to let the tests initialize
    print("Tests started. Monitoring posture status and last drink time...")
    # Loop to check posture status every 3 seconds and last drink time every 15 seconds
    while True:
        # Check posture status every 3 seconds
        get_posture_status()
        time.sleep(3)

        # Check last drink time every 15 seconds
        get_last_drink_time()
        time.sleep(12)  # To make it 15-second interval (3 seconds + 12 seconds)

if __name__ == "__main__":
    run_tests()
