const { all } = require("../db");

let voiceChannels = {}; // z.B. { general: [ { id, userId, username } ] }
let socketUsers = {};   // socket.id → { userId, username }

async function setupVoice(io) {
  const channels = await all(`SELECT name FROM channels`);
  channels.forEach((c) => (voiceChannels[c.name] = []));

  io.on("connection", (socket) => {
    console.log("Voice-Socket verbunden:", socket.id);

    socket.on("registerUser", ({ username, userId }) => {
      socketUsers[socket.id] = { username, userId };
    });

    socket.on("joinVoiceChannel", ({ channel }) => {
      const user = socketUsers[socket.id];
      if (!user) return;

      for (const ch in voiceChannels) {
        voiceChannels[ch] = voiceChannels[ch].filter(
          (u) => u.userId !== user.userId
        );
        socket.leave("vc-" + ch);
      }

      if (!voiceChannels[channel]) voiceChannels[channel] = [];
      voiceChannels[channel].push({
        id: socket.id,
        userId: user.userId,
        username: user.username
      });

      socket.join("vc-" + channel);
      io.emit("voiceChannelUpdate", voiceChannels);
    });

    socket.on("leaveVoiceChannel", ({ channel }) => {
      const user = socketUsers[socket.id];
      if (!user) return;

      if (voiceChannels[channel]) {
        voiceChannels[channel] = voiceChannels[channel].filter(
          (u) => u.userId !== user.userId
        );
      }

      socket.leave("vc-" + channel);
      io.emit("voiceChannelUpdate", voiceChannels);
    });

    socket.on("speakingStart", ({ channel }) => {
      const user = socketUsers[socket.id];
      if (!user) return;
      io.to("vc-" + channel).emit("speakingStart", { user: user.username });
    });

    socket.on("speakingStop", ({ channel }) => {
      const user = socketUsers[socket.id];
      if (!user) return;
      io.to("vc-" + channel).emit("speakingStop", { user: user.username });
    });

    socket.on("disconnect", () => {
      const user = socketUsers[socket.id];
      if (!user) return;

      for (const ch in voiceChannels) {
        voiceChannels[ch] = voiceChannels[ch].filter(
          (u) => u.userId !== user.userId
        );
      }

      delete socketUsers[socket.id];
      io.emit("voiceChannelUpdate", voiceChannels);
    });
  });
}

function getVoiceState() {
  return voiceChannels;
}

module.exports = setupVoice;
module.exports.getVoiceState = getVoiceState;
