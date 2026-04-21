# Email Verification Authentication Flow

This document explains the complete email verification authentication system implemented in the JEE-NEET RAG application.

## 🔄 Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER REGISTRATION FLOW                      │
└─────────────────────────────────────────────────────────────────┘

1. SIGNUP PAGE
   ├─ User enters: Email, Full Name, Password
   ├─ Frontend validates input
   └─ POST /api/auth/signup (email, full_name, password)

2. BACKEND PROCESSING
   ├─ Hash password with bcrypt
   ├─ Create user document in MongoDB (email_verified: false)
   ├─ Generate 24-hour verification token
   ├─ Create verification email with link:
   │  └─ http://localhost:5173/verify-email?email={email}&token={token}
   ├─ Send email via SMTP
   └─ Return: "Please verify your email" message

3. FRONTEND RESPONSE
   ├─ Show success screen
   ├─ Display: "Verification email sent to {email}"
   ├─ Show: "Please check your email and click the verification link"
   └─ Auto-redirect to /login after 3 seconds

┌─────────────────────────────────────────────────────────────────┐
│                      EMAIL VERIFICATION FLOW                    │
└─────────────────────────────────────────────────────────────────┘

1. USER CLICKS EMAIL LINK
   └─ Browser opens: /verify-email?email=user@example.com&token=xyz123

2. VERIFY EMAIL PAGE LOADS
   ├─ Extract token and email from URL
   ├─ Show: "Verifying your email..."
   └─ Auto-call POST /api/auth/verify-email (token, email)

3. BACKEND PROCESSING
   ├─ Find user by email
   ├─ Validate token (check expiry, signature)
   ├─ Check token matches user's verification token
   ├─ Mark email as verified: email_verified = true
   └─ Return: "Email verified successfully!"

4. FRONTEND RESPONSE
   ├─ Show: ✓ Email Verified!
   ├─ Display: "You can now login"
   └─ Auto-redirect to /login after 2 seconds

ERROR CASES:
├─ Invalid/Expired Token → Show "Verification link expired"
├─ User not found → Show "Invalid verification link"
└─ Database error → Show "Something went wrong"

┌─────────────────────────────────────────────────────────────────┐
│                           LOGIN FLOW                             │
└─────────────────────────────────────────────────────────────────┘

1. LOGIN PAGE
   ├─ User enters: Email, Password
   ├─ Frontend validates input
   └─ POST /api/auth/login (email, password)

2. BACKEND PROCESSING
   ├─ Find user by email
   ├─ Check: User exists? (if not: 404)
   ├─ Check: email_verified === true (if false: 403)
   ├─ Verify password hash
   ├─ Generate tokens:
   │  ├─ access_token (30 min expiry)
   │  └─ refresh_token (7 day expiry)
   └─ Return tokens + user info

3. FRONTEND RESPONSE
   ├─ Store tokens in localStorage
   ├─ Update AuthContext (user is logged in)
   ├─ Redirect to /chat
   └─ Chat page loads with authentication

ERROR CASES:
├─ Email not found → Show "Invalid email or password"
├─ Password incorrect → Show "Invalid email or password"
├─ Email not verified → Show "Please verify your email first"
└─ Database error → Show "Login failed, try again"

┌─────────────────────────────────────────────────────────────────┐
│                      PROTECTED CHAT ACCESS                       │
└─────────────────────────────────────────────────────────────────┘

1. USER VISITS /chat
   ├─ ProtectedRoute component checks: isAuthenticated?
   ├─ If true: Show ChatBox component
   └─ If false: Redirect to /login

2. CHAT API REQUEST
   ├─ Include: Authorization: Bearer {access_token}
   ├─ Backend verifies token
   └─ Process chat request

3. TOKEN AUTO-REFRESH
   ├─ If access_token expires (30 min)
   ├─ Auto-call POST /api/auth/refresh
   ├─ Get new access_token
   └─ Update localStorage
   └─ Continue using chat

ERROR CASES:
├─ No token → Redirect to /login
├─ Expired access_token → Auto-refresh
├─ Expired refresh_token → Logout and redirect to /login
└─ Invalid token → Logout and redirect to /login

┌─────────────────────────────────────────────────────────────────┐
│                    RESEND VERIFICATION EMAIL                     │
└─────────────────────────────────────────────────────────────────┘

