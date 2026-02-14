import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import {
  householdService,
  type HouseholdSummary,
  type HouseholdMember,
  type SentInvitation,
  type ReceivedInvitation,
} from '../services/household';
import { useAuth } from './AuthContext';
import { setApiHouseholdProvider } from '../services/api';

interface HouseholdContextValue {
  households: HouseholdSummary[];
  activeHouseholdId: string | null;
  members: HouseholdMember[];
  sentInvitations: SentInvitation[];
  receivedInvitations: ReceivedInvitation[];
  isLoading: boolean;
  switchHousehold: (id: string) => void;
  refreshHouseholds: () => Promise<void>;
  refreshMembers: () => Promise<void>;
  refreshSentInvitations: () => Promise<void>;
  refreshReceivedInvitations: () => Promise<void>;
  createHousehold: (name: string) => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

const ACTIVE_HOUSEHOLD_KEY = 'activeHouseholdId';

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [households, setHouseholds] = useState<HouseholdSummary[]>([]);
  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [sentInvitations, setSentInvitations] = useState<SentInvitation[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<ReceivedInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshHouseholds = useCallback(async () => {
    try {
      const data = await householdService.getHouseholds();
      setHouseholds(data);
      return data;
    } catch (error) {
      console.error('Failed to fetch households:', error);
      return [];
    }
  }, []);

  const refreshMembers = useCallback(async () => {
    if (!activeHouseholdId) return;
    try {
      const data = await householdService.getMembers(activeHouseholdId);
      setMembers(data);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  }, [activeHouseholdId]);

  const refreshSentInvitations = useCallback(async () => {
    if (!activeHouseholdId) return;
    const activeRole = households.find((h) => h.id === activeHouseholdId)?.role;
    if (activeRole !== 'owner') {
      setSentInvitations([]);
      return;
    }
    try {
      const data = await householdService.getSentInvitations(activeHouseholdId);
      setSentInvitations(data);
    } catch (error) {
      console.error('Failed to fetch sent invitations:', error);
    }
  }, [activeHouseholdId, households]);

  const refreshReceivedInvitations = useCallback(async () => {
    try {
      const data = await householdService.getReceivedInvitations();
      setReceivedInvitations(data);
    } catch (error) {
      console.error('Failed to fetch received invitations:', error);
    }
  }, []);

  const switchHousehold = useCallback((id: string) => {
    setActiveHouseholdId(id);
    localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, id);
  }, []);

  const createHousehold = useCallback(async (name: string) => {
    const created = await householdService.createHousehold(name);
    const data = await refreshHouseholds();
    if (data.length > 0) {
      switchHousehold(created.id);
    }
  }, [refreshHouseholds, switchHousehold]);

  const activeHouseholdIdRef = useRef<string | null>(null);
  activeHouseholdIdRef.current = activeHouseholdId;

  // Wire up API household header
  useEffect(() => {
    setApiHouseholdProvider(() => activeHouseholdIdRef.current);
  }, []);

  // Load households when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setHouseholds([]);
      setActiveHouseholdId(null);
      setMembers([]);
      setSentInvitations([]);
      setReceivedInvitations([]);
      return;
    }

    setIsLoading(true);
    refreshHouseholds().then((data) => {
      const savedId = localStorage.getItem(ACTIVE_HOUSEHOLD_KEY);
      const validSaved = data.find((h: HouseholdSummary) => h.id === savedId);
      if (validSaved) {
        setActiveHouseholdId(savedId);
      } else if (data.length > 0) {
        setActiveHouseholdId(data[0].id);
        localStorage.setItem(ACTIVE_HOUSEHOLD_KEY, data[0].id);
      }
      setIsLoading(false);
    });
  }, [isAuthenticated, refreshHouseholds]);

  // Refresh members when active household changes
  useEffect(() => {
    if (activeHouseholdId) {
      refreshMembers();
    }
  }, [activeHouseholdId, refreshMembers]);

  // Refresh sent invitations when active household changes (owner only)
  useEffect(() => {
    if (activeHouseholdId) {
      refreshSentInvitations();
    }
  }, [activeHouseholdId, refreshSentInvitations]);

  // Refresh received invitations when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshReceivedInvitations();
    }
  }, [isAuthenticated, refreshReceivedInvitations]);

  return (
    <HouseholdContext.Provider
      value={{
        households,
        activeHouseholdId,
        members,
        sentInvitations,
        receivedInvitations,
        isLoading,
        switchHousehold,
        refreshHouseholds,
        refreshMembers,
        refreshSentInvitations,
        refreshReceivedInvitations,
        createHousehold,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
}
