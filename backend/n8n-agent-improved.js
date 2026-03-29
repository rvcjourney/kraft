// N8N Sales Agent Integration
// Handles webhook communication with n8n voice agent platform

// const N8N_API_ENDPOINT = "https://n8n.b2botix.ai/webhook/voiceagent";
const N8N_API_ENDPOINT = "https://n8n.b2botix.ai/webhook-test/voiceagentsales4";
const REQUEST_TIMEOUT_MS = 30000;
const HISTORY_CONTEXT_SIZE = 5;

// Response field priority for parsing n8n responses
const RESPONSE_FIELD_PRIORITY = [
  "response",
  "message",
  "text",
  "output",
  "result",
  "body",
];

/**
 * Validates and normalizes user input
 * @throws {Error} if validation fails
 */
function validateInput(userMessage, conversationHistory) {
  if (typeof userMessage !== "string" || !userMessage.trim()) {
    throw new Error("User message must be a non-empty string");
  }
  if (!Array.isArray(conversationHistory)) {
    throw new Error("Conversation history must be an array");
  }
}

/**
 * Creates an abort controller with timeout
 * @returns {AbortController}
 */
function createTimeoutController() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return { controller, timeoutId };
}

/**
 * Extracts agent response from various n8n response formats
 * @param {*} data - Parsed response data
 * @returns {string|null}
 */
function extractResponse(data) {
  // Handle string response
  if (typeof data === "string") {
    return data;
  }

  // Handle object with priority field mapping
  if (typeof data === "object" && data !== null) {
    for (const field of RESPONSE_FIELD_PRIORITY) {
      if (data[field]) {
        return typeof data[field] === "string"
          ? data[field]
          : JSON.stringify(data[field]);
      }
    }
  }

  // Fallback: return entire object as string
  return typeof data === "object" ? JSON.stringify(data) : null;
}

/**
 * Sends message to n8n webhook and retrieves response
 * @param {string} userMessage - User's input message
 * @param {Array} conversationHistory - Previous conversation messages
 * @returns {Promise<string>} Agent response
 * @throws {Error} If request fails or response is empty
 */
export async function generateN8nResponse(sessionId, userMessage, conversationHistory) {
  // Validate inputs
  validateInput(userMessage, conversationHistory);

  const { controller, timeoutId } = createTimeoutController();

  try {
    // Prepare request payload
    const requestBody = {
      session_id: sessionId,
      message: userMessage,
      history: conversationHistory.slice(-HISTORY_CONTEXT_SIZE),
    };

    // Send request with proper timeout handling
    const response = await fetch(N8N_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    // Handle error responses
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `N8N API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    // Parse response (handle both JSON and plain text)
    const responseText = await response.text();
    let agentResponse;

    try {
      const data = JSON.parse(responseText);
      agentResponse = extractResponse(data);
    } catch {
      // Response is plain text
      agentResponse = responseText;
    }

    // Validate response
    if (!agentResponse || agentResponse.trim() === "") {
      throw new Error("N8N returned empty response");
    }

    return agentResponse;
  } catch (error) {
    // Re-throw with context
    if (error.name === "AbortError") {
      throw new Error(`N8N request timeout after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw new Error(`N8N integration failed: ${error.message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

// Sales funnel stage progression map
const STAGE_KEYWORDS = {
  discovery: ["yes", "okay", "sure", "loan", "home", "property", "amount"],
  qualification: ["yes", "okay", "sure", "income", "salary", "employed", "work"],
  presentation: ["sounds good", "tell me more", "how much", "interest", "rate"],
  closing: ["apply", "interested", "proceed", "next", "schedule"],
};

const STAGE_TRANSITIONS = {
  greeting: "discovery",
  discovery: "qualification",
  qualification: "presentation",
  presentation: "closing",
  closing: "closing", // Terminal state
};

/**
 * Determines if message contains progression keywords
 * @param {string} message - User message to analyze
 * @param {string[]} keywords - Keywords to match
 * @returns {boolean}
 */
function shouldProgress(message, keywords) {
  const normalized = message.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

/**
 * Determines next conversation stage based on current stage and user input
 * @param {string} currentStage - Current conversation stage
 * @param {string} userMessage - User's message
 * @returns {string} Next stage or current stage if no progression
 */
export function determineNextStage(currentStage, userMessage) {
  // Validate inputs
  if (typeof currentStage !== "string" || typeof userMessage !== "string") {
    return currentStage;
  }

  // Get keywords for current stage
  const keywords = STAGE_KEYWORDS[currentStage];
  if (!keywords) {
    return currentStage;
  }

  // Check if user message indicates progression
  if (shouldProgress(userMessage, keywords)) {
    return STAGE_TRANSITIONS[currentStage] || currentStage;
  }

  return currentStage;
}
