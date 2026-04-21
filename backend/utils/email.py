import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

# Email Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "your_email@gmail.com")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD", "your_app_password")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


def send_verification_email(recipient_email: str, verification_token: str) -> bool:
    """Send email verification link to user"""
    try:
        verification_link = f"{FRONTEND_URL}/verify-email?token={verification_token}&email={recipient_email}"
        
        subject = "Verify Your JEE-NEET AI Account"
        
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1e40af;">Welcome to JEE-NEET AI! 🎓</h2>
                    
                    <p>Thank you for signing up. Please verify your email address to activate your account.</p>
                    
                    <div style="margin: 30px 0;">
                        <a href="{verification_link}" 
                           style="background-color: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Verify Email
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        Or copy and paste this link in your browser:<br>
                        <code style="background-color: #f0f0f0; padding: 10px; display: block; margin-top: 10px; word-break: break-all;">
                            {verification_link}
                        </code>
                    </p>
                    
                    <p style="color: #999; font-size: 12px; margin-top: 40px;">
                        This link will expire in 24 hours.
                    </p>
                    
                    <p style="color: #999; font-size: 12px;">
                        If you didn't create an account, please ignore this email.
                    </p>
                </div>
            </body>
        </html>
        """
        
        # Create email message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = SENDER_EMAIL
        message["To"] = recipient_email
        
        # Attach HTML part
        message.attach(MIMEText(html_body, "html"))
        
        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, recipient_email, message.as_string())
        
        print(f"✅ Verification email sent to {recipient_email}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        return False


def send_password_reset_email(recipient_email: str, reset_token: str) -> bool:
    """Send password reset email to user"""
    try:
        reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}&email={recipient_email}"
        
        subject = "Reset Your JEE-NEET AI Password"
        
        html_body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1e40af;">Password Reset Request</h2>
                    
                    <p>We received a request to reset your password. Click the link below to create a new password.</p>
                    
                    <div style="margin: 30px 0;">
                        <a href="{reset_link}" 
                           style="background-color: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p style="color: #999; font-size: 12px; margin-top: 40px;">
                        This link will expire in 1 hour.
                    </p>
                    
                    <p style="color: #999; font-size: 12px;">
                        If you didn't request this, please ignore this email.
                    </p>
                </div>
            </body>
        </html>
        """
        
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = SENDER_EMAIL
        message["To"] = recipient_email
        
        message.attach(MIMEText(html_body, "html"))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, recipient_email, message.as_string())
        
        print(f"✅ Password reset email sent to {recipient_email}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        return False
