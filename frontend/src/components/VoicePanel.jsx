import React, { useEffect, useState, useRef } from "react";
import socket from "../socket";
import { useVoiceState } from "../context/VoiceContext";

const API_BASE = process.env.REACT_APP_API_BASE;

function VoicePanel({ username }) {
  const [channels, setChannels] = useState([]);
  const [currentVoiceChannel, setCurrentVoiceChannel] = useState(null);
  const [speakingUsers, setSpeakingUsers] = useState([]);
  const [userData, setUserData] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const voiceState = useVoiceState();

  const sessionId = localStorage.getItem("sessionId");
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const rafIdRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    async function loadChannels() {
      if (!sessionId) return;
      try {
        const res = await fetch(`${API_BASE}/api/channels/list`, {
          headers: { "x-session-id": sessionId }
        });
        const data = await res.json();
        if (data.ok) setChannels(data.channels);
      } catch (err) {
        console.error("Fehler beim Laden der Channels (Voice):", err);
      }
    }

    async function loadUser() {
      try {
        const res = await fetch(`${API_BASE}/api/users/me`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": sessionId
          }
        });
        const data = await res.json();
        if (data.ok) setUserData(data.user);
      } catch (err) {
        console.error("Fehler beim Laden des Users:", err);
      }
    }

    loadChannels();
    loadUser();
  }, [sessionId]);

  useEffect(() => {
    if (username) {
      socket.emit("registerUser", { username });
    }

    function handleSpeakingStart({ user }) {
      setSpeakingUsers((prev) =>
        prev.includes(user) ? prev : [...prev, user]
      );
    }

    function handleSpeakingStop({ user }) {
      setSpeakingUsers((prev) => prev.filter((u) => u !== user));
    }

    socket.on("speakingStart", handleSpeakingStart);
    socket.on("speakingStop", handleSpeakingStop);

    return () => {
      socket.off("speakingStart", handleSpeakingStart);
      socket.off("speakingStop", handleSpeakingStop);
    };
  }, [username]);

  useEffect(() => {
    if (currentVoiceChannel) {
      startMicrophone();
    } else {
      stopMicrophone();
    }

    return () => {
      stopMicrophone();
    };
  }, [currentVoiceChannel, isMuted]);

  function startMicrophone() {
    let source;
    let dataArray;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        streamRef.current = stream;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;

        source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        source.connect(analyser);

        const detectSpeech = () => {
          analyser.getByteFrequencyData(dataArray);
          const volume = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
          setVolumeLevel(volume);

          if (!isMuted && currentVoiceChannel) {
            if (volume > 20) {
              startSpeaking();
            } else {
              stopSpeaking();
            }
          }

          rafIdRef.current = requestAnimationFrame(detectSpeech);
        };

        detectSpeech();
      })
      .catch((err) => {
        console.error("Mikrofonzugriff fehlgeschlagen:", err);
      });
  }

  function stopMicrophone() {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  function joinChannel(channel) {
    if (!username) return alert("Kein Username gesetzt.");
    socket.emit("joinVoiceChannel", { channel });
    setCurrentVoiceChannel(channel);
  }

  function leaveChannel() {
    if (!currentVoiceChannel) return;
    socket.emit("leaveVoiceChannel", { channel: currentVoiceChannel });
    setCurrentVoiceChannel(null);
    stopSpeaking();
  }

  function startSpeaking() {
    socket.emit("speakingStart", { channel: currentVoiceChannel });
  }

  function stopSpeaking() {
    socket.emit("speakingStop", { channel: currentVoiceChannel });
  }

  function toggleMute() {
    setIsMuted((prev) => {
      const newState = !prev;
      if (newState) stopSpeaking();
      return newState;
    });
  }

  function renderAvatar() {
    if (!userData) return null;

    if (userData.avatarType === "generated") {
      return (
        <div
          className="avatar"
          style={{
            backgroundColor: userData.avatarColor || "#888",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            fontSize: "14px"
          }}
        >
          {userData.avatarLetter || "?"}
        </div>
      );
    }

    if (userData.avatarType === "upload" && userData.avatarImage) {
      return (
        <img
          src={userData.avatarImage}
          alt="avatar"
          className="avatar"
        />
      );
    }

    return (
      <div className="avatar" style={{ backgroundColor: "#666" }}>
        ?
      </div>
    );
  }

  return (
    <div className="voice-panel">
      <div className="voice-channels">
        <div className="channel-list-header">
          <strong>Voice-Channels</strong>
        </div>
        <div className="channel-list-items">
          {channels.map((ch) => {
            const users = voiceState[ch] || [];
            return (
              <div key={ch} className="channel-item">
                <div className="voice-channel-header">
                  <span>{ch}</span>
                  {currentVoiceChannel === ch ? (
                    <button onClick={leaveChannel}>Leave</button>
                  ) : (
                    <button onClick={() => joinChannel(ch)}>Join</button>
                  )}
                </div>
                <div className="voice-channel-users">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className={
                        "voice-user" +
                        (speakingUsers.includes(u.username)
                          ? " voice-user-speaking"
                          : "")
                      }
                    >
                      {u.username}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {currentVoiceChannel && (
          <div className="voice-controls">
            <button onClick={toggleMute}>
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <div className="volume-bar">
              <div
                className="volume-fill"
                style={{ width: `${Math.min(volumeLevel * 2, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="voice-user-info">
        <div className="voice-avatar">{renderAvatar()}</div>
        <div className="voice-username">{username}</div>
        {currentVoiceChannel && (
          <button className="voice-disconnect" onClick={leaveChannel}>
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}

export default VoicePanel;
