import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { householdService } from '../services/household';
import { useHousehold } from '../context/HouseholdContext';

export const Route = createFileRoute('/accept-invitation')({
  component: AcceptInvitationPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || '',
  }),
});

function AcceptInvitationPage() {
  const { token } = useSearch({ from: '/accept-invitation' });
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { switchHousehold, refreshHouseholds } = useHousehold();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate({ to: '/login' });
      return;
    }

    if (!token) {
      setStatus('error');
      setMessage('No invitation token provided');
      return;
    }

    householdService.acceptInvitation(token).then(
      async (household) => {
        setStatus('success');
        setMessage(`Joined "${household.name}" successfully!`);
        await refreshHouseholds();
        switchHousehold(household.id);
        setTimeout(() => navigate({ to: '/scan' }), 2000);
      },
      (err) => {
        setStatus('error');
        setMessage((err as any)?.response?.data?.message || 'Failed to accept invitation');
      },
    );
  }, [token, isAuthenticated, authLoading, navigate, switchHousehold, refreshHouseholds]);

  return (
    <div className="min-h-screen bg-[#F8F9FD] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-black text-blue-600 mb-6">Household Invitation</h1>
        {status === 'loading' && <p className="text-slate-600">Processing invitation...</p>}
        {status === 'success' && <p className="text-green-700">{message}</p>}
        {status === 'error' && <p className="text-red-600">{message}</p>}
      </div>
    </div>
  );
}
