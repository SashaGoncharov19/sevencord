const serverUrl = "http://localhost:3000";

async function test() {
  const username = "testuser_" + Date.now();
  const password = "password123";

  console.log("Registering...");
  const res = await fetch(`${serverUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Register failed:", data);
    return;
  }

  console.log("Registered! Token:", data.token);

  const wsUrl = `ws://localhost:3000/ws?token=${data.token}`;
  console.log("Connecting WS to", wsUrl);
  
  const ws = new WebSocket(wsUrl);
  ws.onopen = () => {
    console.log("WS Opened");
  };
  ws.onmessage = (e) => {
    console.log("WS Message:", e.data);
  };
  ws.onerror = (e) => {
    console.error("WS Error", e);
  };
  ws.onclose = (e) => {
    console.log("WS Closed", e.code, e.reason);
  };
}

test();
