
import sqlite3
import sys

DB_PATH = "ctf.db"

def run():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if astron exists
        cursor.execute("SELECT id FROM users WHERE username = 'astron'")
        if not cursor.fetchone():
            print("Error: User 'astron' does not exist in the database.")
            conn.close()
            return

        # 1. Promote astron
        print("Promoting 'astron' to admin...")
        cursor.execute("UPDATE users SET is_admin = 1 WHERE username = 'astron'")
        
        # 2. Demote everyone else
        print("Revoking admin privileges from others...")
        cursor.execute("UPDATE users SET is_admin = 0 WHERE username != 'astron'")
        
        conn.commit()
        
        # 3. Verify
        print("\nCurrent User Status:")
        cursor.execute("SELECT username, is_admin FROM users")
        for user in cursor.fetchall():
            status = "ADMIN" if user[1] else "User"
            print(f"- {user[0]}: {status}")
            
        conn.close()
        print("\nPermissions updated successfully.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run()
