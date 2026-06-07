"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Message {
  id: string;
  sender_user_id: string;
  content: string;
  message_type: "text" | "image" | "announcement";
  created_at: string;
  sender?: {
    first_name: string;
    last_name: string;
  };
}

interface TeamChatProps {
  teamId: string;
  isMember: boolean;
}

export function TeamChat({ teamId, isMember }: TeamChatProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Poll for messages every 30 seconds (async approach per plan)
  useEffect(() => {
    if (!isMember) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/teams/${teamId}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 30000); // 30s polling

    return () => clearInterval(interval);
  }, [teamId, isMember]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage, message_type: "text" }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages([...messages, data.message]);
        setNewMessage("");
      }
    } finally {
      setSending(false);
    }
  };

  if (!isMember) {
    return (
      <div className="card p-6 text-center">
        <p className="text-caption">Join the team to access the group chat</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="heading-sm text-white">Team Chat</h3>
        <span className="text-xs text-gray-500">Updates every 30s</span>
      </div>

      {/* Messages */}
      <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-caption">No messages yet</p>
            <p className="text-xs text-gray-500 mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_user_id === session?.user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    isMe
                      ? "bg-volt text-void rounded-br-sm"
                      : "bg-surface text-gray-200 rounded-bl-sm"
                  }`}
                >
                  {!isMe && msg.sender && (
                    <p className="text-xs font-medium text-gray-400 mb-1">
                      {msg.sender.first_name} {msg.sender.last_name}
                    </p>
                  )}
                  <p className="text-sm">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isMe ? "text-void/60" : "text-gray-500"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="input flex-1"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="btn-primary py-2 px-4"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>
          )}
        </button>
      </form>
    </div>
  );
}