1. IF USER MISSED VERIFICATION EMAIL
   ├─ POST /api/auth/resend-verification-email?email=user@example.com
   ├─ Backend finds user
   ├─ Generates new verification token (24 hours)
   ├─ Sends new verification email
   └─ Returns: "Verification email sent"

2. USER CLICKS NEW LINK
   └─ Same flow as "EMAIL VERIFICATION FLOW" above
```

---

## 📦 Backend Implementation Details

### File: `backend/utils/auth.py`

**Key Functions:**

```python
def create_email_verification_token(email: str) -> str
  ├─ Generate JWT token with email
  ├─ Expiry: 24 hours from now
  └─ Return: Encoded token string

def verify_email_verification_token(token: str) -> str
  ├─ Decode JWT token
  ├─ Check expiry
  ├─ Return: Email from token
  └─ Raises: HTTPException if invalid/expired
```

### File: `backend/utils/email.py`

**Key Functions:**

```python
def send_verification_email(email: str, verification_token: str) -> bool
  ├─ Create HTML email with verification link:
  │  └─ {FRONTEND_URL}/verify-email?email={email}&token={token}
  ├─ Connect to SMTP server (Gmail)
  ├─ Send email
  └─ Return: True if successful

def send_password_reset_email(email: str, reset_token: str) -> bool
  ├─ (Similar structure for password reset)
```

### File: `backend/api/routes/auth.py`

**Key Endpoints:**

```python
POST /api/auth/signup
  ├─ Input: email, full_name, password
  ├─ Create user (email_verified=false)
  ├─ Send verification email
  └─ Return: {"message": "...", "email": "...", "status": "pending_verification"}

POST /api/auth/verify-email
  ├─ Input: email, token
  ├─ Validate token
  ├─ Mark email_verified = true
  └─ Return: {"message": "Email verified successfully!"}

POST /api/auth/login
  ├─ Input: email, password
  ├─ Check: email_verified === true
  ├─ Generate tokens
  └─ Return: {"access_token": "...", "refresh_token": "...", "user": {...}}

POST /api/auth/resend-verification-email
  ├─ Input: email (query param)
  ├─ Generate new token
  ├─ Send verification email
  └─ Return: {"message": "Verification email sent"}
```

### File: `backend/models/user.py`

**Database Schema:**

```python
{
  "_id": ObjectId,
  "email": "user@example.com",        # Unique
  "full_name": "User Name",
  "password_hash": "bcrypt_hash",     # Never plain text
  "email_verified": False,             # Key field for login check
  "created_at": ISODateTime,
  "is_active": True,
  "verification_token_expiry": ISODateTime,  # For token validation
}
```

---

## 🎨 Frontend Implementation Details

### File: `frontend/src/context/AuthContext.jsx`

**Key Methods:**

```javascript
signup(email, fullName, password)
  ├─ POST /api/auth/signup
  ├─ Returns: {message, email, status}
  └─ Used by: SignupPage

login(email, password)
  ├─ POST /api/auth/login
  ├─ Stores tokens in localStorage
  ├─ Updates user state
  └─ Used by: LoginPage

resendVerificationEmail(email)
  ├─ POST /api/auth/resend-verification-email
  ├─ Returns: {message}
  └─ Used by: SignupPage (if needed)

refreshAccessToken()
  ├─ POST /api/auth/refresh
  ├─ Updates access_token
  └─ Called automatically when token expires
```

### File: `frontend/src/pages/SignupPage.jsx`

**Flow:**

```javascript
1. User enters form data
2. Form validation
3. Call auth.signup(email, name, password)
4. If success:
   ├─ Set success = true
   ├─ Show success screen for 3 seconds
   ├─ Display: "Verification email sent to {email}"
   └─ Redirect to /login
5. If error:
   └─ Show error message
```

### File: `frontend/src/pages/VerifyEmailPage.jsx`

**Flow:**

```javascript
1. Extract token and email from URL params
2. Auto-call POST /api/auth/verify-email
3. If success:
   ├─ Show: ✓ Email Verified!
   ├─ Wait 2 seconds
   └─ Redirect to /login
4. If error:
   ├─ Show: ✗ Verification Failed
   └─ Offer: "Back to Sign Up" link
```

### File: `frontend/src/pages/LoginPage.jsx`

**Flow:**

```javascript
1. User enters email and password
2. Form validation
3. Call auth.login(email, password)
4. If success:
   ├─ Store tokens
   ├─ Redirect to /chat
   └─ ChatBox can now use access token
5. If error (email not verified):
   ├─ Show: "Please verify your email first"
   └─ Offer resend verification email option
