const ws = new WebSocket("ws://localhost:3005/ws-test");
ws.onopen = () => console.log("Client connected");
ws.onmessage = (e) => console.log("Message from server", e.data);
