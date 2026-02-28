export async function getIceServers() {
  const ident = process.env.REACT_APP_XIRSYS_IDENT;
  const secret = process.env.REACT_APP_XIRSYS_SECRET;
  const channel = process.env.REACT_APP_XIRSYS_CHANNEL;

  const res = await fetch("https://global.xirsys.net/_turn/" + channel, {
    method: "PUT",
    headers: {
      Authorization: "Basic " + btoa(`${ident}:${secret}`),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ format: "urls" })
  });

  const data = await res.json();
  return data.v?.iceServers || [];
}
