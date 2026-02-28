// frontend/peerManager.js
import socket from "./socket";
import { getIceServers } from "./utils/getIceServers";

const peers = {};
let localStream = null;
let iceServers = [];

export async function initVoicePeers(stream, currentChannel, username, voiceState) {
  localStream = stream;

  if (iceServers.length === 0) {
    try {
      iceServers = await getIceServers();
    } catch (err) {
      console.error("Fehler beim Laden der ICE-Server:", err);
      iceServers = [{ urls: "stun:stun.l.google.com:19302" }]; // Fallback
    }
  }

  const usersInChannel = voiceState[currentChannel] || [];

  for (const user of usersInChannel) {
    if (user.username === username || peers[user.username]) continue;

    const pc = await createPeerConnection(user.username, currentChannel);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    peers[user.username] = pc;

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("voice-offer", {
        to: user.username,
        from: username,
        sdp: offer,
        channel: currentChannel
      });
    } catch (err) {
      console.error("Fehler beim Erstellen des Angebots:", err);
    }
  }
}

async function createPeerConnection(remoteUsername, channel) {
  const pc = new RTCPeerConnection({ iceServers });

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
    if (remoteStream) {
      const audio = new Audio();
      audio.srcObject = remoteStream;
      audio.autoplay = true;
      audio.play().catch((err) => {
        console.warn("Audio konnte nicht automatisch abgespielt werden:", err);
      });
    }
  };

  return pc;
}

socket.on("voice-offer", async ({ from, sdp, channel }) => {
  if (!localStream) {
    console.warn("Kein lokaler Stream verfügbar für voice-offer");
    return;
  }

  if (!iceServers.length) {
    try {
      iceServers = await getIceServers();
    } catch (err) {
      console.error("Fehler beim Laden der ICE-Server:", err);
      iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
    }
  }

  const pc = await createPeerConnection(from, channel);
  peers[from] = pc;

  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

  try {
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("voice-answer", {
      to: from,
      from: localStorage.getItem("username"),
      sdp: answer,
      channel
    });
  } catch (err) {
    console.error("Fehler bei voice-offer:", err);
  }
});

socket.on("voice-answer", async ({ from, sdp }) => {
  const pc = peers[from];
  if (!pc) return;
  try {
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  } catch (err) {
    console.error("Fehler bei voice-answer:", err);
  }
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
