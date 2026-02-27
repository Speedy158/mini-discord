import React, { useEffect, useState } from "react";
import socket from "../socket";

const API_BASE = "http://localhost:3000";

function ChatWindow({ currentChannel, username }) {
  const [messages, setMessages] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");

  const sessionId = localStorage.getItem("sessionId");

  useEffect(() => {
    if (currentChannel) loadMessages(currentChannel);
  }, [currentChannel]);

  useEffect(() => {
    function handleNewMessage(msg) {
      if (msg.channel === currentChannel) {
        setMessages((prev) => [...prev, msg]);
      }
    }

    function handleMessageEdited(msg) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, text: msg.text } : m))
      );
    }

    function handleMessageDeleted({ messageId }) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }

    socket.on("newMessage", handleNewMessage);
    socket.on("messageEdited", handleMessageEdited);
    socket.on("messageDeleted", handleMessageDeleted);

    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageEdited", handleMessageEdited);
      socket.off("messageDeleted", handleMessageDeleted);
      window.removeEventListener("click", handleClick);
    };
  }, [currentChannel]);

  async function loadMessages(channel) {
    try {
      const res = await fetch(
        `${API_BASE}/api/messages/list/${encodeURIComponent(channel)}`,
        {
          headers: { "x-session-id": sessionId }
        }
      );
      const data = await res.json();
      if (data.ok) setMessages(data.messages);
    } catch (err) {
      console.error("Fehler beim Laden der Nachrichten:", err);
    }
  }

  function handleSend(text) {
    if (!currentChannel || !username || !text.trim()) return;
    socket.emit("sendMessage", {
      channel: currentChannel,
      user: username,
      text: text.trim()
    });
  }

  async function handleDelete(messageId) {
    try {
      const res = await fetch(`${API_BASE}/api/messages/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId
        },
        body: JSON.stringify({ messageId })
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "Nachricht konnte nicht gelöscht werden.");
      }
    } catch (err) {
      console.error("Fehler beim Löschen der Nachricht:", err);
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editingMessageId || !editingText.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/messages/edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId
        },
        body: JSON.stringify({
          messageId: editingMessageId,
          newText: editingText.trim()
        })
      });

      const data = await res.json();
      if (data.ok) {
        setEditingMessageId(null);
        setEditingText("");
      } else {
        alert(data.error || "Bearbeiten fehlgeschlagen.");
      }
    } catch (err) {
      console.error("Fehler beim Bearbeiten:", err);
    }
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        {currentChannel ? `#${currentChannel}` : "Kein Channel ausgewählt"}
      </div>

      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="chat-message"
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({
                x: e.pageX,
                y: e.pageY,
                message: msg
              });
            }}
          >
            <div className="chat-message-meta">
              <span className="chat-message-user">{msg.user}</span>
              <span className="chat-message-time">
                {new Date(msg.time).toLocaleTimeString()}
              </span>
            </div>

            <div className="chat-message-text">
              {editingMessageId === msg.id ? (
                <form onSubmit={handleEditSubmit}>
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={() => setEditingMessageId(null)}
                    autoFocus
                  />
                </form>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
      </div>

      {contextMenu && (
        <div
          className="chat-message-context-menu"
          style={{
            position: "absolute",
            top: contextMenu.y,
            left: contextMenu.x,
            background: "#2f3136",
            border: "1px solid #444",
            borderRadius: "4px",
            padding: "4px 0",
            zIndex: 1000,
            color: "white"
          }}
        >
          <div
            onClick={() => {
              setEditingMessageId(contextMenu.message.id);
              setEditingText(contextMenu.message.text);
              setContextMenu(null);
            }}
            style={{ padding: "6px 12px", cursor: "pointer" }}
          >
            Bearbeiten
          </div>
          <div
            onClick={() => {
              handleDelete(contextMenu.message.id);
              setContextMenu(null);
            }}
            style={{ padding: "6px 12px", cursor: "pointer" }}
          >
            Löschen
          </div>
        </div>
      )}

      <ChatInput onSend={handleSend} />
    </div>
  );
}

function ChatInput({ onSend }) {
  const [value, setValue] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value);
    setValue("");
  }

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Nachricht eingeben..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit">Senden</button>
    </form>
  );
}

export default ChatWindow;
