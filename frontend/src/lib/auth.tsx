'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getToken,
  setToken,
  clearToken,
  getStoredOrgId,
  setStoredOrgId,
  login as apiLogin,
  register as apiRegister,
  me as apiMe,
  createOrg as apiCreateOrg,
} from '@/lib/api';
import type { User, Membership, Organisation, MeResponse } from '@/lib/types';

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** The authenticated user, or null if not logged in. */
  user: User | null;
  /** All memberships (org + role pairs) for the current user. */
  memberships: Membership[];
  /** Derived list of organisations the user belongs to. */
  orgs: Organisation[];
  /** The currently-selected organisation. */
  currentOrg: Organisation | null;
  /** Switch to a different organisation. */
  setCurrentOrg: (org: Organisation) => void;
  /** True while the initial /me check is in flight. */
  loading: boolean;
  /** Log in with email + password. Stores token & fetches /me. */
  login: (email: string, password: string) => Promise<void>;
  /** Log out. Clears token and resets state. */
  logout: () => void;
  /** Register a new user. Stores token & fetches /me. */
  register: (email: string, password: string, full_name: string) => Promise<void>;
  /** Create a new organisation for the current user. */
  createOrg: (name: string) => Promise<Organisation>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

function membershipToOrg(m: Membership): Organisation {
  return {
    id: m.org_id,
    name: m.org_name,
    slug: m.org_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [currentOrg, setCurrentOrgState] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);

  const selectDefaultOrg = (memList: Membership[], preferredId?: string | null) => {
    if (memList.length === 0) {
      setCurrentOrgState(null);
      return;
    }
    const found = preferredId ? memList.find((m) => m.org_id === preferredId) : null;
    const chosen = found ? membershipToOrg(found) : membershipToOrg(memList[0]);
    setCurrentOrgState(chosen);
    setStoredOrgId(chosen.id);
  };

  const hydrateUser = useCallback(async () => {
    const data: MeResponse = await apiMe();
    setUser(data.user);
    setMemberships(data.memberships);
    const storedId = getStoredOrgId();
    selectDefaultOrg(data.memberships, storedId);
  }, []);

  // Hydrate from /me on mount if a token exists
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiMe()
      .then((data: MeResponse) => {
        setUser(data.user);
        setMemberships(data.memberships);
        const storedId = getStoredOrgId();
        selectDefaultOrg(data.memberships, storedId);
      })
      .catch(() => {
        clearToken();
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const token = await apiLogin(email, password);
      setToken(token.access_token);
      await hydrateUser();
    },
    [hydrateUser]
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setMemberships([]);
    setCurrentOrgState(null);
  }, []);

  const register = useCallback(
    async (email: string, password: string, full_name: string) => {
      const token = await apiRegister(email, password, full_name);
      setToken(token.access_token);
      await hydrateUser();
    },
    [hydrateUser]
  );

  const createOrg = useCallback(
    async (name: string): Promise<Organisation> => {
      const org = await apiCreateOrg(name);
      await hydrateUser();
      setCurrentOrgState(org);
      setStoredOrgId(org.id);
      return org;
    },
    [hydrateUser]
  );

  const setCurrentOrg = useCallback((org: Organisation) => {
    setCurrentOrgState(org);
    setStoredOrgId(org.id);
  }, []);

  const orgs = useMemo(
    () => memberships.map(membershipToOrg),
    [memberships]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      memberships,
      orgs,
      currentOrg,
      setCurrentOrg,
      loading,
      login,
      logout,
      register,
      createOrg,
    }),
    [
      user,
      memberships,
      orgs,
      currentOrg,
      setCurrentOrg,
      loading,
      login,
      logout,
      register,
      createOrg,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