```

---

## 🔐 Token Details

### Access Token
```
Type: JWT (JSON Web Token)
Payload:
  ├─ sub: user_id
  ├─ email: user@example.com
  ├─ exp: timestamp (30 minutes from now)
  └─ iat: timestamp (created at)

Usage: Include in every API request
  └─ Authorization: Bearer {access_token}

Expiry: 30 minutes
Refresh: Automatic (frontend handles)
```

### Refresh Token
```
Type: JWT (JSON Web Token)
Payload:
  ├─ sub: user_id
  ├─ exp: timestamp (7 days from now)
  └─ type: "refresh"

Usage: POST /api/auth/refresh to get new access_token

Expiry: 7 days
Refresh: Manual logout needed to clear
```

### Email Verification Token
```
Type: JWT (JSON Web Token)
Payload:
  ├─ email: user@example.com
  ├─ purpose: "email_verification"
  ├─ exp: timestamp (24 hours from now)
  └─ iat: timestamp (created at)

Usage: Click link in email with token as query param
  └─ /verify-email?email={email}&token={token}

Expiry: 24 hours
Storage: Sent via email link only
```

---

## 🧪 Testing Scenarios

### Scenario 1: Happy Path (Successful Registration)
```
1. Sign up with valid email/password
2. Receive verification email
3. Click link in email
4. See "Email verified!" message
5. Login with credentials
6. Access chat with token
```

### Scenario 2: Token Expired
```
1. Sign up with valid email/password
2. Don't click link for 25+ hours
3. Try to verify email
4. See "Link expired" message
5. Use "Resend Email" to get new token
6. Verify with new token
```

### Scenario 3: Login Without Verification
```
1. Sign up with valid email/password
2. Try to login immediately (without verifying)
3. See "Email not verified" error
4. Check email and verify
5. Login successful
```

### Scenario 4: Auto Token Refresh
```
1. Login with credentials
2. Store access token (30 min expiry)
3. Use chat for 30+ minutes
4. System auto-refreshes token
5. Chat continues working
6. After 7 days: force logout (refresh token expired)
```

---

## 📊 Database Operations

### Create User (Signup)
```mongodb
db.users.insertOne({
  email: "user@example.com",
  full_name: "User Name",
  password_hash: "bcrypt_hash_here",
  email_verified: false,
  created_at: ISODate("2025-04-21T10:30:00Z"),
  is_active: true
})
```

### Verify Email
```mongodb
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { email_verified: true } }
)
```

### Check User Before Login
```mongodb
db.users.findOne({
  email: "user@example.com",
  email_verified: true
})
```

---

## 🔒 Security Measures

### Password Security
- ✅ Hashed with bcrypt (cost factor: 12)
- ✅ Never stored in plain text
- ✅ Never returned in API responses

### Token Security
- ✅ Signed with SECRET_KEY
- ✅ Expiry times enforced
- ✅ Refresh tokens stored in client-side localStorage
- ✅ Auto-refresh before expiry

### Email Verification
- ✅ 24-hour token expiry
- ✅ Unique token per signup
- ✅ Token validated before marking email as verified

### SMTP Security
- ✅ Use app-specific passwords (not full password)
- ✅ SMTP over TLS (port 587)
- ✅ Credentials stored in .env (not in code)

---

## 📝 Configuration

### Required Environment Variables
```bash
# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SENDER_EMAIL=your_email@gmail.com
SENDER_PASSWORD=your_app_password

# Database
MONGODB_URL=mongodb://localhost:27017
DB_NAME=jee_neet_rag

# Authentication
SECRET_KEY=your-secret-key-at-least-32-chars

# Frontend
FRONTEND_URL=http://localhost:5173
```

---

## 🚀 Deployment Considerations

1. **Email Service**: Use production SMTP or AWS SES
2. **Database**: MongoDB Atlas for production
3. **HTTPS**: Enforce HTTPS everywhere
4. **CORS**: Configure proper origins
5. **Rate Limiting**: Add rate limit to auth endpoints
6. **Monitoring**: Log all auth events
7. **Backup**: Regular database backups

---

## 📞 Support

For questions or issues:
- Check AUTHENTICATION_SETUP.md for setup guide
- Review API docs at `/docs` (FastAPI Swagger)
- Check console logs for error details
- Verify .env configuration

---

**Last Updated:** April 21, 2025
**Version:** 1.0.0 (Email Verification)
