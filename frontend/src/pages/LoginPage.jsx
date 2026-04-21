import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, RefreshCw, CheckCircle, ExternalLink } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const LoginPage = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [notVerified, setNotVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendResult, setResendResult]   = useState(null); // { link?, sent }
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setNotVerified(false);
    setResendResult(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/chat');
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('not verified') || msg.toLowerCase().includes('verify')) {
        setNotVerified(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendResult(null);
    try {
      const res = await fetch(`${API}/api/auth/resend-verification-email?email=${encodeURIComponent(email)}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      setResendResult({ sent: data.email_sent, link: data.verification_link });
    } catch (err) {
      setResendResult({ sent: false, link: null, error: err.message });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">JEE-NEET AI</h1>
          <p className="text-purple-300">Your AI-Powered Tutor</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">Welcome Back</h2>

          {/* Generic error */}
          {error && !notVerified && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-5 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Email not verified — helpful panel */}
          {notVerified && (
            <div className="bg-yellow-500/10 border border-yellow-500 rounded-xl p-4 mb-5 space-y-3">
              <p className="text-yellow-300 font-semibold text-sm">
                ⚠️ Email not verified
              </p>
              <p className="text-gray-300 text-sm">
                You need to verify <strong>{email}</strong> before logging in.
              </p>

              {!resendResult && (
                <button
                  onClick={handleResend}
                  disabled={resendLoading || !email}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 rounded-lg text-sm font-semibold text-white transition w-full justify-center"
                >
                  <RefreshCw className={`w-4 h-4 ${resendLoading ? 'animate-spin' : ''}`} />
                  {resendLoading ? 'Sending…' : 'Resend Verification Email'}
                </button>
              )}

              {resendResult && resendResult.sent && (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Verification email sent! Check your inbox.
                </div>
              )}

              {resendResult && !resendResult.sent && resendResult.link && (
                <div className="space-y-2">
                  <p className="text-gray-300 text-xs">Email delivery unavailable. Use this link:</p>
                  <a
                    href={resendResult.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold text-white transition w-full justify-center"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Verify Email Now
                  </a>
                </div>
              )}

              {resendResult?.error && (
                <p className="text-red-300 text-xs">{resendResult.error}</p>
              )}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
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
                  placeholder="••••••••" required
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading ? 'Logging in…' : 'Login'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="text-center text-gray-400 mt-6 text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-purple-400 hover:text-purple-300 font-semibold">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
