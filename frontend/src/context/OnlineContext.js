import React, { createContext, useContext, useEffect, useState } from "react";
import socket from "../socket";

const OnlineContext = createContext([]);

export function OnlineProvider({ children }) {
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off("onlineUsers");
    };
  }, []);

  return (
    <OnlineContext.Provider value={onlineUsers}>
      {children}
    </OnlineContext.Provider>
  );
}

export function useOnlineUsers() {
  return useContext(OnlineContext);
}
