
import requests
import sys
import sqlite3

BASE_URL = "http://127.0.0.1:8000"
DB_PATH = "ctf.db"

def run():
    # 1. Register Admin User
    s = requests.Session()
    username = "admin_repro"
    password = "password123"
    
    print(f"Registering {username}...")
    res = s.post(f"{BASE_URL}/register", json={"username": username, "password": password})
    if res.status_code == 200:
        print("Registered.")
        token = res.json()["access_token"]
    else:
        # Maybe already exists, try login
        print(f"Register failed ({res.status_code}), trying login...")
        res = s.post(f"{BASE_URL}/token", data={"username": username, "password": password})
        if res.status_code != 200:
            print("Login failed.")
            print(res.text)
            sys.exit(1)
        token = res.json()["access_token"]
        print("Logged in.")

    # 1.5 Force make admin - SKIPPED for verification of non-admin access
    # print("Forcing admin privileges...")
    # conn = sqlite3.connect(DB_PATH)
    # cursor = conn.cursor()
    # cursor.execute("UPDATE users SET is_admin = 1 WHERE username = ?", (username,))
    # conn.commit()
    # conn.close()
    # print("Admin privileges granted.")

    # 2. List Users
    headers = {"Authorization": f"Bearer {token}"}
    print("Fetching /users...")
    res = s.get(f"{BASE_URL}/users", headers=headers)
    print(f"Status: {res.status_code}")
    print(f"Content: {res.text}")

if __name__ == "__main__":
    run()
