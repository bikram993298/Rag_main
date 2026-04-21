import os
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from typing import Optional, Dict, Any
from datetime import datetime
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

