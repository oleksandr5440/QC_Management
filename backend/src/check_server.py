"""
Helper script to check if the Flask server is running properly.
"""
import requests
import time
import sys

def check_server_status(url, max_attempts=10, retry_delay=1):
    """Check if the server is running and responding at the given URL."""
    print(f"Checking server status at {url}...")
    
    for attempt in range(max_attempts):
        try:
            response = requests.get(url)
            if response.status_code == 200:
                print(f"Server is running! Status code: {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")
                return True
            else:
                print(f"Attempt {attempt+1}/{max_attempts}: Server responded with status code {response.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"Attempt {attempt+1}/{max_attempts}: Connection error. Server might not be running yet.")
        except Exception as e:
            print(f"Attempt {attempt+1}/{max_attempts}: Error: {str(e)}")
        
        time.sleep(retry_delay)
    
    print("Failed to connect to the server after multiple attempts.")
    return False

if __name__ == "__main__":
    server_url = "http://localhost:5000/health"
    if len(sys.argv) > 1:
        server_url = sys.argv[1]
    
    check_server_status(server_url)