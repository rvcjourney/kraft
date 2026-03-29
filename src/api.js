const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3000";

export async function createSession() {
  try {
    const response = await fetch(`${API_URL}/session/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (err) {
    console.error("Error creating session:", err);
    throw err;
  }
}

export async function getSession(sessionId) {
  try {
    const response = await fetch(`${API_URL}/session/${sessionId}`);
    return await response.json();
  } catch (err) {
    console.error("Error getting session:", err);
    throw err;
  }
}

export async function getRealtimeToken() {
  try {
    const response = await fetch(`${API_URL}/realtime-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    return await response.json();
  } catch (err) {
    console.error("Error getting token:", err);
    throw err;
  }
}

export function connectWebSocket() {
  return new WebSocket(WS_URL);
}
