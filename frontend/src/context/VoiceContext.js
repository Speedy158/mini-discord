// src/context/VoiceContext.js
import { createContext, useContext, useState, useEffect } from "react";
import socket from "../socket";

const VoiceContext = createContext();

export function VoiceProvider({ children }) {
  const [voiceState, setVoiceState] = useState({});

  useEffect(() => {
    function handleVoiceUpdate(state) {
      setVoiceState(state || {});
    }

    socket.on("voiceChannelUpdate", handleVoiceUpdate);
    return () => {
      socket.off("voiceChannelUpdate", handleVoiceUpdate);
    };
  }, []);

  return (
    <VoiceContext.Provider value={voiceState}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoiceState() {
  return useContext(VoiceContext);
}
