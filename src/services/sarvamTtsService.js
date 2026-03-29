/**
 * Sarvam Text-to-Speech Service (CORRECTED)
 * Uses the proper Sarvam streaming API with MediaSource
 */

const SARVAM_API_ENDPOINT = "https://api.sarvam.ai/text-to-speech/stream";
const SARVAM_API_KEY = import.meta.env.VITE_SARVAM_API_KEY;

// Speaker names confirmed directly from Sarvam API error response.
// No gender/language labels added — those are not confirmed by the API.
const SARVAM_VOICES = {
  anushka:  "Anushka",
  abhilash: "Abhilash",
  manisha:  "Manisha",
  vidya:    "Vidya",
  arya:     "Arya",
  karun:    "Karun",
  hitesh:   "Hitesh",
  aditya:   "Aditya",
  ritu:     "Ritu",
  priya:    "Priya",
  neha:     "Neha",
  rahul:    "Rahul",
  pooja:    "Pooja",
  rohan:    "Rohan",
  simran:   "Simran",
  kavya:    "Kavya",
  amit:     "Amit",
  dev:      "Dev",
  ishita:   "Ishita",
  shreya:   "Shreya",
  ratan:    "Ratan",
  varun:    "Varun",
  manan:    "Manan",
  sumit:    "Sumit",
  roopa:    "Roopa",
  kabir:    "Kabir",
  aayan:    "Aayan",
  shubh:    "Shubh",
  ashutosh: "Ashutosh",
  advait:   "Advait",
  amelia:   "Amelia",
  sophia:   "Sophia",
  anand:    "Anand",
  tanya:    "Tanya",
  tarun:    "Tarun",
  sunny:    "Sunny",
  mani:     "Mani",
  gokul:    "Gokul",
  vijay:    "Vijay",
  shruti:   "Shruti",
  suhani:   "Suhani",
  mohit:    "Mohit",
  kavitha:  "Kavitha",
  rehan:    "Rehan",
  soham:    "Soham",
  rupali:   "Rupali",
};

/**
 * Stream text to speech from Sarvam API
 * @param {string} text - Text to convert to speech
 * @param {string} speaker - Speaker name (e.g., "shubh", "meera")
 * @param {string} language - Language code (e.g., "hi-IN", "en-IN")
 * @returns {Promise<Audio>} Audio element ready to play
 */
