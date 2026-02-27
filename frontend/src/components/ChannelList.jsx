import React, { useEffect, useState } from "react";

const API_BASE = "http://localhost:3000";

function ChannelList({ currentChannel, onSelectChannel }) {
  const [channels, setChannels] = useState([]);
  const [newChannelName, setNewChannelName] = useState("");
  const [addingChannel, setAddingChannel] = useState(false);
  const [renamingChannel, setRenamingChannel] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const sessionId = localStorage.getItem("sessionId");

  useEffect(() => {
    loadChannels();
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  async function loadChannels() {
    if (!sessionId) return;
    try {
      const res = await fetch(`${API_BASE}/api/channels/list`, {
        headers: { "x-session-id": sessionId }
      });
      const data = await res.json();
      if (data.ok) setChannels(data.channels);
    } catch (err) {
      console.error("Fehler beim Laden der Channels:", err);
    }
  }

  async function handleCreateChannel(e) {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/channels/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId
        },
        body: JSON.stringify({ name: newChannelName.trim() })
      });
      const data = await res.json();
      if (data.ok) {
        setNewChannelName("");
        setAddingChannel(false);
        await loadChannels();
      } else {
        alert(data.error || "Channel konnte nicht erstellt werden.");
      }
    } catch (err) {
      console.error("Fehler beim Erstellen des Channels:", err);
    }
  }

  async function handleRenameChannel(oldName, newName) {
    if (!newName.trim() || oldName === newName) return;
    try {
      const res = await fetch(`${API_BASE}/api/channels/rename`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId
        },
        body: JSON.stringify({ oldName, newName })
      });
      const data = await res.json();
      if (data.ok) {
        setRenamingChannel(null);
        await loadChannels();
      } else {
        alert(data.error || "Channel konnte nicht umbenannt werden.");
      }
    } catch (err) {
      console.error("Fehler beim Umbenennen:", err);
    }
  }

  async function handleDeleteChannel(name) {
    if (!window.confirm(`Channel "${name}" wirklich löschen?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/channels/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId
        },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (data.ok) {
        await loadChannels();
      } else {
        alert(data.error || "Channel konnte nicht gelöscht werden.");
      }
    } catch (err) {
      console.error("Fehler beim Löschen des Channels:", err);
    }
  }

  function handleRightClick(e, name) {
    e.preventDefault();
    setContextMenu({
      x: e.pageX,
      y: e.pageY,
      name
    });
  }

  return (
    <div className="channel-list">
      <div className="channel-list-header">
        <span>Text-Channels</span>
        <button onClick={() => setAddingChannel(true)}>+</button>
      </div>

      <div className="channel-list-items">
        {channels.map((ch) =>
          renamingChannel === ch ? (
            <form
              key={ch}
              onSubmit={(e) => {
                e.preventDefault();
                handleRenameChannel(ch, newChannelName);
              }}
            >
              <input
                autoFocus
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                onBlur={() => setRenamingChannel(null)}
              />
            </form>
          ) : (
            <div
              key={ch}
              className={
                "channel-item" + (currentChannel === ch ? " channel-item-active" : "")
              }
              onClick={() => onSelectChannel(ch)}
              onContextMenu={(e) => handleRightClick(e, ch)}
            >
              #{ch}
            </div>
          )
        )}

        {addingChannel && (
          <form onSubmit={handleCreateChannel}>
            <input
              autoFocus
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onBlur={() => setAddingChannel(false)}
              placeholder="Neuer Channel"
            />
          </form>
        )}
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x, position: "absolute" }}
        >
          <div
            onClick={() => {
              setRenamingChannel(contextMenu.name);
              setNewChannelName(contextMenu.name);
              setContextMenu(null);
            }}
          >
            Umbenennen
          </div>
          <div
            onClick={() => {
              handleDeleteChannel(contextMenu.name);
              setContextMenu(null);
            }}
          >
            Löschen
          </div>
        </div>
      )}
    </div>
  );
}

export default ChannelList;
