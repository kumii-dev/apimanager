# 🚀 Starting Both Servers - Quick Guide

**Created:** February 8, 2026  
**Status:** ✅ Ready to Use

---

## 🎯 Quick Start (Recommended)

### Option 1: Using the Shell Script (Mac/Linux)

```bash
./start-dev.sh
```

This will:
- ✅ Check Node.js and npm versions
- ✅ Verify .env files exist
- ✅ Install dependencies if needed
- ✅ Start both servers with colored output
- ✅ Show real-time logs from both services

**Press `Ctrl+C` to stop both services**

---

### Option 2: Using npm Scripts

```bash
# First time: Install concurrently
npm install

# Then start both servers
npm run dev
```

**Alternative npm commands:**
```bash
npm start              # Same as npm run dev
npm run dev:gateway    # Start only gateway server
npm run dev:admin      # Start only admin client
```

---

### Option 3: Manual Startup (Separate Terminals)

**Terminal 1 - Gateway Server:**
```bash
cd gateway-server
npm run dev
```

**Terminal 2 - Admin Client:**
```bash
cd admin-client
npm run dev
```

---

## 🪟 Windows Users

### Using Batch Script:
```cmd
start-dev.bat
```

This will open two separate terminal windows:
- One for Gateway Server (Blue)
- One for Admin Client (Magenta)

---

## 📊 Services Overview

| Service | URL | Port | Description |
|---------|-----|------|-------------|
| **Gateway Server** | http://localhost:3000 | 3000 | API Gateway & Routing Engine |
| **Admin Client** | http://localhost:5173 | 5173 | React Admin Dashboard |

---

## ✅ Pre-Flight Checks

The startup script automatically checks:

1. **Node.js** (v18 or higher required)
2. **npm** (v9 or higher required)
3. **Environment Files:**
   - `gateway-server/.env`
   - `admin-client/.env`
4. **Dependencies:**
   - `gateway-server/node_modules`
   - `admin-client/node_modules`

If anything is missing, the script will:
- ❌ Show what's missing
- 💡 Provide instructions to fix it
- 🔧 Auto-install dependencies if needed

---

## 🎨 Output Format

When using `./start-dev.sh` or `npm run dev`, you'll see:

```
╔════════════════════════════════════════════════════════════════╗
║           🚀 KUMII API Gateway - Dev Server Startup           ║
╚════════════════════════════════════════════════════════════════╝

📋 Running pre-flight checks...
✅ Node.js v20.10.0
✅ npm 10.2.3
✅ Gateway .env file exists
✅ Admin client .env file exists
✅ Gateway dependencies installed
✅ Admin client dependencies installed

✅ All pre-flight checks passed!

╔════════════════════════════════════════════════════════════════╗
║                    🎬 Starting Services                        ║
╚════════════════════════════════════════════════════════════════╝

🔹 Gateway Server: http://localhost:3000
🔹 Admin Client:   http://localhost:5173

Press Ctrl+C to stop all services

[GATEWAY] Starting gateway server...
[ADMIN] Starting admin client...
[GATEWAY] ✅ Environment loaded
[GATEWAY] ✅ Supabase connected
[ADMIN] ✅ Vite dev server started
[GATEWAY] 🚀 Server listening on http://localhost:3000
[ADMIN] 🚀 Local: http://localhost:5173
```

---

## 🛑 Stopping Services

### Shell Script / npm:
- Press `Ctrl+C` in the terminal
- Both services will shut down gracefully

### Windows Batch Script:
- Close the terminal windows
- Or press `Ctrl+C` in each window

### Manual:
- Press `Ctrl+C` in each terminal

---

## 🔧 Troubleshooting

### Issue: "Port 3000 already in use"
**Solution:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)
```

### Issue: "Port 5173 already in use"
**Solution:**
```bash
# Find process using port 5173
lsof -ti:5173

# Kill the process
kill -9 $(lsof -ti:5173)
```

### Issue: "Dependencies not found"
**Solution:**
```bash
# Install all dependencies
npm run install:all
```

### Issue: ".env file not found"
**Solution:**
```bash
# Check if .env files exist
ls -la gateway-server/.env
ls -la admin-client/.env

# If missing, see ENV_FILES_GENERATED.md
```

### Issue: "Node version too old"
**Solution:**
```bash
# Check current version
node -v

# Install Node.js 18 or higher from:
# https://nodejs.org/
```

---

## 📚 Additional npm Scripts

```bash
# Install dependencies in all packages
npm run install:all

# Build both applications for production
npm run build:all

# Build only gateway server
npm run build:gateway

# Build only admin client
npm run build:admin

# Clean all node_modules and build folders
npm run clean

# Run linters
npm run lint

# Run tests
npm run test
```

---

## 🎯 First-Time Setup Checklist

- [ ] Node.js 18+ installed
- [ ] npm 9+ installed
- [ ] Repository cloned
- [ ] `.env` files created (see `ENV_FILES_GENERATED.md`)
- [ ] Service Role Key added to `gateway-server/.env`
- [ ] Database migration run in Supabase
- [ ] Dependencies installed (`npm run install:all`)
- [ ] Ready to start servers! 🚀

---

## 🔗 Related Documentation

- **Environment Setup:** `ENV_FILES_GENERATED.md`
- **Main README:** `README.md`
- **Security Guide:** `docs/SECURITY.md`
- **API Documentation:** `docs/API.md`
- **Deployment Guide:** `docs/DEPLOYMENT.md`

---

## 💡 Pro Tips

### 1. **Use tmux or screen for session management**
```bash
# Using tmux
tmux new -s kumii
./start-dev.sh
# Detach: Ctrl+B then D
# Reattach: tmux attach -t kumii
```

### 2. **Create an alias for quick startup**
```bash
# Add to ~/.zshrc or ~/.bashrc
alias kumii-dev='cd /path/to/apimanager && ./start-dev.sh'

# Then just run:
kumii-dev
```

### 3. **Use VS Code integrated terminal**
- Open integrated terminal (`Ctrl+``)
- Run `./start-dev.sh`
- Split terminal to view logs side by side

### 4. **Monitor with system tools**
```bash
# Watch both processes
watch -n 1 'lsof -ti:3000,5173'

# Monitor resource usage
htop -p $(lsof -ti:3000,5173)
```

---

## 🎬 Demo Commands

```bash
# Test Gateway Server
curl http://localhost:3000/health

# Test Admin Client
open http://localhost:5173

# Test with authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/admin/connectors
```

---

**Ready to start?** Run `./start-dev.sh` and you're good to go! 🚀
