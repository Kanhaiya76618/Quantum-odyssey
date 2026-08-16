import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, Key, Cpu } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function EigenPanel({ variant = "sidebar", onQuantumResult }) {
  const [messages, setMessages] = useState([
    {
      id: "init",
      sender: "eigen",
      text: "Greetings, Traveler. I am **Eigen**, your autonomous Quantum AI Agent. Enter your IBM Quantum & OpenAI API keys below to execute real QAOA algorithms on 127-qubit IBM hardware with real live Forex rates!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showKeysModal, setShowKeysModal] = useState(false);

  const [ibmToken, setIbmToken] = useState(() => localStorage.getItem("qo:ibmToken") || "");
  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem("qo:openaiKey") || "");

  const messagesEndRef = useRef(null);

  const saveKeys = () => {
    localStorage.setItem("qo:ibmToken", ibmToken.trim());
    localStorage.setItem("qo:openaiKey", openaiKey.trim());
    setShowKeysModal(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const query = input.trim();
    if (!query || isStreaming) return;

    const userMsg = { id: `user-${Date.now()}`, sender: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const botMsgId = `eigen-${Date.now()}`;
    const botMsg = { id: botMsgId, sender: "eigen", text: "" };
    setMessages((prev) => [...prev, botMsg]);
    setIsStreaming(true);

    try {
      const response = await fetch(`${API}/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          history: [],
          ibm_token: ibmToken.trim() || undefined,
          openai_api_key: openaiKey.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const eventLine = block.match(/^event:\s*(.+)$/m);
          const dataLine = block.match(/^data:\s*(.+)$/m);

          if (dataLine) {
            const eventName = eventLine ? eventLine[1].trim() : "message";
            try {
              const parsed = JSON.parse(dataLine[1]);

              if (eventName === "token" && parsed.token) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botMsgId
                      ? { ...msg, text: msg.text + parsed.token }
                      : msg
                  )
                );
              } else if (eventName === "quantum_result" || parsed.qaoa_circuit_gates) {
                if (onQuantumResult) {
                  onQuantumResult(parsed);
                }
              }
            } catch (err) {
              console.warn("Failed to parse SSE data block:", dataLine[1]);
            }
          }
        }
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? { ...msg, text: `⚠️ Connection Error: ${error.message}` }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#FDFBF7] border-2 border-[#1A1A1A] rounded-2xl p-4 shadow-md flex flex-col h-[560px] max-w-full overflow-hidden text-[#0A0A0A] font-body relative"
    >
      {/* Paper Sub-Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-[#1A1A1A]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] text-[#F2F0EA] flex items-center justify-center font-bold">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-sm text-[#0A0A0A] tracking-wide uppercase">
              EIGEN AGENTIC TRADER
            </h3>
            <p className="text-[10px] font-mono text-[#4A4740]">
              Real Live Forex API · Real IBM Quantum SamplerV2
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowKeysModal(!showKeysModal)}
          className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border border-[#1A1A1A] bg-[#EAE7DF] text-[#0A0A0A] hover:bg-[#DEDACF] cursor-pointer"
        >
          <Key size={12} />
          <span>{ibmToken ? "IBM Connected ⚡" : "API Keys"}</span>
        </button>
      </div>

      {/* API Keys Configuration Drawer / Modal */}
      <AnimatePresence>
        {showKeysModal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#EAE7DF] border-2 border-[#1A1A1A] rounded-xl p-3 mb-3 flex flex-col gap-2 font-mono text-xs overflow-hidden"
          >
            <div className="flex items-center justify-between font-bold text-[#0A0A0A] border-b border-[#1A1A1A] pb-1">
              <span className="flex items-center gap-1.5"><Cpu size={14} /> Real Hardware & LLM Config</span>
              <button onClick={() => setShowKeysModal(false)} className="text-xs font-bold">✕</button>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#0A0A0A] mb-0.5">IBM Quantum Token</label>
              <input
                type="password"
                placeholder="Paste real IBM Quantum Token..."
                value={ibmToken}
                onChange={(e) => setIbmToken(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#1A1A1A] rounded text-xs font-mono font-bold text-[#0A0A0A]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#0A0A0A] mb-0.5">OpenAI API Key (Optional)</label>
              <input
                type="password"
                placeholder="Paste OpenAI API Key (sk-...)..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#FFFFFF] border border-[#1A1A1A] rounded text-xs font-mono font-bold text-[#0A0A0A]"
              />
            </div>

            <button
              onClick={saveKeys}
              className="mt-1 w-full py-1.5 bg-[#1A1A1A] text-[#F2F0EA] font-bold rounded text-xs cursor-pointer"
            >
              Save Credentials
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable Chat History Container */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3.5 mb-3 custom-scrollbar">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2.5 max-w-[88%] ${
              m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border border-[#1A1A1A] ${
                m.sender === "user"
                  ? "bg-[#1A1A1A] text-[#F2F0EA]"
                  : "bg-[#EAE7DF] text-[#0A0A0A]"
              }`}
            >
              {m.sender === "user" ? <User size={14} /> : <Bot size={14} />}
            </div>

            <div
              className={`p-3 rounded-xl border-1.5 border-[#1A1A1A] text-xs font-medium leading-relaxed whitespace-pre-wrap ${
                m.sender === "user"
                  ? "bg-[#EAE7DF] text-[#0A0A0A]"
                  : "bg-[#FDFBF7] text-[#0A0A0A] shadow-xs"
              }`}
            >
              {m.text || (isStreaming && m.sender === "eigen" ? "Thinking..." : "")}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Paper & Ink Input Form */}
      <form onSubmit={handleSend} className="flex items-center gap-2 pt-2 border-t border-[#1A1A1A]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Eigen — e.g. 'Solve arbitrage for $10,000'"
          disabled={isStreaming}
          className="flex-1 px-3.5 py-2.5 bg-[#FFFFFF] border-2 border-[#1A1A1A] rounded-xl text-xs font-mono font-bold text-[#0A0A0A] placeholder-[#4B5563] focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="w-10 h-10 rounded-xl bg-[#1A1A1A] text-[#F2F0EA] border-2 border-[#1A1A1A] flex items-center justify-center font-bold cursor-pointer hover:bg-[#2B2B2B] disabled:opacity-50 transition-all shrink-0"
        >
          <Send size={16} />
        </button>
      </form>
    </motion.div>
  );
}
