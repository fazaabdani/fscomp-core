"use client";

import { Loader2, Send, Sparkles } from "lucide-react";
import { useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

const TOOL_LABELS: Record<string, string> = {
  search_units: "mencari data unit...",
  get_unit_detail: "mengambil detail unit...",
  get_sales_summary: "menghitung rekap keuangan...",
  get_batch_status: "mengecek status batch..."
};

const SUGGESTIONS = [
  "Unit Lenovo RAM 8GB yang ready ada berapa?",
  "Omzet bulan ini berapa?",
  "Batch apa saja yang mendekati jatuh tempo?"
];

export function AssistantChat({ currentUserRole }: { currentUserRole: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastTools, setLastTools] = useState<string[]>([]);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  async function sendMessage(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLastTools([]);
    setLoading(true);

    try {
      const response = await fetch("/api/ai-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages })
      });
      const json = await response.json();

      if (!response.ok) {
        setError(json?.error || "Asisten sedang bermasalah, coba lagi.");
        return;
      }

      setLastTools(Array.isArray(json.toolsUsed) ? json.toolsUsed : []);
      setMessages((current) => [...current, { role: "assistant", content: json.reply }]);
    } catch {
      setError("Tidak bisa menghubungi asisten, cek koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }

  return (
    <section className="panel assistantChatPanel">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Chat</p>
          <h2>Asisten data Core</h2>
        </div>
        <Sparkles size={22} />
      </div>

      <div className="assistantChatList" ref={listRef}>
        {messages.length === 0 ? (
          <div className="emptyState">
            <p>Belum ada percakapan. Coba tanya salah satu ini:</p>
            <div className="assistantSuggestions">
              {SUGGESTIONS.filter((suggestion) => currentUserRole === "admin" || !suggestion.toLowerCase().includes("omzet")).map((suggestion) => (
                <button className="secondaryButton" key={suggestion} onClick={() => sendMessage(suggestion)} type="button">
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div className={`assistantBubble ${message.role}`} key={index}>
              <strong>{message.role === "user" ? "Kamu" : "Asisten"}</strong>
              <p>{message.content}</p>
            </div>
          ))
        )}
        {loading ? (
          <div className="assistantBubble assistant assistantLoading">
            <strong>Asisten</strong>
            <p><Loader2 className="spinIcon" size={14} /> {lastTools.length > 0 ? TOOL_LABELS[lastTools[lastTools.length - 1]] ?? "memproses..." : "berpikir..."}</p>
          </div>
        ) : null}
      </div>

      {error ? <div className="infoBox dangerInfo">{error}</div> : null}

      <form
        className="assistantInputRow"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage(input);
        }}
      >
        <input
          disabled={loading}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Tanya soal stok, unit, batch, atau keuangan..."
          type="text"
          value={input}
        />
        <button className="primaryButton" disabled={loading || !input.trim()} type="submit">
          {loading ? <Loader2 className="spinIcon" size={16} /> : <Send size={16} />}
        </button>
      </form>
    </section>
  );
}
