import { Socket } from "@heroiclabs/nakama-js";
import { nakamaClient, getSession } from "./client";

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  const session = getSession();
  if (!session) throw new Error("Not authenticated");

  socket = nakamaClient.createSocket(
    import.meta.env.VITE_NAKAMA_USE_SSL === "true",
    false
  );
  await socket.connect(session, true);

  socket.ondisconnect = () => {
    console.warn("Nakama socket disconnected");
  };

  socket.onnotification = (notification) => {
    console.log("Notification:", notification.subject, notification.content);
  };

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect(false);
    socket = null;
  }
}
