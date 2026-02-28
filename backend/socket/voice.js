const { all } = require("../db");

let voiceChannels = {}; // z.B. { general: [ { id, userId, username } ] }

async function setupVoice(io) {
  try {
    const channels = await all(`SELECT name FROM channels`);
    channels.forEach((c) => (voiceChannels[c.name] = []));
  } catch (err) {
    console.error("❌ Fehler beim Initialisieren der Voice-Channels:", err);
    return;
  }

  io.on("connection", (socket) => {
    const user = socket.user;
    if (!user) {
      console.warn("Voice-Socket ohne gültige Authentifizierung");
      return;
    }

    console.log(`🎧 Voice-Socket verbunden: ${user.username}`);

    socket.on("joinVoiceChannel", ({ channel }) => {
      if (!channel || !voiceChannels[channel]) return;

      for (const ch in voiceChannels) {
        voiceChannels[ch] = voiceChannels[ch].filter(
          (u) => u.userId !== user.id
        );
        socket.leave("vc-" + ch);
      }

      voiceChannels[channel].push({
        id: socket.id,
        userId: user.id,
        username: user.username
      });

      socket.join("vc-" + channel);
      io.emit("voiceChannelUpdate", voiceChannels);
    });

    socket.on("leaveVoiceChannel", ({ channel }) => {
      if (!channel || !voiceChannels[channel]) return;

      voiceChannels[channel] = voiceChannels[channel].filter(
        (u) => u.userId !== user.id
      );

      socket.leave("vc-" + channel);
      io.emit("voiceChannelUpdate", voiceChannels);
    });

    socket.on("speakingStart", ({ channel }) => {
      if (!channel) return;
      io.to("vc-" + channel).emit("speakingStart", { user: user.username });
    });

    socket.on("speakingStop", ({ channel }) => {
      if (!channel) return;
      io.to("vc-" + channel).emit("speakingStop", { user: user.username });
    });

    socket.on("voice-offer", ({ to, from, sdp, channel }) => {
      const target = findSocketByUsername(io, to);
      if (target) {
        target.emit("voice-offer", { from, sdp, channel });
      }
    });

    socket.on("voice-answer", ({ to, from, sdp, channel }) => {
      const target = findSocketByUsername(io, to);
      if (target) {
        target.emit("voice-answer", { from, sdp, channel });
      }
    });

    socket.on("voice-ice-candidate", ({ to, from, candidate, channel }) => {
      const target = findSocketByUsername(io, to);
      if (target) {
        target.emit("voice-ice-candidate", { from, candidate, channel });
      }
    });

    socket.on("disconnect", () => {
      for (const ch in voiceChannels) {
        voiceChannels[ch] = voiceChannels[ch].filter(
          (u) => u.userId !== user.id
        );
      }

      io.emit("voiceChannelUpdate", voiceChannels);
    });
  });
}

function findSocketByUsername(io, username) {
  for (const [id, socket] of io.of("/").sockets) {
    if (socket.user?.username === username) {
      return socket;
    }
  }
  return null;
}

function getVoiceState() {
  return voiceChannels;
}

module.exports = setupVoice;
module.exports.getVoiceState = getVoiceState;
