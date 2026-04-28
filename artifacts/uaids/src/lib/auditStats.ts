import { useSyncExternalStore } from "react";

export type DomainKey = "healthcare" | "loan" | "jobs";

export interface AuditStats {
  healthcare: number;
  loan: number;
  jobs: number;
  total: number;
  lastUsed: string | null;
}

const KEY = "uaids.audit.stats.v1";

const empty = (): AuditStats => ({
  healthcare: 0,
  loan: 0,
  jobs: 0,
  total: 0,
  lastUsed: null,
});

let cached: AuditStats | null = null;

const read = (): AuditStats => {
  if (cached) return cached;
  if (typeof localStorage === "undefined") {
    cached = empty();
    return cached;
  }
  try {
    const raw = localStorage.getItem(KEY);
    cached = raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    cached = empty();
  }
  return cached;
};

const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((l) => l());
};

const persist = (s: AuditStats) => {
  cached = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
  notify();
};

export const recordAudit = (domain: DomainKey, n = 1) => {
  const s = { ...read() };
  s[domain] = (s[domain] ?? 0) + n;
  s.total = s.healthcare + s.loan + s.jobs;
  s.lastUsed = new Date().toISOString();
  persist(s);
};

export const resetAuditStats = () => persist(empty());

export const getAuditStats = (): AuditStats => read();

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cached = null;
      cb();
    }
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
};

export const useAuditStats = (): AuditStats =>
  useSyncExternalStore(subscribe, read, empty);
