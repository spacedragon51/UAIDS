import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

const LOCAL_KEY = "uaids-audit-logs";

function loadLocal(): AuditLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as AuditLog[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(logs: AuditLog[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(logs.slice(0, 200)));
}

export async function logAuditEvent(
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, unknown>,
) {
  const newLog: AuditLog = {
    id: crypto.randomUUID(),
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
    created_at: new Date().toISOString(),
  };

  const cached = loadLocal();
  saveLocal([newLog, ...cached]);
  window.dispatchEvent(new CustomEvent("audit-log-added", { detail: newLog }));

  const uid = auth.currentUser?.uid;
  if (uid) {
    try {
      await addDoc(collection(db, "users", uid, "auditLogs"), {
        action,
        entity_type: entityType,
        entity_id: entityId ?? null,
        details: details ?? null,
        created_at: serverTimestamp(),
      });
    } catch (err) {
      console.warn("[audit] firestore write failed, kept local copy:", err);
    }
  }
}

export function getAuditLogs(): AuditLog[] {
  return loadLocal();
}

function tsToIso(t: unknown): string {
  if (t instanceof Timestamp) return t.toDate().toISOString();
  if (typeof t === "string") return t;
  return new Date().toISOString();
}

export function useAuditLogs(max = 50) {
  const [logs, setLogs] = useState<AuditLog[]>(loadLocal());

  useEffect(() => {
    const handler = () => setLogs(loadLocal());
    window.addEventListener("audit-log-added", handler);
    return () => window.removeEventListener("audit-log-added", handler);
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(
      collection(db, "users", uid, "auditLogs"),
      orderBy("created_at", "desc"),
      limit(max),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const remote: AuditLog[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            action: String(data.action ?? ""),
            entity_type: String(data.entity_type ?? ""),
            entity_id: (data.entity_id as string | undefined) ?? undefined,
            details: (data.details as Record<string, unknown> | undefined) ?? undefined,
            created_at: tsToIso(data.created_at),
          };
        });
        if (remote.length) {
          saveLocal(remote);
          setLogs(remote);
        }
      },
      (err) => console.warn("[audit] firestore subscribe failed:", err),
    );
    return () => unsub();
  }, [max]);

  return logs;
}

export async function fetchAuditLogsOnce(max = 100): Promise<AuditLog[]> {
  const uid = auth.currentUser?.uid;
  if (!uid) return loadLocal();
  try {
    const q = query(
      collection(db, "users", uid, "auditLogs"),
      orderBy("created_at", "desc"),
      limit(max),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        action: String(data.action ?? ""),
        entity_type: String(data.entity_type ?? ""),
        entity_id: (data.entity_id as string | undefined) ?? undefined,
        details: (data.details as Record<string, unknown> | undefined) ?? undefined,
        created_at: tsToIso(data.created_at),
      };
    });
  } catch {
    return loadLocal();
  }
}

export type { AuditLog };
