import { Client, Session } from "@heroiclabs/nakama-js";

const NAKAMA_HOST = import.meta.env.VITE_NAKAMA_HOST || "localhost";
const NAKAMA_PORT = import.meta.env.VITE_NAKAMA_PORT || "7350";
const NAKAMA_KEY = import.meta.env.VITE_NAKAMA_SERVER_KEY || "defaultserverkey";
const NAKAMA_SSL = import.meta.env.VITE_NAKAMA_USE_SSL === "true";

export const nakamaClient = new Client(NAKAMA_KEY, NAKAMA_HOST, NAKAMA_PORT, NAKAMA_SSL);

let currentSession: Session | null = null;

export function getSession(): Session | null {
  return currentSession;
}

export function setSession(session: Session | null): void {
  currentSession = session;
}

export function isSessionValid(): boolean {
  if (!currentSession) return false;
  return !currentSession.isexpired(Date.now() / 1000);
}
