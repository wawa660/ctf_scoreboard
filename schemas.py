from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_admin: bool
    
    class Config:
        orm_mode = True

class ChallengeBase(BaseModel):
    title: str
    description: str
    points: int
    category: str

class ChallengeCreate(ChallengeBase):
    flag: str

class Challenge(ChallengeBase):
    id: int

    class Config:
        orm_mode = True

class SubmissionBase(BaseModel):
    challenge_id: int
    flag: str

class Submission(BaseModel):
    id: int
    user_id: int
    challenge_id: int
    timestamp: datetime

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