export async function streamSarvamTTS(
  text,
  speaker = "meera",
  language = "en-IN"
) {
  if (!text || !text.trim()) {
    throw new Error("Text cannot be empty");
  }

  if (!SARVAM_API_KEY) {
    throw new Error(
      "Sarvam API key not found. Set VITE_SARVAM_API_KEY in .env"
    );
  }

  console.log("🎤 [Sarvam TTS] Starting stream...");
  console.log(`   Text: "${text.substring(0, 50)}..."`);
  console.log(`   Speaker: ${speaker}`);
  console.log(`   Language: ${language}`);

  const requestPayload = {
    text: text,
    target_language_code: language,
    speaker: speaker,
    model: "bulbul:v3", // Latest Sarvam model
    pace: 1.0,
    speech_sample_rate: 22050,
    output_audio_codec: "mp3",
    enable_preprocessing: true,
  };

  console.log("📦 Request payload:", JSON.stringify(requestPayload, null, 2));

  try {
    const response = await fetch(SARVAM_API_ENDPOINT, {
      method: "POST",
      headers: {
        "api-subscription-key": SARVAM_API_KEY, // Correct header!
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    console.log(`📍 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error:", errorText);
      throw new Error(`Sarvam API error: ${response.status} - ${errorText}`);
    }

    console.log("✅ Stream connected, setting up audio...");

    // Create audio element
    const audio = new Audio();

    // Check if browser supports MediaSource streaming
    if ("MediaSource" in window && MediaSource.isTypeSupported("audio/mpeg")) {
      console.log("🎬 Using MediaSource streaming");
      const mediaSource = new MediaSource();
      audio.src = URL.createObjectURL(mediaSource);

      mediaSource.addEventListener("sourceopen", async () => {
        try {
          const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
          const reader = response.body.getReader();

          let totalBytes = 0;
          let chunkCount = 0;

          // Monitor sourceBuffer errors
          sourceBuffer.addEventListener("error", (e) => {
            console.error("❌ [SourceBuffer Error]:", e);
          });

          sourceBuffer.addEventListener("abort", () => {
            console.warn("⚠️ [SourceBuffer Abort]");
          });

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              console.log(`📡 [Stream Reader] Done. Total chunks received: ${chunkCount}`);

              // CRITICAL: Wait for the last append to complete before calling endOfStream()
              await new Promise((resolve) => {
                if (sourceBuffer.updating) {
                  console.log("⏳ Waiting for last buffer update to complete...");
                  sourceBuffer.addEventListener("updateend", resolve, {
                    once: true,
                  });
                } else {
                  resolve();
                }
              });

              console.log(
                `✅ Stream complete. Total bytes received: ${totalBytes}`
              );
              mediaSource.endOfStream();
              break;
            }

            chunkCount++;
            totalBytes += value.length;

            // Log warning if chunks take too long
            if (chunkCount % 10 === 0) {
              console.log(`📊 [Stream Progress] ${chunkCount} chunks, ${totalBytes} bytes received`);
            }

            // Wait for previous append to complete
            const updateStartTime = Date.now();
            await new Promise((resolve) => {
              if (sourceBuffer.updating) {
                sourceBuffer.addEventListener("updateend", resolve, {
                  once: true,
                });
              } else {
                resolve();
              }
            });
            const updateTime = Date.now() - updateStartTime;

            if (updateTime > 100) {
              console.warn(`⚠️ [Slow Update] Buffer update took ${updateTime}ms`);
            }

            sourceBuffer.appendBuffer(value);
            console.log(`📥 Chunk ${chunkCount}: +${value.length} bytes (Total: ${totalBytes})`);
          }
        } catch (error) {
          console.error("❌ Streaming error:", error);
          try {
            mediaSource.endOfStream("network");
          } catch (endError) {
            console.error("❌ Error calling endOfStream:", endError);
          }
        }
      });
    } else {
      // Fallback: collect all chunks then play
      console.log("⚠️ MediaSource not supported, buffering entire stream...");
      const chunks = [];
      const reader = response.body.getReader();

      let totalBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`✅ Download complete. Total: ${totalBytes} bytes`);
          break;
        }
        chunks.push(value);
        totalBytes += value.length;
        console.log(`📥 Downloaded ${value.length} bytes`);
      }

      const blob = new Blob(chunks, { type: "audio/mpeg" });
      audio.src = URL.createObjectURL(blob);
    }

    return audio;
  } catch (error) {
    console.error("❌ [Sarvam TTS] Error:", error.message);
    throw error;
  }
}

// Track currently playing audio
let currentAudio = null;

/**
 * Stop any currently playing audio
 */
export function stopCurrentAudio() {
  if (currentAudio) {
    try {
      const wasPlaying = !currentAudio.paused;
      const currentTime = currentAudio.currentTime.toFixed(2);
      const duration = currentAudio.duration.toFixed(2);

      if (wasPlaying) {
        console.warn(`🛑 [STOP AUDIO CALLED] Stopped at ${currentTime}s / ${duration}s`);
        // Print stack trace to see who called this
        console.warn("   Called from:", new Error().stack.split('\n')[2]);
      }

      currentAudio.pause();
      currentAudio.currentTime = 0;
      if (currentAudio.src) {
        URL.revokeObjectURL(currentAudio.src);
      }
      currentAudio = null;
      console.log("⏹️ Audio playback stopped");
    } catch (error) {
      console.error("❌ Error stopping audio:", error);
    }
  }
}

/**
 * Play Sarvam TTS audio
 * @param {string} text - Text to speak
 * @param {string} speaker - Speaker name
 * @param {string} language - Language code
 * @returns {Promise<void>}
 */
export async function playSarvamAudio(
  text,
  speaker = "meera",
  language = "en-IN"
) {
  // Stop any previous audio before starting new one
  stopCurrentAudio();

  try {
    console.log(`🎤 [Sarvam TTS] Starting playback for ${text.length} chars using voice: ${speaker}`);
    const audio = await streamSarvamTTS(text, speaker, language);
    currentAudio = audio;

    // Add audio state monitoring
    const stateMonitor = setInterval(() => {
      console.log(`📊 [Audio State] readyState=${audio.readyState} networkState=${audio.networkState} paused=${audio.paused} currentTime=${audio.currentTime.toFixed(2)}s`);
    }, 2000);

    // Wait for audio to be loadable with extended timeout
    await new Promise((resolve, reject) => {
      let resolved = false;

      const onCanPlay = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          console.log("✅ [Sarvam TTS] Audio ready to play");
          resolve();
        }
      };

      const onError = (e) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          console.error("❌ Audio load error:", e.message || e);
          reject(new Error("Audio failed to load"));
        }
      };

      const onLoadStart = () => {
        console.log("📥 [Sarvam TTS] Loading started...");
      };

      const onProgress = () => {
        if (audio.buffered.length > 0) {
          const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
          const duration = audio.duration || "unknown";
          console.log(`📦 [Sarvam TTS] Buffered: ${bufferedEnd.toFixed(2)}s / ${duration === "unknown" ? "?" : duration.toFixed(2)}s`);
        }
      };

      const cleanup = () => {
        audio.removeEventListener("canplay", onCanPlay);
        audio.removeEventListener("error", onError);
        audio.removeEventListener("loadstart", onLoadStart);
        audio.removeEventListener("progress", onProgress);
        clearTimeout(timeout);
        clearInterval(stateMonitor);
      };

      // Increased timeout to 60 seconds for large responses
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          console.error("❌ [Sarvam TTS] Audio loading timeout after 60s");
          reject(new Error("Audio loading timeout"));
        }
      }, 60000);

      audio.addEventListener("canplay", onCanPlay, { once: true });
      audio.addEventListener("error", onError);
      audio.addEventListener("loadstart", onLoadStart);
      audio.addEventListener("progress", onProgress);
    });

    console.log("🔊 Playing audio...");

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      await playPromise;
    }

    // Wait for playback to complete
    return new Promise((resolve) => {
      let finished = false;

      const onEnded = () => {
        if (!finished) {
          finished = true;
          cleanup();
          console.log("✅ Playback finished naturally");
          resolve();
        }
      };

      const onError = (e) => {
        if (!finished) {
          finished = true;
          cleanup();
          console.error("❌ Playback error:", e.message || e);
          resolve();
        }
      };

      const onPause = () => {
        if (!finished && audio.currentTime < audio.duration) {
          console.warn(`⚠️ [HALT DETECTED] Audio paused unexpectedly at ${audio.currentTime.toFixed(2)}s / ${audio.duration.toFixed(2)}s`);
          console.warn(`   readyState=${audio.readyState}, networkState=${audio.networkState}`);
          // Try to resume
          audio.play().catch(e => console.error("   Could not resume:", e.message));
        }
      };

      const onSuspend = () => {
        console.warn("⚠️ [Suspend] Audio loading suspended");
      };

      const onStalled = () => {
        console.warn("⚠️ [Stalled] Audio playback stalled - buffering?");
      };

      const cleanup = () => {
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("error", onError);
        audio.removeEventListener("pause", onPause);
        audio.removeEventListener("suspend", onSuspend);
        audio.removeEventListener("stalled", onStalled);
        clearTimeout(safetyTimeout);
        clearInterval(stateMonitor);
        if (currentAudio === audio) {
          currentAudio = null;
        }
        if (audio.src) {
          URL.revokeObjectURL(audio.src);
        }
      };

      // IMPORTANT: Wait for 'ended' event instead of estimating duration
      // Only use safety timeout (10 minutes max) in case audio never ends due to error
      const safetyTimeout = setTimeout(() => {
        if (!finished) {
          finished = true;
          cleanup();
          console.warn("⚠️ Safety timeout (10 min) reached, stopping audio");
          audio.pause();
          resolve();
        }
      }, 10 * 60 * 1000); // 10 minute safety timeout

      audio.addEventListener("ended", onEnded, { once: true });
      audio.addEventListener("error", onError);
      audio.addEventListener("pause", onPause);
      audio.addEventListener("suspend", onSuspend);
      audio.addEventListener("stalled", onStalled);
    });
  } catch (error) {
    stopCurrentAudio();
    console.error("❌ [Sarvam TTS] Playback failed:", error.message);
    throw error;
  }
}

/**
 * Validate Sarvam API connection
 * @returns {Promise<boolean>}
 */
export async function validateSarvamConnection() {
  try {
    console.log("🧪 Testing Sarvam API connection...");

    const response = await fetch(SARVAM_API_ENDPOINT, {
      method: "POST",
      headers: {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "Test",
        target_language_code: "en-IN",
        speaker: "priya", // Changed to valid voice
        model: "bulbul:v3",
      }),
    });

    const isValid = response.ok;
    console.log(
      isValid ? "✅ Sarvam API connection successful" : "❌ Connection failed"
    );
    console.log(`   Status: ${response.status}`);

    return isValid;
  } catch (error) {
    console.error("❌ Sarvam connection error:", error.message);
    return false;
  }
}

/**
 * Get available voices
 * @returns {Object} Voice options
 */
export function getAvailableVoices() {
  return SARVAM_VOICES;
}

/**
 * Get voice display name
 * @param {string} voiceId - Voice ID
 * @returns {string} Display name
 */
export function getVoiceDisplayName(voiceId) {
  return SARVAM_VOICES[voiceId] || voiceId;
}
