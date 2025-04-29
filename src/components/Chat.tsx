'use client';

import { useEffect, useRef, useState } from "react";
import { ChatMessage, GameState } from "@/types/chat";
import { v4 as uuid } from "uuid";

function initialNarratorMessage(): ChatMessage {
  return {
    id: "msg-0",
    role: "narrator",
    content:
      "Night claws at the high-rise windows. Neon adverts blink \"ORION CARES\" in sickly teal. You dozed off at your desk—until your terminal bursts to life.\n\n\u2588 UNAUTHORIZED SIGNAL \u2588\n…incoming…\n\n`jxu evviuj veh jxu iuuj...` _blinks on the screen—scrambled text that begs to be decoded._",
    createdAt: Date.now(),
  };
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("orion_messages");
      if (stored) return JSON.parse(stored);
    }
    return [initialNarratorMessage()];
  });
  const [gameState, setGameState] = useState<GameState>(() => {
    if (typeof window !== "undefined") {
      const s = localStorage.getItem("orion_state");
      if (s) return JSON.parse(s);
    }
    return { act: 1, cipher1_active: true } as GameState;
  });
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("orion_messages", JSON.stringify(messages));
      localStorage.setItem("orion_state", JSON.stringify(gameState));
    }
  }, [messages, gameState]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = {
      id: uuid(),
      role: "user",
      content: input,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg], state: gameState }),
      });
      const data: { content: string; state?: GameState; error?: string } =
        await res.json();
      if (data.error) throw new Error(data.error);
      const aiMsg: ChatMessage = {
        id: uuid(),
        role: "assistant",
        content: data.content,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      if (data.state) {
        setGameState(data.state);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: uuid(),
          role: "system",
          content: "[Error communicating with AI]",
          createdAt: Date.now(),
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // file upload handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string; // data URL
      const userImgMsg: ChatMessage = {
        id: uuid(),
        role: "user",
        content: "[Uploaded image]",
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userImgMsg]);

      // call analyze_image tool API
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "analyze_image",
          args: { imageUrl: base64 },
        }),
      });
      const data = await res.json();
      const resultText: string = data.result || "[No code found]";

      const aiMsg: ChatMessage = {
        id: uuid(),
        role: "assistant",
        content: resultText,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // update state if NODE17 present
      if (/NODE17/i.test(resultText)) {
        const newState: GameState = {
          ...gameState,
          secure_channel_open: true,
        };
        setGameState(newState);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white p-4">
      <div className="flex-1 overflow-auto space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "text-right"
                : m.role === "narrator"
                ? "italic"
                : "text-left"
            }
          >
            <span
              className={
                m.role === "user"
                  ? "bg-teal-600 inline-block px-3 py-2 rounded-lg"
                  : m.role === "narrator"
                  ? ""
                  : "bg-gray-800 inline-block px-3 py-2 rounded-lg"
              }
            >
              {m.content}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="mt-2 flex gap-2 items-start flex-wrap">
        <textarea
          className="w-full bg-gray-900 text-white p-2 rounded resize-none h-20"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your response..."
        />
        <button
          onClick={sendMessage}
          className="mt-2 bg-teal-700 hover:bg-teal-600 px-4 py-2 rounded"
        >
          Send
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-2 bg-indigo-700 hover:bg-indigo-600 px-4 py-2 rounded"
        >
          Upload Image
        </button>
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              localStorage.removeItem("orion_messages");
              localStorage.removeItem("orion_state");
              window.location.reload();
            }
          }}
          className="mt-2 bg-red-700 hover:bg-red-600 px-4 py-2 rounded"
        >
          Reset Game
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
} 