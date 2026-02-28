// src/pages/AdminPage.jsx
import React, { useEffect, useState } from "react";
import "../styles/AdminPanel.css";

const API_BASE = process.env.REACT_APP_API_BASE;

function AdminPage() {
  const [sessionValid, setSessionValid] = useState(false);
  const [inviteKeys, setInviteKeys] = useState([]);
  const [channels, setChannels] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);

  const sessionId = localStorage.getItem("sessionId");

  // Session prüfen
  useEffect(() => {
    if (!sessionId) {
      window.location.href = "/";
      return;
    }

    fetch(`${API_BASE}/api/auth/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": sessionId
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.user.isAdmin) {
          setSessionValid(true);
        } else {
          localStorage.removeItem("sessionId");
          window.location.href = "/";
        }
      })
      .catch(() => {
        localStorage.removeItem("sessionId");
        window.location.href = "/";
      })
      .finally(() => setCheckingSession(false));
  }, [sessionId]);

  // Admin-Daten laden
  useEffect(() => {
    if (!sessionValid) return;

    async function loadAll() {
      setLoading(true);
      await Promise.all([
        fetchInviteKeys(),
        fetchChannels(),
        fetchUsers()
      ]);
      setLoading(false);
    }

    loadAll();
  }, [sessionValid]);

  async function fetchInviteKeys() {
    const res = await fetch(`${API_BASE}/api/invite/list`, {
      headers: { "x-session-id": sessionId }
    });
    const data = await res.json();
    if (data.ok) setInviteKeys(data.invites);
  }

  async function fetchChannels() {
    const res = await fetch(`${API_BASE}/api/channels/list`, {
      headers: { "x-session-id": sessionId }
    });
    const data = await res.json();
    if (data.ok) setChannels(data.channels);
  }

  async function fetchUsers() {
    const res = await fetch(`${API_BASE}/api/users/list`, {
      headers: { "x-session-id": sessionId }
    });
    const data = await res.json();
    if (data.ok) setUsers(data.users);
  }

  async function createInvite(isAdminKey) {
    const res = await fetch(`${API_BASE}/api/invite/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": sessionId
      },
      body: JSON.stringify({ isAdminKey })
    });
    const data = await res.json();
    if (data.ok) fetchInviteKeys();
  }

  async function deleteChannel(name) {
    if (!window.confirm(`Channel "${name}" löschen?`)) return;

    const res = await fetch(`${API_BASE}/api/channels/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": sessionId
      },
      body: JSON.stringify({ name })
    });

    const data = await res.json();
    if (data.ok) fetchChannels();
  }

  async function banUser(username) {
    const res = await fetch(`${API_BASE}/api/users/ban`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": sessionId
      },
      body: JSON.stringify({ username })
    });

    const data = await res.json();
    if (data.ok) fetchUsers();
  }

  async function unbanUser(username) {
    const res = await fetch(`${API_BASE}/api/users/unban`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": sessionId
      },
      body: JSON.stringify({ username })
    });

    const data = await res.json();
    if (data.ok) fetchUsers();
  }

  if (checkingSession || loading) {
    return <div style={{ padding: 20 }}>Lade Admin-Daten…</div>;
  }

  return (
    <div className="admin-page">
      <h1>Admin-Panel</h1>
      <a href="/chat">← Zurück zum Chat</a>

      <div className="admin-grid">
        {/* Invite Keys */}
        <section className="admin-section">
          <h2>Invite-Keys</h2>
          <div className="admin-actions">
            <button onClick={() => createInvite(false)}>Invite erstellen</button>
            <button onClick={() => createInvite(true)}>Admin-Invite</button>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Admin</th>
                <th>Benutzt</th>
                <th>Erstellt</th>
              </tr>
            </thead>
            <tbody>
              {inviteKeys.map((inv) => (
                <tr key={inv.key}>
                  <td className="key-mono">{inv.key}</td>
                  <td>{inv.isAdminKey ? "Ja" : "Nein"}</td>
                  <td>{inv.isUsed ? "Ja" : "Nein"}</td>
                  <td>{new Date(inv.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Channels */}
        <section className="admin-section">
          <h2>Channels</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((ch) => (
                <tr key={ch}>
                  <td>#{ch}</td>
                  <td>
                    <button className="danger" onClick={() => deleteChannel(ch)}>
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Users */}
        <section className="admin-section">
          <h2>User</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Admin</th>
                <th>Gebannt</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>{u.isAdmin ? "Ja" : "Nein"}</td>
                  <td>{u.isBanned ? "Ja" : "Nein"}</td>
                  <td>
                    {u.isBanned ? (
                      <button onClick={() => unbanUser(u.username)}>Entbannen</button>
                    ) : (
                      <button onClick={() => banUser(u.username)}>Bannen</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

export default AdminPage;
