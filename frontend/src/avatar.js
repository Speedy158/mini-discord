import { socket } from "./socket";

export function uploadAvatar(callback) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => callback(reader.result);
    reader.readAsDataURL(file);
  };

  input.click();
}

export function updateAvatarOnServer(username, avatarData) {
  socket.emit("updateAvatar", {
    username,
    ...avatarData
  });
}

export function getAvatarFromServer(users, username) {
  return (
    users[username] || {
      avatarType: "default",
      avatarColor: "#5865F2",
      avatarLetter: username[0]?.toUpperCase() || "?",
      avatarImage: null
    }
  );
}
