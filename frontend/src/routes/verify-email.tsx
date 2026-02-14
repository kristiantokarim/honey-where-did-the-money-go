import { createFileRoute, Link, useSearch } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { authService } from '../services/auth';

export const Route = createFileRoute('/verify-email')({
  component: VerifyEmailPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || '',
  }),
});

function VerifyEmailPage() {
  const { token } = useSearch({ from: '/verify-email' });
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    authService.verifyEmail(token).then(
      (result) => {
        setStatus('success');
        setMessage(result.message);
      },
      (err) => {
        setStatus('error');
        setMessage((err as any)?.response?.data?.message || 'Verification failed');
      },
    );
  }, [token]);

  return (
    <div className="min-h-screen bg-[#F8F9FD] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-black text-blue-600 mb-6">Email Verification</h1>
        {status === 'loading' && <p className="text-slate-600">Verifying...</p>}
        {status === 'success' && (
          <>
            <p className="text-green-700 mb-4">{message}</p>
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Go to login
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-red-600 mb-4">{message}</p>
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Go to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
