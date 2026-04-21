import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, ArrowRight, CheckCircle, ExternalLink } from 'lucide-react';

const SignupPage = () => {
  const [fullName, setFullName]             = useState('');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [success, setSuccess]               = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [verificationLink, setVerificationLink] = useState('');
  const [emailSent, setEmailSent]           = useState(true);
  const navigate = useNavigate();
  const { signup } = useAuth();

  const validateForm = () => {
    if (!fullName.trim()) { setError('Full name is required'); return false; }
    if (!email.includes('@')) { setError('Valid email is required'); return false; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return false; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return false; }
    return true;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      const result = await signup(email, fullName, password);
      const sent = result?.email_sent !== false;
      setEmailSent(sent);
      setRegisteredEmail(email);
      setVerificationLink(result?.verification_link || '');
      setSuccess(true);
      // Only auto-redirect when email was actually delivered
      if (sent) setTimeout(() => navigate('/login'), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 shadow-2xl text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Account Created!</h2>

            {emailSent ? (
              <div className="bg-blue-500/20 border border-blue-400 rounded-lg p-4 mb-6 text-left">
                <p className="text-white mb-1">
                  ✉️ Verification email sent to <strong>{registeredEmail}</strong>
                </p>
                <p className="text-gray-300 text-sm">
                  Check your inbox and click the link to activate your account.
                </p>
              </div>
            ) : (
              <div className="bg-yellow-500/20 border border-yellow-400 rounded-lg p-4 mb-6 text-left space-y-3">
                <p className="text-yellow-200 font-semibold">
                  ⚠️ Email delivery unavailable
                </p>
                <p className="text-gray-200 text-sm">
                  Use this link to verify your account right now:
                </p>
                {verificationLink ? (
                  <a
                    href={verificationLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-semibold transition justify-center"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Click here to verify your email
                  </a>
                ) : (
                  <p className="text-red-300 text-sm">No verification link available — contact support.</p>
                )}
                <p className="text-xs text-gray-400">
                  You must verify before you can log in.
                </p>
              </div>
            )}

            {emailSent && (
              <p className="text-gray-400 mb-4 text-sm">Redirecting to login in 4 seconds…</p>
            )}

            <Link
              to="/login"
              className="inline-block text-purple-400 hover:text-purple-300 font-semibold text-sm"
            >
              Go to Login →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">JEE-NEET AI</h1>
          <p className="text-purple-300">Your AI-Powered Tutor</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Create Account</h2>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-6 text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-purple-400" />
                <input
                  type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="John Doe" required
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-purple-400" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-purple-400" />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 characters" required
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-purple-400" />
                <input
                  type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading ? 'Creating Account…' : 'Sign Up'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="text-center text-gray-400 mt-6 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
