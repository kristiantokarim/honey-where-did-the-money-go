import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  if (isAuthenticated) {
    navigate({ to: '/scan' });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setShowResendVerification(false);
    setResendMessage('');
    try {
      await login(email, password);
      navigate({ to: '/scan' });
    } catch (err) {
      const serverMessage = (err as any)?.response?.data?.message;
      const message = serverMessage || (err instanceof Error ? err.message : 'Login failed');
      setError(message);
      if (message === 'Please verify your email') {
        setShowResendVerification(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-black text-blue-600 text-center mb-6">Welcome Back</h1>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
            {error}
            {showResendVerification && (
              <button
                type="button"
                disabled={resendLoading}
                onClick={async () => {
                  setResendLoading(true);
                  setResendMessage('');
                  try {
                    const result = await authService.resendVerification(email);
                    setResendMessage(result.message);
                  } catch {
                    setResendMessage('Failed to resend. Please try again later.');
                  } finally {
                    setResendLoading(false);
                  }
                }}
                className="block mt-2 text-blue-600 hover:underline disabled:opacity-50"
              >
                {resendLoading ? 'Sending...' : 'Resend verification email'}
              </button>
            )}
            {resendMessage && (
              <p className="mt-1 text-green-600">{resendMessage}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-500 space-y-2">
          <div>
            <Link to="/forgot-password" className="text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <div>
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
