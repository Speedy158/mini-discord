import { socket } from "./socket";

let localStream = null;
let audioContext = null;
let analyser = null;
let speaking = false;

export async function startCall() {
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(localStream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);

  detectSpeaking();

  return localStream;
}

export function stopCall() {
  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  speaking = false;
}

function detectSpeaking() {
  const data = new Uint8Array(analyser.frequencyBinCount);

  function loop() {
    if (!analyser) return;

    analyser.getByteFrequencyData(data);
    const volume = data.reduce((a, b) => a + b) / data.length;

    if (volume > 25 && !speaking) {
      speaking = true;
      socket.emit("speakingStart", {
        channel: localStorage.getItem("voiceChannel"),
        user: localStorage.getItem("username")
      });
    }

    if (volume < 15 && speaking) {
      speaking = false;
      socket.emit("speakingStop", {
        channel: localStorage.getItem("voiceChannel"),
        user: localStorage.getItem("username")
      });
    }

    requestAnimationFrame(loop);
  }

  loop();
}
