# Authentication Setup Guide

This guide will help you set up and run the login/signup authentication system with email verification for your JEE-NEET RAG application.

## 🎯 What Was Implemented

Your authentication system now includes:

✅ **User Registration** (Email/Password)
✅ **Email Verification** (Required before login)
✅ **User Login** (Email/Password)
✅ **JWT Token Management** (Access & Refresh tokens)
✅ **Protected Routes** (Chat requires authentication)
✅ **Persistent Authentication** (localStorage)
✅ **User Profile Management**
✅ **Resend Verification Email** (If initial email was missed)

---

## 📋 Prerequisites

### Backend
- Python 3.8+
- MongoDB (local or cloud)
- Gmail account (for sending verification emails) OR SMTP server
- All new packages in `requirements.txt`

### Frontend
- Node.js 18+
- npm or yarn

---

## 🚀 Setup Instructions

### Step 1: Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Configure Environment Variables

Copy the `.env.example` file to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# MongoDB Setup
MONGODB_URL=mongodb://localhost:27017
DB_NAME=jee_neet_rag

# JWT Configuration (CHANGE THIS IN PRODUCTION!)
SECRET_KEY=your-very-secret-key-at-least-32-characters-long

# Email Configuration (Gmail SMTP)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SENDER_EMAIL=your_email@gmail.com
SENDER_PASSWORD=your_app_password

# Server Configuration
HOST=0.0.0.0
PORT=8000
FRONTEND_URL=http://localhost:5173
```

### Step 3: Set Up MongoDB

#### Option A: Local MongoDB
```bash
# On Windows (using WSL or direct MongoDB installation)
mongod

# On macOS
brew install mongodb-community
brew services start mongodb-community

# On Linux
sudo systemctl start mongodb
```

#### Option B: MongoDB Atlas (Cloud)
1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string
4. Update `MONGODB_URL` in `.env`

### Step 4: Configure Email Sending

#### Using Gmail (Recommended for local development)

1. Enable 2-Factor Authentication on your Google Account
2. Go to [Google Account Security](https://myaccount.google.com/security)
3. Create an **App Password**:
   - Search for "App passwords"
   - Select "Mail" and "Windows Computer"
   - Google will generate a 16-character password
4. Copy this password to `SENDER_PASSWORD` in `.env`
5. Set `SENDER_EMAIL` to your Gmail address

**Example:**
```env
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SENDER_EMAIL=your_email@gmail.com
SENDER_PASSWORD=xxxx xxxx xxxx xxxx  # 16-character app password
```

#### Using Other Email Providers

Update the SMTP settings in `.env`:

**Outlook/Hotmail:**
```env
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
SENDER_EMAIL=your_email@outlook.com
SENDER_PASSWORD=your_password
```

**SendGrid:**
```env
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SENDER_EMAIL=apikey  # Use "apikey" as email
SENDER_PASSWORD=SG.xxxxxx  # Your SendGrid API key
```

### Step 5: Start Backend

```bash
cd backend
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will start at `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

### Step 6: Install Frontend Dependencies

```bash
cd frontend
npm install
```

### Step 7: Configure Frontend Environment

Create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8000
```

### Step 8: Start Frontend

```bash
cd frontend
npm run dev
```

The frontend will start at `http://localhost:5173`

---

## 🔐 API Endpoints

### Authentication Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/verify-email` | Verify email with token |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user profile |
| POST | `/api/auth/resend-verification-email` | Resend verification email |
| POST | `/api/auth/logout` | Logout (client-side) |

### Protected Chat Route

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---|
| POST | `/api/chat` | Send chat message | ✅ YES |

---

## 📱 Frontend Routes

| Route | Purpose |
|-------|---------|
| `/` | Redirects to `/chat` |
| `/login` | Login page |
| `/signup` | Registration page |
| `/verify-email` | Email verification page |
| `/chat` | Chat interface (protected) |

---

## 🔄 Authentication Flow

### 1. User Signs Up
```
1. User enters: Full Name, Email, Password
2. System creates user account (email NOT verified)
3. Verification email sent to user
4. User redirected to login page
```

### 2. User Verifies Email
```
1. User clicks link in verification email
2. System marks email as verified
3. User can now login
```

### 3. User Logs In
```
1. User enters: Email, Password
2. System checks email is verified
3. Access token + Refresh token generated
4. User redirected to chat page
```

### 4. Accessing Protected Routes
```
1. Chat requests include: Authorization: Bearer {access_token}
2. Token auto-refreshes when expired
3. User stays logged in (stored in localStorage)
```

---

## 🧪 Testing the System

### 1. Test User Registration
```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "full_name": "Test User",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "message": "Account created successfully! Please check your email to verify your account.",
  "email": "test@example.com",
  "status": "pending_verification"
}
```

### 2. Verify Email (after clicking link in email)
```bash
curl -X POST http://localhost:8000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "token": "token_from_email_link"
  }'
```

