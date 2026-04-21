import os
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import DuplicateKeyError
from typing import Optional, Dict, Any
from datetime import datetime, timedelta, date
from bson.objectid import ObjectId
from dotenv import load_dotenv
from pathlib import Path
import certifi

# Load backend/.env explicitly so DB settings are available even when running from project root.
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

# MongoDB Configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "jee_neet_rag")

# Keep DB connection timeouts short to avoid blocking app startup.
client = MongoClient(
    MONGODB_URL,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000,
    socketTimeoutMS=5000,
    tlsCAFile=certifi.where(),
)
db = client[DB_NAME]


def init_db():
    """Initialize database with indexes"""
    try:
        db["users"].create_index("email", unique=True)
        db["chat_history"].create_index([("user_id", 1), ("created_at", 1)])
        db["user_analytics"].create_index([("user_id", 1), ("topic", 1)], unique=True)
        db["user_analytics"].create_index([("user_id", 1), ("last_seen", DESCENDING)])
        db["flashcards"].create_index([("user_id", 1), ("due_date", ASCENDING)])
        db["user_activity"].create_index([("user_id", 1), ("date", DESCENDING)], unique=True)
        db["exam_sessions"].create_index([("user_id", 1), ("submitted_at", DESCENDING)])
        print("Database initialized with indexes")
    except Exception as exc:
        print(f"Database initialization skipped: {exc}")


def is_db_available() -> bool:
    """Check whether MongoDB is reachable."""
    try:
        client.admin.command("ping")
        return True
    except Exception:
        return False


class UserDB:
    """Database operations for users"""
    
    @staticmethod
    async def create_user(
        email: str,
        full_name: str,
        password_hash: str,
        email_verified: bool = False
    ) -> Dict[str, Any]:
        """Create a new user"""
        try:
            user_doc = {
                "email": email,
                "full_name": full_name,
                "password_hash": password_hash,
                "email_verified": email_verified,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "is_active": True
            }
            
            result = db.users.insert_one(user_doc)
            user_doc["_id"] = result.inserted_id
            return user_doc
        except DuplicateKeyError:
            return None
        except Exception:
            return None
    
    @staticmethod
    async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        try:
            return db.users.find_one({"email": email})
        except Exception:
            return None
    
    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            return db.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            return None
    
    @staticmethod
    async def update_user(user_id: str, **kwargs) -> Optional[Dict[str, Any]]:
        """Update user details"""
        try:
            kwargs["updated_at"] = datetime.utcnow()
            result = db.users.find_one_and_update(
                {"_id": ObjectId(user_id)},
                {"$set": kwargs},
                return_document=True
            )
            return result
        except Exception:
            return None
    
    @staticmethod
    async def verify_email(email: str) -> Optional[Dict[str, Any]]:
        """Mark email as verified"""
        try:
            result = db.users.find_one_and_update(
                {"email": email},
                {"$set": {"email_verified": True, "updated_at": datetime.utcnow()}},
                return_document=True
            )
            return result
        except Exception:
            return None
    
    @staticmethod
    async def delete_user(user_id: str) -> bool:
        """Delete user"""
        try:
            result = db.users.delete_one({"_id": ObjectId(user_id)})
            return result.deleted_count > 0
        except Exception:
            return False
    
    @staticmethod
    async def user_exists(email: str) -> bool:
        """Check if user exists by email"""
        try:
            return db.users.count_documents({"email": email}) > 0
        except Exception:
            return False


class ChatHistoryDB:
    """Per-user chat history stored in MongoDB."""

    COLL = "chat_history"

    @staticmethod
    def save_message(user_id: str, role: str, text: str) -> bool:
        try:
            db[ChatHistoryDB.COLL].insert_one({
                "user_id": user_id,
                "role": role,
                "text": text,
                "created_at": datetime.utcnow(),
            })
            return True
        except Exception:
            return False

    @staticmethod
    def get_history(user_id: str, limit: int = 60) -> list:
        """Return up to `limit` most-recent messages, oldest first."""
        try:
            docs = list(
                db[ChatHistoryDB.COLL]
                .find({"user_id": user_id}, {"_id": 0, "role": 1, "text": 1})
                .sort("created_at", 1)
                .limit(limit)
            )
            return docs
        except Exception:
            return []

    @staticmethod
    def clear_history(user_id: str) -> bool:
        try:
            db[ChatHistoryDB.COLL].delete_many({"user_id": user_id})
            return True
        except Exception:
            return False


