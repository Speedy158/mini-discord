// src/components/UserList.jsx
import React, { useEffect, useState } from "react";
import socket from "../socket";
import { useOnlineUsers } from "../context/OnlineContext";
import { useVoiceState } from "../context/VoiceContext";

const API_BASE = process.env.REACT_APP_API_BASE;

function UserAvatar({ user }) {
  if (user.avatarType === "generated") {
    return (
      <div
        className="avatar"
        style={{
          backgroundColor: user.avatarColor || "#888",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          fontSize: "12px",
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          flexShrink: 0
        }}
      >
        {user.avatarLetter || "?"}
      </div>
    );
  }

  if (user.avatarType === "upload" && user.avatarImage) {
    return (
      <img
        src={user.avatarImage}
        alt="avatar"
        className="avatar"
        style={{ width: "24px", height: "24px", borderRadius: "50%" }}
      />
    );
  }

  return (
    <div
      className="avatar"
      style={{
        backgroundColor: "#666",
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: "12px"
      }}
    >
      ?
    </div>
  );
}

function UserList() {
  const [users, setUsers] = useState([]);
  const onlineUsernames = useOnlineUsers();
  const voiceState = useVoiceState();
  const username = localStorage.getItem("username");

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch(`${API_BASE}/api/users/all-public`);
        const data = await res.json();
        if (data.ok) {
          setUsers(data.users);
        }
      } catch (err) {
        console.error("Fehler beim Laden der User:", err);
      }
    }

    loadUsers();

    const handleUserListUpdate = () => {
      loadUsers();
    };

    socket.on("userListUpdated", handleUserListUpdate);
    return () => {
      socket.off("userListUpdated", handleUserListUpdate);
    };
  }, []);

  function getVoiceChannel(userId) {
    for (const [channel, members] of Object.entries(voiceState)) {
      if (members.some((m) => m.id === userId)) {
        return channel;
      }
    }
    return null;
  }

  return (
    <div className="user-list">
      <h3>Online</h3>
      {users
        .filter((u) => onlineUsernames.includes(u.username))
        .map((u) => {
          const channel = getVoiceChannel(u.id);
          const isSelf = u.username === username;
          return (
            <div
              key={u.id}
              className={"user-online" + (isSelf ? " user-self" : "")}
            >
              <UserAvatar user={u} />
              <span>{u.username}</span>
              {channel && (
                <span className="user-voice-status">in {channel}</span>
              )}
            </div>
          );
        })}
    </div>
  );
}

export default UserList;
