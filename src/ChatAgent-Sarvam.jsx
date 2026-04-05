import { useState, useEffect, useRef } from "react";
import {
  playSarvamAudio,
  validateSarvamConnection,
  getAvailableVoices,
  stopCurrentAudio,
} from "./services/sarvamTtsService";
import "./ChatAgent.css";

const STAGE_STEPS = [
  { key: "greeting",      label: "Greeting",      icon: "👋" },
  { key: "discovery",     label: "Discovery",      icon: "🔍" },
  { key: "qualification", label: "Qualification",  icon: "✅" },
  { key: "presentation",  label: "Presentation",   icon: "📊" },
  { key: "closing",       label: "Closing",        icon: "🎯" },
];

export default function ChatAgent() {
  const [sessionId, setSessionId]         = useState(null);
  const [connected, setConnected]         = useState(false);
  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [stage, setStage]                 = useState("greeting");
  const [listening, setListening]         = useState(false);
  const [transcript, setTranscript]       = useState("");
  const [speaking, setSpeaking]           = useState(false);
  const [error, setError]                 = useState("");
  const [sarvamReady, setSarvamReady]     = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("priya");
  const [availableVoices, setAvailableVoices] = useState({});

  const ws               = useRef(null);
  const messagesEnd      = useRef(null);
  const recognition      = useRef(null);
  const selectedVoiceRef = useRef(selectedVoice); // always holds latest voice

  // Keep ref in sync whenever user changes voice
  useEffect(() => { selectedVoiceRef.current = selectedVoice; }, [selectedVoice]);

  /* ─── WebSocket ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const sid    = crypto.randomUUID?.() ??
      ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
    const wsUrl  = import.meta.env.VITE_WS_URL || "ws://localhost:3000";
    const socket = new WebSocket(wsUrl);
    let   init   = false;

    setSessionId(sid);

    socket.onopen = () => {
      setConnected(true);
      setError("");
      socket.send(JSON.stringify({ type: "init", sessionId: sid }));
    };

    socket.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data);

        if (msg.type === "init_response") {
          if (init) return;
          init = true;
          setStage(msg.stage);
        } else if (msg.type === "stream") {
          setMessages(prev => {
            const updated  = [...prev];
            const last     = updated.length - 1;
            const isAgent  = last >= 0 && updated[last].role === "agent";
            if (isAgent) updated[last] = { ...updated[last], content: updated[last].content + msg.content };
            else         updated.push({ role: "agent", content: msg.content, ts: Date.now() });
            return updated;
          });
        } else if (msg.type === "stream_end") {
          setLoading(false);
          setStage(msg.stage);
          if (msg.message?.trim()) playSarvamVoice(msg.message);
          else {
            setTimeout(() => {
              setMessages(prev => {
                const last = [...prev].reverse().find(m => m.role === "agent");
                if (last?.content) playSarvamVoice(last.content);
                return prev;
              });
            }, 200);
          }
        } else if (msg.type === "error") {
          setLoading(false);
          setError(msg.message || "An error occurred");
        }
      } catch { setError("Failed to process message"); }
    };

    socket.onclose = () => { setConnected(false); setError("Connection lost. Refresh to reconnect."); };
    socket.onerror = ()  => setError("Connection error");

    ws.current = socket;
    return () => { stopCurrentAudio(); if (socket.readyState === WebSocket.OPEN) socket.close(); };
  }, []);

  /* ─── Speech Recognition ────────────────────────────────────────── */
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = "en-US";

    rec.onstart  = () => { setListening(true);  setTranscript(""); };
    rec.onend    = () =>   setListening(false);
    rec.onerror  = () =>   setListening(false);
    rec.onresult = e => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        e.results[i].isFinal ? (final += t + " ") : (interim += t);
      }
      setTranscript(final || interim);
    };

    recognition.current = rec;
  }, []);

  /* ─── Sarvam + Voices ───────────────────────────────────────────── */
  useEffect(() => {
    setAvailableVoices(getAvailableVoices());
    validateSarvamConnection().then(setSarvamReady).catch(() => setSarvamReady(false));
  }, []);

  /* ─── Auto-scroll ───────────────────────────────────────────────── */
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  /* ─── Voice playback ────────────────────────────────────────────── */
  const playSarvamVoice = async text => {
    setSpeaking(true);
    try {
      const voice   = selectedVoiceRef.current;           // always fresh value
      const langMap = { shubh: "hi-IN", shruti: "hi-IN" };
      await playSarvamAudio(text, voice, langMap[voice] || "en-IN");
    } catch (e) {
      setError(`Voice error: ${e.message}`);
    } finally {
      setSpeaking(false);
    }
  };

  /* ─── Mic controls ──────────────────────────────────────────────── */
  const startListening = () => {
    if (!recognition.current || listening) return;
    stopCurrentAudio();
    try { recognition.current.start(); } catch { /* already started */ }
  };

  const stopListening = () => {
    if (!recognition.current || !listening) return;
    setTimeout(() => {
      recognition.current.stop();
      setTimeout(() => {
        if (transcript?.trim()) { sendMessage(transcript.trim()); setTranscript(""); }
      }, 500);
    }, 300);
  };

  /* ─── Send message ──────────────────────────────────────────────── */
  const sendMessage = (content = input) => {
    if (!content.trim() || !connected || loading) return;
    stopCurrentAudio();
    setMessages(prev => [...prev, { role: "user", content, ts: Date.now() }]);
    setInput("");
    setLoading(true);
    setError("");
    ws.current.send(JSON.stringify({ type: "message", content }));
  };

  const handleKeyDown = e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  /* ─── Helpers ───────────────────────────────────────────────────── */
  const currentStageIdx = STAGE_STEPS.findIndex(s => s.key === stage);
  const formatTime = ts => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const inputValue  = input || transcript;

  const renderMessageContent = (content) => {
    if (!content) return null;

    const lines = content.split(/\r?\n/);
    const elements = [];
    let bullets = [];
    let numbered = [];
    let key = 0;

    const flushBullets = () => {
      if (bullets.length) {
        elements.push(<ul key={`ul-${key++}`} className="ca-fb-list">{bullets}</ul>);
        bullets = [];
      }
    };
    const flushNumbered = () => {
      if (numbered.length) {
        elements.push(<ol key={`ol-${key++}`} className="ca-fb-ol">{numbered}</ol>);
        numbered = [];
      }
    };

    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line === "---") {
        flushBullets(); flushNumbered();
        if (line === "---") elements.push(<hr key={`hr-${key++}`} className="ca-fb-hr" />);
        continue;
      }
      if (line.startsWith("- ")) {
        flushNumbered();
        bullets.push(<li key={key++}>{line.slice(2)}</li>);
        continue;
      }
      const numMatch = line.match(/^(\d+)\.\s+(.+)/);
      if (numMatch) {
        flushBullets();
        numbered.push(<li key={key++}>{numMatch[2]}</li>);
        continue;
      }
      flushBullets(); flushNumbered();
      if (line.endsWith(":") && line.length < 60) {
        elements.push(<p key={key++} className="ca-fb-section">{line}</p>);
      } else {
        elements.push(<p key={key++} className="ca-fb-text">{line}</p>);
      }
    }
    flushBullets(); flushNumbered();
    return <div className="ca-feedback">{elements}</div>;
  };

  return (
    <div className="ca-root">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className="ca-sidebar">
        <div className="ca-brand">
          <div className="ca-brand-icon">S</div>
          <div>
            <p className="ca-brand-name">Sales Agent</p>
            <p className="ca-brand-sub">Powered by Sarvam AI</p>
          </div>
        </div>

        <nav className="ca-pipeline">
          <p className="ca-pipeline-label">PIPELINE STAGE</p>
          {STAGE_STEPS.map((step, i) => (
            <div
              key={step.key}
              className={`ca-step ${
                i < currentStageIdx  ? "ca-step-done"    :
                i === currentStageIdx ? "ca-step-active" : "ca-step-pending"
              }`}
            >
              <div className="ca-step-track">
                <div className="ca-step-dot">
                  {i < currentStageIdx ? "✓" : step.icon}
                </div>
                {i < STAGE_STEPS.length - 1 && <div className="ca-step-line" />}
              </div>
              <div className="ca-step-info">
                <p className="ca-step-name">{step.label}</p>
                {i === currentStageIdx && <p className="ca-step-active-label">Current</p>}
              </div>
            </div>
          ))}
        </nav>

        <div className="ca-sidebar-footer">
          <div className={`ca-conn-pill ${connected ? "conn-ok" : "conn-off"}`}>
            <span className="ca-conn-dot" />
            {connected ? "Server Online" : "Disconnected"}
          </div>
          <div className={`ca-conn-pill ${sarvamReady ? "conn-ok" : "conn-off"}`}>
            <span className="ca-conn-dot" />
            {sarvamReady ? "Sarvam Ready" : "Sarvam Offline"}
          </div>
          {sessionId && (
            <p className="ca-session-id">
              <span>Session</span>
              <code>{sessionId.slice(0, 8)}</code>
            </p>
          )}
        </div>
      </aside>

      {/* ── Chat Panel ──────────────────────────────────────────────── */}
      <main className="ca-panel">

        {/* Top Bar */}
        <header className="ca-topbar">
          <div className="ca-topbar-left">
            <div className="ca-agent-avatar">AI</div>
            <div>
              <p className="ca-agent-name">AI Sales Assistant</p>
              <p className="ca-agent-status">
                {speaking   ? <span className="ca-wave-label">🔊 Speaking…</span>  :
                 listening  ? <span className="ca-rec-label">🔴 Listening…</span> :
                 loading    ? "Thinking…" : "Online"}
              </p>
            </div>
          </div>

          {/* Voice Selector */}
          <div className="ca-voice-control">
            <span className="ca-voice-label">Voice</span>
            <select
              value={selectedVoice}
              onChange={e => setSelectedVoice(e.target.value)}
              className="ca-voice-select"
            >
              {Object.entries(availableVoices).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
        </header>

        {/* Messages */}
        <section className="ca-messages">
          {messages.length === 0 && (
            <div className="ca-empty">
              <div className="ca-empty-orb">💬</div>
              <h2>Ready to assist say <span className="ca-chip" style={{color:"blue",textBox:"cap"}}>"Hi"</span></h2>
              <p>Start a conversation using text or voice</p>
              <div className="ca-chips">
                <span className="ca-chip">🎤 Voice enabled</span>
                <span className="ca-chip">🔊 TTS streaming</span>
                <span className="ca-chip">🧠 AI powered</span>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`ca-msg ${msg.role === "user" ? "ca-msg-user" : "ca-msg-agent"}`}>
              {msg.role === "agent" && (
                <div className="ca-msg-avatar ca-msg-avatar-agent">AI</div>
              )}
              <div className="ca-msg-body">
                <div className="ca-bubble">{renderMessageContent(msg.content)}</div>
                {msg.ts && <span className="ca-msg-time">{formatTime(msg.ts)}</span>}
              </div>
              {msg.role === "user" && (
                <div className="ca-msg-avatar ca-msg-avatar-user">You</div>
              )}
            </div>
          ))}

          {loading && (
            <div className="ca-msg ca-msg-agent">
              <div className="ca-msg-avatar ca-msg-avatar-agent">AI</div>
              <div className="ca-typing">
                <span /><span /><span />
              </div>
            </div>
          )}

          {error && (
            <div className="ca-alert">
              <span>⚠️ {error}</span>
              <button onClick={() => setError("")}>✕</button>
            </div>
          )}

          <div ref={messagesEnd} />
        </section>

        {/* Input Bar */}
        <footer className="ca-inputbar">
          {listening && (
            <div className="ca-listening-strip">
              <span className="ca-rec-dot" />
              <span>Listening… {transcript && `"${transcript.slice(0, 60)}"`}</span>
            </div>
          )}

          <div className="ca-input-row">
            <textarea
              rows={1}
              value={inputValue}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message or press the mic…"
              disabled={!connected || loading || listening}
              className="ca-textarea"
            />

            {/* Mic Button */}
            {listening ? (
              <button
                type="button"
                onClick={stopListening}
                className="ca-icon-btn ca-btn-stop"
                title="Stop & send"
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={startListening}
                disabled={!connected || loading}
                className="ca-icon-btn ca-btn-mic"
                title="Start voice input"
              >
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm-7 9h2a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V21h3v2H8v-2h3v-2.08A7 7 0 0 1 5 12z"/></svg>
              </button>
            )}

            {/* Send Button */}
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={!connected || loading || !inputValue.trim()}
              className="ca-send-btn"
              title="Send message"
            >
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        </footer>

      </main>
    </div>
  );
}
