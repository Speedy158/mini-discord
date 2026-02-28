// frontend/peerManager.js
import socket from "./socket";

const peers = {};
let localStream = null;

export async function initVoicePeers(stream, currentChannel, username, voiceState) {
  localStream = stream;

  const usersInChannel = voiceState[currentChannel] || [];

  for (const user of usersInChannel) {
    if (user.username === username) continue; // nicht mit sich selbst verbinden
    if (peers[user.username]) continue; // Verbindung existiert bereits

    const pc = createPeerConnection(user.username, currentChannel);
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    peers[user.username] = pc;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("voice-offer", {
      to: user.username,
      from: username,
      sdp: offer,
      channel: currentChannel
    });
  }
}

function createPeerConnection(remoteUsername, channel) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("voice-ice-candidate", {
        to: remoteUsername,
        from: localStorage.getItem("username"),
        candidate: event.candidate,
        channel
      });
    }
  };

  pc.ontrack = (event) => {
    const remoteStream = event.streams[0];
    const audio = new Audio();
    audio.srcObject = remoteStream;
    audio.autoplay = true;
    audio.play().catch((err) => console.warn("Audio play error:", err));
  };

  return pc;
}

socket.on("voice-offer", async ({ from, sdp, channel }) => {
  const pc = createPeerConnection(from, channel);
  peers[from] = pc;

  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit("voice-answer", {
    to: from,
    from: localStorage.getItem("username"),
    sdp: answer,
    channel
  });
});

socket.on("voice-answer", async ({ from, sdp }) => {
  const pc = peers[from];
  if (!pc) return;
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
});

socket.on("voice-ice-candidate", async ({ from, candidate }) => {
  const pc = peers[from];
  if (!pc) return;
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.error("Fehler beim Hinzufügen von ICE-Kandidat:", err);
  }
});

export function closeAllPeers() {
  for (const username in peers) {
    peers[username].close();
    delete peers[username];
  }
}
