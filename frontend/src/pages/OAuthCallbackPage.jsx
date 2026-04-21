import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const OAuthCallbackPage = ({ provider = 'github' }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithGithub } = useAuth();

  useEffect(() => {
    const authenticate = async () => {
      try {
        if (provider === 'github') {
          const code = searchParams.get('code');
          if (!code) {
            throw new Error('No authorization code received');
          }
          await loginWithGithub(code);
          navigate('/chat');
        }
      } catch (error) {
        console.error(`${provider} callback error:`, error);
        navigate('/login', { state: { error: `${provider} login failed` } });
      }
    };

    authenticate();
  }, [provider, searchParams, loginWithGithub, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-black">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-white text-lg">Completing {provider} login...</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
