import { Session } from "@heroiclabs/nakama-js";
import { nakamaClient, setSession, getSession } from "./client";

const SESSION_KEY = "umbra_nakama_session";
const REFRESH_KEY = "umbra_nakama_refresh";

export async function authenticateEmail(
  email: string,
  password: string,
  create: boolean = true
): Promise<Session> {
  const session = await nakamaClient.authenticateEmail(email, password, create);
  setSession(session);
  saveSessionToStorage(session);
  return session;
}

export async function authenticateDevice(deviceId: string): Promise<Session> {
  const session = await nakamaClient.authenticateDevice(deviceId, true);
  setSession(session);
  saveSessionToStorage(session);
  return session;
}

export async function refreshSession(): Promise<Session | null> {
  const session = getSession();
  if (!session) return null;
  try {
    const refreshed = await nakamaClient.sessionRefresh(session);
    setSession(refreshed);
    saveSessionToStorage(refreshed);
    return refreshed;
  } catch {
    logout();
    return null;
  }
}

export function logout(): void {
  setSession(null);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function restoreSession(): Session | null {
  const token = localStorage.getItem(SESSION_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!token || !refreshToken) return null;
  const session = Session.restore(token, refreshToken);
  if (session.isexpired(Date.now() / 1000)) {
    logout();
    return null;
  }
  setSession(session);
  return session;
}

function saveSessionToStorage(session: Session): void {
  localStorage.setItem(SESSION_KEY, session.token);
  localStorage.setItem(REFRESH_KEY, session.refresh_token);
}