class UserAnalyticsDB:
    """Track per-topic question accuracy per user."""

    COLL = "user_analytics"
    ACT = "user_activity"

    @staticmethod
    def record_question(user_id: str, topic: str, subject: str) -> None:
        try:
            db[UserAnalyticsDB.COLL].update_one(
                {"user_id": user_id, "topic": topic},
                {"$inc": {"asked": 1}, "$set": {"subject": subject, "last_seen": datetime.utcnow()}},
                upsert=True,
            )
            today = date.today().isoformat()
            db[UserAnalyticsDB.ACT].update_one(
                {"user_id": user_id, "date": today},
                {"$inc": {"count": 1}},
                upsert=True,
            )
        except Exception:
            pass

    @staticmethod
    def record_feedback(user_id: str, topic: str, subject: str, is_correct: bool) -> None:
        try:
            field = "correct" if is_correct else "incorrect"
            db[UserAnalyticsDB.COLL].update_one(
                {"user_id": user_id, "topic": topic},
                {"$inc": {field: 1}, "$set": {"subject": subject, "last_seen": datetime.utcnow()}},
                upsert=True,
            )
        except Exception:
            pass

    @staticmethod
    def get_analytics(user_id: str) -> list:
        try:
            return list(
                db[UserAnalyticsDB.COLL]
                .find({"user_id": user_id}, {"_id": 0})
                .sort("asked", DESCENDING)
            )
        except Exception:
            return []

    @staticmethod
    def get_streak(user_id: str) -> int:
        """Count consecutive days with activity ending today or yesterday."""
        try:
            days = sorted(
                [
                    d["date"]
                    for d in db[UserAnalyticsDB.ACT].find(
                        {"user_id": user_id}, {"date": 1, "_id": 0}
                    )
                ],
                reverse=True,
            )
            if not days:
                return 0
            streak = 0
            check = date.today()
            for d in days:
                if d == check.isoformat() or d == (check - timedelta(1)).isoformat():
                    streak += 1
                    check = date.fromisoformat(d) - timedelta(1)
                else:
                    break
            return streak
        except Exception:
            return 0


class FlashcardDB:
    """Spaced-repetition flashcards per user."""

    COLL = "flashcards"

    @staticmethod
    def create(user_id: str, front: str, back: str, topic: str, subject: str) -> str:
        try:
            doc = {
                "user_id": user_id,
                "front": front,
                "back": back,
                "topic": topic,
                "subject": subject,
                "due_date": datetime.utcnow(),
                "interval": 1,
                "ease": 2.5,
                "reviews": 0,
                "created_at": datetime.utcnow(),
            }
            result = db[FlashcardDB.COLL].insert_one(doc)
            return str(result.inserted_id)
        except Exception:
            return ""

    @staticmethod
    def get_all(user_id: str) -> list:
        try:
            docs = list(
                db[FlashcardDB.COLL]
                .find({"user_id": user_id})
                .sort("due_date", ASCENDING)
            )
            for d in docs:
                d["id"] = str(d.pop("_id"))
            return docs
        except Exception:
            return []

    @staticmethod
    def get_due(user_id: str) -> list:
        try:
            now = datetime.utcnow()
            docs = list(
                db[FlashcardDB.COLL]
                .find({"user_id": user_id, "due_date": {"$lte": now}})
                .sort("due_date", ASCENDING)
            )
            for d in docs:
                d["id"] = str(d.pop("_id"))
            return docs
        except Exception:
            return []

    @staticmethod
    def review(card_id: str, quality: int) -> None:
        """quality: 0=forgot → +1d, 1=hard → +3d, 2=easy → +7d"""
        intervals = {0: 1, 1: 3, 2: 7}
        days = intervals.get(quality, 1)
        try:
            db[FlashcardDB.COLL].update_one(
                {"_id": ObjectId(card_id)},
                {
                    "$set": {"due_date": datetime.utcnow() + timedelta(days=days)},
                    "$inc": {"reviews": 1},
                },
            )
        except Exception:
            pass

    @staticmethod
    def delete(card_id: str) -> None:
        try:
            db[FlashcardDB.COLL].delete_one({"_id": ObjectId(card_id)})
        except Exception:
            pass

