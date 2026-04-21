from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from backend.utils.auth import get_current_user
from backend.utils.database import FlashcardDB

router = APIRouter()


class CreateCardRequest(BaseModel):
    front: str
    back: str
    topic: str = "General"
    subject: str = "General"


class ReviewRequest(BaseModel):
    quality: int  # 0=forgot, 1=hard, 2=easy


@router.get("/flashcards")
async def get_flashcards(
    due_only: bool = False,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("user_id", current_user.get("sub", ""))
    cards = FlashcardDB.get_due(user_id) if due_only else FlashcardDB.get_all(user_id)
    due_count = len(FlashcardDB.get_due(user_id))
    return {"cards": cards, "due_count": due_count}


@router.post("/flashcards", status_code=201)
async def create_flashcard(
    req: CreateCardRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    user_id = current_user.get("user_id", current_user.get("sub", ""))
    card_id = FlashcardDB.create(user_id, req.front, req.back, req.topic, req.subject)
    if not card_id:
        raise HTTPException(status_code=500, detail="Failed to create flashcard")
    return {"id": card_id, "message": "Flashcard saved"}


@router.patch("/flashcards/{card_id}/review")
async def review_flashcard(
    card_id: str,
    req: ReviewRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    if req.quality not in (0, 1, 2):
        raise HTTPException(status_code=400, detail="quality must be 0, 1, or 2")
    FlashcardDB.review(card_id, req.quality)
    return {"message": "Review recorded"}


@router.delete("/flashcards/{card_id}")
async def delete_flashcard(
    card_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    FlashcardDB.delete(card_id)
    return {"message": "Deleted"}
