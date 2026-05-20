"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useState } from "react";

export default function Chat() {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<FileList | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800">
        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-zinc-950 font-bold text-sm">
          H
        </div>
        <div>
          <h1 className="text-lg font-semibold">Helios</h1>
          <p className="text-xs text-zinc-500">Your solar energy assistant</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-zinc-600">
            <p>Tell Helios what you&apos;re looking for.</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-amber-600 text-white"
                  : "bg-zinc-800 text-zinc-100"
              }`}
            >
              {message.parts.map((part, i) => {
                if (part.type === "text") {
                  return (
                    <div key={`${message.id}-${i}`} className="whitespace-pre-wrap">
                      {part.text}
                    </div>
                  );
                }
                if (
                  part.type === "file" &&
                  part.mediaType?.startsWith("image/")
                ) {
                  return (
                    <img
                      key={`${message.id}-${i}`}
                      src={part.url}
                      alt="Uploaded"
                      className="max-w-full rounded-lg mt-2"
                    />
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}

        {status === "streaming" && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-2xl px-4 py-3 text-zinc-400">
              <span className="animate-pulse">...</span>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim() || files) {
            sendMessage({
              text: input,
              files,
            });
            setInput("");
            setFiles(undefined);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
          }
        }}
        className="border-t border-zinc-800 px-6 py-4"
      >
        <div className="flex items-center gap-3">
          <label className="cursor-pointer text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) setFiles(e.target.files);
              }}
              ref={fileInputRef}
            />
          </label>

          {files && (
            <span className="text-xs text-amber-500">
              {files[0]?.name}
            </span>
          )}

          <input
            className="flex-1 bg-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 border border-zinc-700 focus:border-amber-500 focus:outline-none transition-colors"
            value={input}
            placeholder="Ask about solar for your balcony..."
            onChange={(e) => setInput(e.target.value)}
            disabled={status !== "ready"}
          />

          <button
            type="submit"
            disabled={status !== "ready" || (!input.trim() && !files)}
            className="bg-amber-500 text-zinc-950 rounded-xl px-4 py-3 font-medium hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
