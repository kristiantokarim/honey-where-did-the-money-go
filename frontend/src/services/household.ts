import { api } from './api';

export interface HouseholdSummary {
  id: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface SentInvitation {
  id: string;
  invitedEmail: string;
  createdAt: string;
  expiresAt: string;
}

export interface ReceivedInvitation {
  id: string;
  token: string;
  householdName: string;
  invitedByName: string;
  createdAt: string;
  expiresAt: string;
}

export const householdService = {
  getHouseholds: async (): Promise<HouseholdSummary[]> => {
    const response = await api.get<HouseholdSummary[]>('/households');
    return response.data;
  },

  createHousehold: async (name: string): Promise<{ id: string; name: string }> => {
    const response = await api.post('/households', { name });
    return response.data;
  },

  getMembers: async (householdId: string): Promise<HouseholdMember[]> => {
    const response = await api.get<HouseholdMember[]>(`/households/${householdId}/members`);
    return response.data;
  },

  inviteMember: async (householdId: string, email: string): Promise<{ message: string }> => {
    const response = await api.post(`/households/${householdId}/invite`, { email });
    return response.data;
  },

  acceptInvitation: async (token: string): Promise<{ id: string; name: string }> => {
    const response = await api.post('/households/accept-invitation', { token });
    return response.data;
  },

  removeMember: async (householdId: string, userId: string): Promise<void> => {
    await api.delete(`/households/${householdId}/members/${userId}`);
  },

  leaveHousehold: async (householdId: string): Promise<void> => {
    await api.post(`/households/${householdId}/leave`);
  },

  getSentInvitations: async (householdId: string): Promise<SentInvitation[]> => {
    const response = await api.get<SentInvitation[]>(`/households/${householdId}/invitations`);
    return response.data;
  },

  cancelInvitation: async (householdId: string, invitationId: string): Promise<void> => {
    await api.delete(`/households/${householdId}/invitations/${invitationId}`);
  },

  getReceivedInvitations: async (): Promise<ReceivedInvitation[]> => {
    const response = await api.get<ReceivedInvitation[]>('/households/my-invitations');
    return response.data;
  },

  declineInvitation: async (invitationId: string): Promise<void> => {
    await api.delete(`/households/my-invitations/${invitationId}`);
  },
};
