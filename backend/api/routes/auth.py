from fastapi import APIRouter, HTTPException, status, Depends, Query
from backend.models.user import (
    UserSignup, UserLogin, UserResponse, TokenResponse, EmailVerificationRequest
)
from backend.utils.auth import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    get_current_user, create_email_verification_token, verify_email_verification_token
)
from backend.utils.database import UserDB, is_db_available
from backend.utils.email import send_verification_email
from typing import Dict, Any
import os

router = APIRouter(prefix="/auth", tags=["auth"])
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


@router.post("/signup", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserSignup):
    """Register a new user with email and password
    
    An email verification link will be sent to the provided email address.
    User must verify email before they can login.
    """
    
    if not is_db_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable. Check MONGODB_URL/network and try again."
        )

    # Check if user already exists
    existing_user = await UserDB.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password strength
    if len(user_data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    # Hash password
    password_hash = hash_password(user_data.password)
    
    # Create user in database (not verified yet)
    user_doc = await UserDB.create_user(
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=password_hash,
        email_verified=False
    )
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
    
    # Generate verification token
    verification_token = create_email_verification_token(user_data.email)
    
    # Send verification email
    email_sent = send_verification_email(user_data.email, verification_token)
    verification_link = f"{FRONTEND_URL}/verify-email?token={verification_token}&email={user_data.email}"
    
    if not email_sent:
        # User created but email failed - still return success but warn user
        return {
            "message": "Account created successfully, but verification email could not be sent.",
            "email": user_data.email,
            "status": "pending_verification",
            "email_sent": False,
            "verification_link": verification_link
        }
    
    return {
        "message": "Account created successfully! Please check your email to verify your account.",
        "email": user_data.email,
        "status": "pending_verification",
        "email_sent": True
    }


@router.post("/verify-email", response_model=Dict[str, str])
async def verify_email(request: EmailVerificationRequest):
    """Verify user email with verification token
    
    Call this endpoint with the token from the verification email.
    """
    
    # Verify the token
    email = verify_email_verification_token(request.token)
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    # Check email matches
    if email != request.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email mismatch"
        )
    
    # Mark email as verified
    user_doc = await UserDB.verify_email(email)
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "message": "Email verified successfully! You can now login.",
        "email": email
    }


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login with email and password
    
    Email must be verified before login is allowed.
    """
    
    if not is_db_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable. Check MONGODB_URL/network and try again."
        )

    # Get user from database
    user_doc = await UserDB.get_user_by_email(credentials.email)
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if email is verified
    if not user_doc.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please check your email for the verification link."
        )
    
    # Verify password
    if not verify_password(credentials.password, user_doc.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create tokens
    access_token = create_access_token(
        data={"sub": credentials.email, "user_id": str(user_doc["_id"])}
    )
    refresh_token = create_refresh_token(
        data={"sub": credentials.email, "user_id": str(user_doc["_id"])}
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=str(user_doc["_id"]),
            email=user_doc["email"],
            full_name=user_doc["full_name"],
            created_at=user_doc["created_at"],
            email_verified=user_doc.get("email_verified", False)
        )
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Refresh access token using refresh token"""
    
    email = current_user.get("sub")
    user_id = current_user.get("user_id")
    
    if not email or not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    # Get fresh user data
    user_doc = await UserDB.get_user_by_email(email)
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Create new access token
    access_token = create_access_token(
        data={"sub": email, "user_id": user_id}
    )
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=str(user_doc["_id"]),
            email=user_doc["email"],
            full_name=user_doc["full_name"],
            created_at=user_doc["created_at"],
            email_verified=user_doc.get("email_verified", False)
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user profile"""
    
    email = current_user.get("sub")
    user_doc = await UserDB.get_user_by_email(email)
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=str(user_doc["_id"]),
        email=user_doc["email"],
        full_name=user_doc["full_name"],
        created_at=user_doc["created_at"],
        email_verified=user_doc.get("email_verified", False)
    )


@router.post("/logout")
async def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Logout user (client should discard tokens)"""
    return {"message": "Logged out successfully"}


@router.post("/resend-verification-email")
async def resend_verification_email(email: str = Query(...)):
    """Resend verification email to user
    
    Use this if the initial verification email was not received.
    """
    
    user_doc = await UserDB.get_user_by_email(email)
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Skip if email already verified
    if user_doc.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    # Generate new verification token
    verification_token = create_email_verification_token(email)
    
    # Send verification email
    email_sent = send_verification_email(email, verification_token)
    verification_link = f"{FRONTEND_URL}/verify-email?token={verification_token}&email={email}"
    
    if not email_sent:
        return {
            "message": "Email could not be sent. Use the verification link below.",
            "email_sent": False,
            "verification_link": verification_link,
        }
    
    return {"message": "Verification email sent successfully", "email_sent": True}

