// src/pages/ChatPage.jsx
import React, { useEffect, useState } from "react";
import ChannelList from "../components/ChannelList";
import ChatWindow from "../components/ChatWindow";
import VoicePanel from "../components/VoicePanel";
import UserList from "../components/UserList";

const API_BASE = process.env.REACT_APP_API_BASE;

function ChatPage() {
  const [session, setSession] = useState(null);
  const [username, setUsername] = useState(null);
  const [currentChannel, setCurrentChannel] = useState(null);

  // Session prüfen
  useEffect(() => {
    const sessionId = localStorage.getItem("sessionId");
    if (!sessionId) return;

    fetch(`${API_BASE}/api/users/me`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": sessionId
      },
      body: JSON.stringify({})
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setSession(sessionId);
          setUsername(data.user.username);
        } else {
          localStorage.removeItem("sessionId");
        }
      });
  }, []);

  if (!session) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Keine Session gefunden</h2>
        <p>Bitte neu einloggen.</p>
        <a href="/">Zurück zum Login</a>
      </div>
    );
  }

  return (
    <div className="chat-layout">
      <div className="sidebar-left">
        <ChannelList
          currentChannel={currentChannel}
          onSelectChannel={setCurrentChannel}
        />
        <VoicePanel username={username} />
      </div>

      <div className="chat-main">
        <ChatWindow currentChannel={currentChannel} username={username} />
      </div>

      <div className="sidebar-right">
        <UserList />
      </div>
    </div>
  );
}

export default ChatPage;
