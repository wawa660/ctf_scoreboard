from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List
import models, schemas, auth
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="CTF Scoreboard", description="A simple CTF Scoreboard")

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/register", response_model=schemas.Token)
async def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = auth.get_password_hash(user.password)
    # First user is admin
    is_admin = db.query(models.User).count() == 0
    new_user = models.User(username=user.username, hashed_password=hashed_password, is_admin=is_admin)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    access_token = auth.create_access_token(data={"sub": new_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.get("/challenges", response_model=List[schemas.Challenge])
async def read_challenges(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    challenges = db.query(models.Challenge).all()
    # Mask flags for non-admins? ideally yes, but schema handles response model.
    # The Pydantic model for response currently HAS 'flag' if I reuse Challenge directly?
    # Wait, the Schema 'Challenge' has 'flag' inherited?
    # Let's check schemas.py content I wrote.
    # ChallengeBase: title, description, points, category
    # ChallengeCreate(ChallengeBase): flag
    # Challenge(ChallengeBase): id
    # So 'Challenge' model sent to user DOES NOT have 'flag'. Correct.
    return challenges

@app.post("/challenges", response_model=schemas.Challenge)
async def create_challenge(challenge: schemas.ChallengeCreate, current_user: models.User = Depends(auth.get_current_admin_user), db: Session = Depends(get_db)):
    db_challenge = models.Challenge(**challenge.dict())
    db.add(db_challenge)
    db.commit()
    db.refresh(db_challenge)
    return db_challenge

@app.delete("/challenges/{challenge_id}")
async def delete_challenge(challenge_id: int, current_user: models.User = Depends(auth.get_current_admin_user), db: Session = Depends(get_db)):
    challenge = db.query(models.Challenge).filter(models.Challenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    db.delete(challenge)
    db.commit()
    return {"ok": True}

@app.post("/submit")
async def submit_flag(submission: schemas.SubmissionBase, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    # Check if already submitted
    existing = db.query(models.Submission).filter(
        models.Submission.user_id == current_user.id,
        models.Submission.challenge_id == submission.challenge_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already solved")

    challenge = db.query(models.Challenge).filter(models.Challenge.id == submission.challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    if submission.flag != challenge.flag:
        return JSONResponse(status_code=400, content={"detail": "Incorrect flag"})
    
    # Correct flag
    new_submission = models.Submission(user_id=current_user.id, challenge_id=submission.challenge_id)
    db.add(new_submission)
    db.commit()
    return {"message": "Correct!", "points": challenge.points}

@app.get("/scoreboard")
async def get_scoreboard(db: Session = Depends(get_db)):
    # Calculate scores
    # This is a bit inefficient for large scale but fine here
    users = db.query(models.User).all()
    scoreboard = []
    for user in users:
        score = 0
        for sub in user.submissions:
            # Need to join with challenge to get points, or do a smarter query
            # Given relations, sub.challenge should work if eager loaded or lazy loaded
            # check models.py
            # models.Submission has relationship 'challenge'
            if sub.challenge:
                score += sub.challenge.points
        scoreboard.append({"username": user.username, "score": score, "is_admin": user.is_admin})
    
    # Sort by score desc
    scoreboard.sort(key=lambda x: x["score"], reverse=True)
    return scoreboard

@app.get("/")
async def read_index():
    return FileResponse('templates/index.html')

