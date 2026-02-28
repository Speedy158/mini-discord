import React, { useEffect, useState } from "react";
import socket from "../socket";

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
  const [online, setOnline] = useState([]);
  const [voiceState, setVoiceState] = useState({});
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

    const handleOnline = ({ userId }) => {
      setOnline((prev) => [...new Set([...prev, userId])]);
    };

    const handleOffline = ({ userId }) => {
      setOnline((prev) => prev.filter((id) => id !== userId));
    };

    const handleVoiceUpdate = (state) => {
      setVoiceState(state || {});
    };

    const handleUserListUpdate = () => {
      loadUsers();
    };

    socket.on("userOnline", handleOnline);
    socket.on("userOffline", handleOffline);
    socket.on("voiceChannelUpdate", handleVoiceUpdate);
    socket.on("userListUpdated", handleUserListUpdate);

    return () => {
      socket.off("userOnline", handleOnline);
      socket.off("userOffline", handleOffline);
      socket.off("voiceChannelUpdate", handleVoiceUpdate);
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
        .filter((u) => online.includes(u.id))
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
