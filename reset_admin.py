from database import SessionLocal
from models import User, Submission
from auth import get_password_hash

def reset_db():
    db = SessionLocal()
    try:
        # Delete submissions first due to FK constraint
        deleted_subs = db.query(Submission).delete()
        print(f"Deleted {deleted_subs} submissions.")
        
        # Delete users
        deleted_users = db.query(User).delete()
        print(f"Deleted {deleted_users} users.")
        
        # Create new admin
        hashed_password = get_password_hash("password123")
        admin_user = User(
            username="astron",
            hashed_password=hashed_password,
            is_admin=True
        )
        db.add(admin_user)
        db.commit()
        print("Created new admin user: astron")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_db()
