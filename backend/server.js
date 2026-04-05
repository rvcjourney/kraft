import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables FIRST
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

// Now import other modules
import express from "express";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
// import { generateN8nResponse, determineNextStage } from "./n8n-agent.js";
import { generateN8nResponse, determineNextStage } from "./n8n-agent-improved.js";
// Keep salesman.js for reference - not using it now
// import { generateSalesmanResponse, determineNextStage } from "./salesman.js";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// In-memory session storage
const sessions = {};

// Session management functions
function getOrCreateSession(sessionId) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      sessionId,
      messages: [],
      stage: "greeting",
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
    };
  }
  return sessions[sessionId];
}

function addMessage(sessionId, role, content) {
  const session = getOrCreateSession(sessionId);
  session.messages.push({ role, content });
  session.lastMessageAt = Date.now();

  // Keep only last 15 messages for context
  if (session.messages.length > 15) {
    session.messages = session.messages.slice(-15);
  }

  return session;
}

function updateStage(sessionId, newStage) {
  const session = getOrCreateSession(sessionId);
  if (newStage !== session.stage) {
    console.log(`[${sessionId}] Stage transition: ${session.stage} → ${newStage}`);
    session.stage = newStage;
  }
  return session;
}

// Auto-cleanup sessions older than 30 minutes
setInterval(() => {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;

  Object.keys(sessions).forEach((sessionId) => {
    if (now - sessions[sessionId].createdAt > thirtyMinutes) {
      console.log(`🗑️ Cleaned up session: ${sessionId}`);
      delete sessions[sessionId];
    }
  });
}, 10 * 60 * 1000); // Run every 10 minutes

// REST endpoints
app.get("/health", (req, res) => {
  res.json({ status: "ok", sessions: Object.keys(sessions).length });
});

// Test N8N Connection
app.post("/test-n8n", async (req, res) => {
  try {
    console.log("🧪 Testing N8N connection...");
    const testMessage = "Hi, I need a copper busbar solution";
    const response = await generateN8nResponse("test-session", testMessage, []);
    console.log("✅ N8N test successful:", response);
    res.json({
      success: true,
      message: "N8N connection working!",
      response: response.substring(0, 100) + "..."
    });
  } catch (error) {
    console.error("❌ N8N test failed:", error.message);
    res.status(500).json({
      success: false,
      message: "N8N connection failed",
      error: error.message
    });
  }
});

app.post("/session/create", (req, res) => {
  const sessionId = uuidv4();
  const session = getOrCreateSession(sessionId);
  res.json({ sessionId, stage: session.stage });
});

app.get("/session/:sessionId", (req, res) => {
  const session = sessions[req.params.sessionId];
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json(session);
});

// WebSocket handling
wss.on("connection", (ws) => {
  let sessionId = null;

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data);

      if (message.type === "init") {
        sessionId = message.sessionId || uuidv4();
        const session = getOrCreateSession(sessionId);

        console.log(`✅ Session initialized: ${sessionId}`);
        ws.send(
          JSON.stringify({
            type: "init_response",
            sessionId,
            stage: session.stage,
          })
        );

        return;
      }

      if (message.type === "message" && sessionId) {
        const userMessage = message.content;
        const session = getOrCreateSession(sessionId);

        console.log(`[${sessionId}] 👤 User: ${userMessage}`);
        console.log(`[${sessionId}] 🔌 Current stage: ${session.stage}`);

        // Add user message to history
        addMessage(sessionId, "user", userMessage);

        let fullResponse;
        try {
          // Generate response from N8N
          console.log(`[${sessionId}] 🌐 Calling N8N webhook...`);
          fullResponse = await generateN8nResponse(
            sessionId,
            userMessage,
            session.messages
          );

          console.log(`[${sessionId}] ✅ N8N Response received, length: ${fullResponse.length}`);
        } catch (n8nError) {
          console.error(`[${sessionId}] ❌ N8N Connection Error:`, n8nError.message);
          ws.send(
            JSON.stringify({
              type: "error",
              message: `N8N Connection Error: ${n8nError.message}. Please check if N8N webhook is running.`,
            })
          );
          return;
        }

        // Send response as stream chunks for consistent frontend behavior
        // Optimized: Larger chunks and shorter delays for faster streaming
        const chunkSize = 100; // Increased from 50 to 100 chars
        let chunkCount = 0;

        for (let i = 0; i < fullResponse.length; i += chunkSize) {
          const chunk = fullResponse.substring(i, i + chunkSize);
          chunkCount++;
          console.log(`[${sessionId}] Chunk ${chunkCount} (${chunk.length} chars): "${chunk.substring(0, 40)}..."`);
          ws.send(
            JSON.stringify({
              type: "stream",
              content: chunk,
            })
          );
          // Reduced delay from 50ms to 25ms for faster streaming
          await new Promise(resolve => setTimeout(resolve, 25));
        }

        console.log(`[${sessionId}] Total chunks sent: ${chunkCount}, Total length: ${fullResponse.length} chars`);

        // Add assistant response to history
        addMessage(sessionId, "assistant", fullResponse);

        // Determine next stage
        const nextStage = determineNextStage(session.stage, userMessage);
        updateStage(sessionId, nextStage);

        // Send completion signal
        ws.send(
          JSON.stringify({
            type: "stream_end",
            stage: session.stage,
            message: fullResponse,
          })
        );

        console.log(`[${sessionId}] Agent: ${fullResponse}`);
      }
    } catch (error) {
      console.error("WebSocket error:", error.message);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Error processing message: " + error.message,
        })
      );
    }
  });

  ws.on("close", () => {
    if (sessionId) {
      console.log(`❌ Session disconnected: ${sessionId}`);
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error.message);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}`);
});
