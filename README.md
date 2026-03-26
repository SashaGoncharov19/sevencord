# 7cord

A Discord-like real-time voice, video and text chat application built with:
- **Backend**: Bun + Elysia + Drizzle ORM + PostgreSQL
- **Frontend**: Electrobun + React + Vite + Tailwind CSS
- **Protocol**: WebSocket (messaging) + WebRTC (voice/video)

---

## 🖥 Server Deployment (Docker)

### Requirements
- Docker + Docker Compose

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/7cord
cd 7cord/apps/server
```

### 2. Configure environment (optional)
```bash
cp .env.example .env
# Edit .env with your own secrets
```

### 3. Start everything
```bash
docker compose up -d
```

The server will be available at `http://localhost:3000`.

> **Note**: Replace `YOUR_GITHUB_USERNAME` in `docker-compose.yml` with your actual GitHub username before deploying.

---

## 💻 Client Downloads

Pre-built binaries are available on the [Releases page](../../releases):
- **macOS (Apple Silicon)** — `.dmg`
- **Windows (x64)** — `.exe`

After downloading, enter your server URL (e.g. `http://your-server-ip:3000`) in the connection screen.

---

## 🔧 Development

### Prerequisites
- [Bun](https://bun.sh) v1.3+
- Docker (for PostgreSQL)

### Backend
```bash
cd apps/server
cp .env.example .env
docker compose up -d db   # Start only PostgreSQL
bun run db:push            # Run migrations
bun run dev                # Start dev server with hot reload
```

### Frontend
```bash
cd apps/client
bun install
bun run dev:hmr            # Start Electrobun + Vite HMR
```

---

## 🚀 Releasing

Push a version tag to trigger the GitHub Actions build:
```bash
git tag v1.0.0
git push origin v1.0.0
```

This will:
1. Build the Electrobun client for macOS (arm64) and Windows (x64)
2. Build and push the server Docker image to GitHub Container Registry
3. Create a GitHub Release with all binaries attached