### 3. Test User Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "507f...",
    "email": "test@example.com",
    "full_name": "Test User",
    "created_at": "2025-04-21T10:30:00",
    "email_verified": true
  }
}
```

### 4. Use the Token
```bash
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Resend Verification Email
```bash
curl -X POST "http://localhost:8000/api/auth/resend-verification-email?email=test@example.com"
```

---

## 🌐 Frontend Features

### Signup Page
- Full name, email, and password input
- Password strength validation (min 8 characters)
- Confirm password field
- Success screen with verification email notification
- Auto-redirect to login after 3 seconds

### Email Verification Page
- Automatic verification when user clicks email link
- Shows success/error status
- Auto-redirect to login on success

### Login Page
- Email and password input
- Only allows login if email is verified
- Error message if email not verified

### Chat Page (Protected)
- User profile display (name & email)
- Logout button
- Chat interface (requires authentication)
- Access token automatically included in requests

---

## 🔑 Key Files & Locations

### Backend
```
backend/
├── api/
│   ├── main.py (Updated - includes auth router)
│   └── routes/
│       ├── auth.py (Updated - auth endpoints)
│       └── chat.py (Updated - requires auth)
├── models/
│   └── user.py (Updated - simplified for email verification)
├── utils/
│   ├── auth.py (Updated - removed OAuth)
│   ├── database.py (Updated - removed OAuth)
│   └── email.py (NEW - email sending)
└── requirements.txt (Updated - removed authlib/httpx)
```

### Frontend
```
frontend/
├── src/
│   ├── App.jsx (Updated - email verification route)
│   ├── context/
│   │   └── AuthContext.jsx (Updated - removed OAuth)
│   ├── pages/
│   │   ├── LoginPage.jsx (Updated - removed OAuth buttons)
│   │   ├── SignupPage.jsx (Updated - shows email verification message)
│   │   └── VerifyEmailPage.jsx (NEW)
│   └── components/
│       └── ProtectedRoute.jsx
└── package.json (No changes)
```

---

## 🛠️ Troubleshooting

### Email Not Sending
```
Error: Failed to send email
```

**Solutions:**
1. Check SMTP credentials in `.env`
2. For Gmail: Verify 2FA is enabled and app password is correct
3. Check internet connection
4. Verify SMTP server and port are correct

### Email Verification Token Expired
```
Error: Invalid or expired verification token
```

**Solutions:**
1. Token expires after 24 hours
2. Use the "Resend Verification Email" endpoint to get new token
3. In frontend: Re-signup if link is very old

### Cannot Login After Email Verification
```
Error: Email not verified. Please check your email for the verification link.
```

**Solutions:**
1. Check that verification actually completed
2. Try resending verification email
3. Check MongoDB to verify `email_verified: true`

### JWT Token Expired
The system automatically refreshes tokens. If you get a 401 error:
1. Check `SECRET_KEY` in `.env` is correct
2. Access tokens expire in 30 minutes by default
3. Refresh tokens expire in 7 days by default

### CORS Error
If you see CORS errors:
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution**: Ensure `VITE_API_URL` matches your backend URL in frontend `.env.local`

---

## 🔒 Security Notes

⚠️ **For Production:**

1. **Change SECRET_KEY**
   - Use a strong, random key (at least 32 characters)
   - Use environment variables, never hardcode

2. **Use HTTPS**
   - Always use HTTPS for all endpoints in production
   - Set `FRONTEND_URL=https://yourdomain.com`

3. **Email Configuration**
   - Never commit `.env` file
   - Store credentials in environment variables
   - For production: Use AWS SES, SendGrid, or similar services

4. **Token Expiry**
   - Access token: 30 minutes (default)
   - Refresh token: 7 days (default)
   - Can be adjusted in `backend/utils/auth.py`

5. **Password Requirements**
   - Current: Min 8 characters
   - For production: Add uppercase, lowercase, numbers, special chars

6. **Rate Limiting**
   - Consider adding rate limiting on auth endpoints
   - Prevents brute force attacks

7. **Email Verification**
   - Tokens valid for 24 hours
   - Can be customized in `backend/utils/auth.py`

---

## 📝 Next Steps

1. ✅ Install dependencies
2. ✅ Configure `.env` file with MongoDB and email
3. ✅ Set up MongoDB
4. ✅ Configure email service (Gmail or other SMTP)
5. ✅ Start backend & frontend
6. ✅ Test signup/email verification/login
7. ✅ Test chat with authentication

---

## 📚 Useful Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PyJWT Documentation](https://pyjwt.readthedocs.io/)
- [MongoDB Python Driver](https://pymongo.readthedocs.io/)
- [React Router v6](https://reactrouter.com/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [SMTP Credentials](https://www.google.com/search?q=smtp+settings+gmail)

---

## ❓ Questions or Issues?

If you encounter any problems:
1. Check the troubleshooting section above
2. Review FastAPI docs: `http://localhost:8000/docs`
3. Check browser console for frontend errors
4. Check terminal for backend logs
5. Verify email configuration in `.env`

---

**Happy coding! 🚀**

