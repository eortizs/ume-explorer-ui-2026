'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { isTenantId, isUserId, isUuid } from '@/lib/session';

const STORAGE_KEY = 'ume-explorer.session.v1';
const BOOKMARKS_KEY = 'ume-explorer.bookmarks.v1';

export interface SessionCreds {
  tenantId: string;
  userId: string;
}

interface TenantUserContextValue {
  creds: SessionCreds | null;
  setCreds: (next: SessionCreds) => void;
  clear: () => void;
  bookmarks: string[];
  addBookmark: (id: string) => void;
  removeBookmark: (id: string) => void;
}

const TenantUserContext = createContext<TenantUserContextValue | null>(null);

function readStoredCreds(): SessionCreds | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionCreds>;
    if (
      typeof parsed.tenantId === 'string' &&
      typeof parsed.userId === 'string' &&
      isTenantId(parsed.tenantId) &&
      isUserId(parsed.userId)
    ) {
      return { tenantId: parsed.tenantId.trim(), userId: parsed.userId.trim() };
    }
  } catch {
    /* swallow */
  }
  return null;
}

function readStoredBookmarks(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === 'string' && isUserId(v));
    }
  } catch {
    /* swallow */
  }
  return [];
}

export function TenantUserProvider({ children }: { children: ReactNode }) {
  const [creds, setCredsState] = useState<SessionCreds | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useEffect(() => {
    setCredsState(readStoredCreds());
    setBookmarks(readStoredBookmarks());
  }, []);

  const setCreds = useCallback((next: SessionCreds) => {
    setCredsState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  const clear = useCallback(() => {
    setCredsState(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const addBookmark = useCallback((id: string) => {
    if (!isUuid(id)) return;
    setBookmarks((prev) => {
      if (prev.includes(id)) return prev;
      const next = [id, ...prev].slice(0, 20);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((x) => x !== id);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const value = useMemo<TenantUserContextValue>(
    () => ({ creds, setCreds, clear, bookmarks, addBookmark, removeBookmark }),
    [creds, setCreds, clear, bookmarks, addBookmark, removeBookmark],
  );

  return <TenantUserContext.Provider value={value}>{children}</TenantUserContext.Provider>;
}

export function useTenantUser(): TenantUserContextValue {
  const ctx = useContext(TenantUserContext);
  if (!ctx) {
    throw new Error('useTenantUser must be used within TenantUserProvider');
  }
  return ctx;
}