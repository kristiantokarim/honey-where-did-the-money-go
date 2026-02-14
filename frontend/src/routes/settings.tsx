import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { useToast } from '../context/ToastContext';
import { householdService } from '../services/household';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, logout } = useAuth();
  const {
    households,
    activeHouseholdId,
    members,
    sentInvitations,
    receivedInvitations,
    switchHousehold,
    refreshHouseholds,
    refreshMembers,
    refreshSentInvitations,
    refreshReceivedInvitations,
    createHousehold,
  } = useHousehold();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', confirmLabel: '', onConfirm: () => {} });

  const currentRole = households.find((h) => h.id === activeHouseholdId)?.role;
  const isOwner = currentRole === 'owner';
  const ownerCount = members.filter((m) => m.role === 'owner').length;

  const handleLogout = async () => {
    await logout();
    navigate({ to: '/login' });
  };

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHouseholdName.trim()) return;
    setCreateLoading(true);
    try {
      await createHousehold(newHouseholdName.trim());
      showToast('Household created', 'success');
      setNewHouseholdName('');
      setShowCreateForm(false);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Something went wrong', 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeHouseholdId) return;
    setInviteLoading(true);
    try {
      await householdService.inviteMember(activeHouseholdId, inviteEmail.trim());
      showToast('Invitation sent', 'success');
      setInviteEmail('');
      await refreshSentInvitations();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Something went wrong', 'error');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!activeHouseholdId) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Member',
      message: `Are you sure you want to remove ${memberName} from this household?`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await householdService.removeMember(activeHouseholdId, memberId);
          await refreshMembers();
          showToast('Member removed', 'success');
        } catch (err: any) {
          showToast(err?.response?.data?.message || 'Something went wrong', 'error');
        }
      },
    });
  };

  const handleLeave = () => {
    if (!activeHouseholdId) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Leave Household',
      message: 'Are you sure you want to leave this household? Your transactions will remain.',
      confirmLabel: 'Leave',
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await householdService.leaveHousehold(activeHouseholdId);
          await refreshHouseholds();
          showToast('Left household', 'success');
        } catch (err: any) {
          showToast(err?.response?.data?.message || 'Something went wrong', 'error');
        }
      },
    });
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!activeHouseholdId) return;
    setCancellingId(invitationId);
    try {
      await householdService.cancelInvitation(activeHouseholdId, invitationId);
      await refreshSentInvitations();
      showToast('Invitation cancelled', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Something went wrong', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const handleAcceptInvitation = async (invitation: { id: string; token: string }) => {
    setAcceptingId(invitation.id);
    try {
      await householdService.acceptInvitation(invitation.token);
      await Promise.all([refreshHouseholds(), refreshReceivedInvitations()]);
      showToast('Joined household', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Something went wrong', 'error');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    setDecliningId(invitationId);
    try {
      await householdService.declineInvitation(invitationId);
      await refreshReceivedInvitations();
      showToast('Invitation declined', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Something went wrong', 'error');
    } finally {
      setDecliningId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] p-4 pb-24 max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-slate-800 mb-4">Settings</h2>

      {/* Account */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
        <h3 className="text-base font-bold text-slate-800 mb-3">Account</h3>
        <p className="font-semibold text-slate-800">{user?.name}</p>
        <p className="text-sm text-slate-500 mb-4">{user?.email}</p>
        <button
          onClick={handleLogout}
          className="w-full bg-red-500 text-white py-3 rounded-xl font-bold min-h-[44px]"
        >
          Log Out
        </button>
      </div>

      {/* Household */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
        <h3 className="text-base font-bold text-slate-800 mb-3">Household</h3>

        {households.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Active Household</label>
            <select
              value={activeHouseholdId || ''}
              onChange={(e) => switchHousehold(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontSize: '16px' }}
            >
              {households.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
        )}

        {households.length === 1 && (
          <p className="text-sm text-slate-600 mb-4">{households[0].name}</p>
        )}

        {!showCreateForm ? (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full bg-slate-100 text-slate-700 py-2 rounded-lg font-bold min-h-[44px]"
          >
            Create New Household
          </button>
        ) : (
          <form onSubmit={handleCreateHousehold} className="flex gap-2">
            <input
              type="text"
              value={newHouseholdName}
              onChange={(e) => setNewHouseholdName(e.target.value)}
              placeholder="Household name"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ fontSize: '16px' }}
              autoFocus
            />
            <button
              type="submit"
              disabled={createLoading || !newHouseholdName.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50 min-h-[44px]"
            >
              {createLoading ? '...' : 'Create'}
            </button>
          </form>
        )}
      </div>

      {/* Members */}
      {activeHouseholdId && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <h3 className="text-base font-bold text-slate-800 mb-3">Members</h3>

          <div className="space-y-3 mb-4">
            {members.map((member) => (
              <div key={member.userId} className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800">{member.user.name}</span>
                  <span className="text-sm text-slate-500 ml-2">{member.user.email}</span>
                  {member.role === 'owner' && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                      Owner
                    </span>
                  )}
                </div>
                {isOwner && member.userId !== user?.id && (
                  <button
                    onClick={() => handleRemoveMember(member.userId, member.user.name)}
                    className="text-slate-400 hover:text-red-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {isOwner && (
            <form onSubmit={handleInvite} className="flex gap-2 mb-4">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Invite by email"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ fontSize: '16px' }}
              />
              <button
                type="submit"
                disabled={inviteLoading || !inviteEmail.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50 min-h-[44px]"
              >
                {inviteLoading ? '...' : 'Invite'}
              </button>
            </form>
          )}

          {isOwner && sentInvitations.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Pending Invitations</p>
              <div className="space-y-2">
                {sentInvitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-sm font-medium text-slate-800">{inv.invitedEmail}</span>
                      <span className="text-xs text-slate-500 ml-2">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCancelInvitation(inv.id)}
                      disabled={cancellingId === inv.id}
                      className="text-slate-400 hover:text-red-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleLeave}
            disabled={isOwner && ownerCount <= 1}
            className="w-full bg-red-500 text-white py-3 rounded-xl font-bold min-h-[44px] disabled:opacity-50"
          >
            Leave Household
          </button>
          {isOwner && ownerCount <= 1 && (
            <p className="text-xs text-slate-500 mt-1 text-center">Transfer ownership before leaving</p>
          )}
        </div>
      )}

      {receivedInvitations.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <h3 className="text-base font-bold text-slate-800 mb-3">Invitations</h3>
          <div className="space-y-3">
            {receivedInvitations.map((inv) => (
              <div key={inv.id} className="bg-slate-50 rounded-lg p-3">
                <p className="font-medium text-slate-800">{inv.householdName}</p>
                <p className="text-sm text-slate-500 mb-2">
                  Invited by {inv.invitedByName}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptInvitation(inv)}
                    disabled={acceptingId === inv.id}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50 min-h-[44px]"
                  >
                    {acceptingId === inv.id ? '...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleDeclineInvitation(inv.id)}
                    disabled={decliningId === inv.id}
                    className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg font-bold text-sm disabled:opacity-50 min-h-[44px]"
                  >
                    {decliningId === inv.id ? '...' : 'Decline'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
