# ProcureFlix - Standalone Production Package

## 🎯 Quick Start

**Completely standalone package with ZERO Emergent dependencies.** Deploy anywhere with Docker.

```bash
# 1. Set backend URL for Docker build
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env

# 2. Configure backend API key
cp backend/.env.template backend/.env
nano backend/.env  # Add: OPENAI_API_KEY=sk-your-key

# 3. Build & Start
docker compose build --no-cache
docker compose up -d

# 4. Access & Login
# URL: http://localhost
# User: admin@sourcevia.com
# Pass: admin123
```

---

## ✅ Package Verified Clean

- ✅ **No Emergent URLs** - All removed
- ✅ **No Emergent dependencies** - Pure PyPI packages
- ✅ **No fallback URLs** - Frontend uses explicit REACT_APP_BACKEND_URL
- ✅ **Node 20 LTS** - Verified compatible
- ✅ **Clean file structure** - Temp files removed
- ✅ **Production ready** - Complete standalone package

---

## 📋 Requirements

- Docker 20.10+ & Docker Compose 2.0+
- Ubuntu 24.04 (or any Linux)
- 4GB RAM minimum
- OpenAI API Key (for AI features)

---

## 🔧 Configuration

### Set Backend URL (.env in project root)

**For local testing:**
```bash
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
```

**For production:**
```bash
echo "REACT_APP_BACKEND_URL=https://api.your-domain.com" > .env
```

### Configure Backend (backend/.env)

```bash
cp backend/.env.template backend/.env
nano backend/.env
```

**Required:**
```bash
OPENAI_API_KEY=sk-your-actual-key-here
```

---

## 🚀 Deployment Commands

### Local
```bash
docker compose build && docker compose up -d
```

### Production (Alibaba Cloud)
```bash
# Set production backend URL
echo "REACT_APP_BACKEND_URL=https://api.your-domain.com" > .env

# Configure
cp backend/.env.template backend/.env
nano backend/.env  # Add keys, update ALLOWED_ORIGINS

# Deploy
docker compose build --no-cache
docker compose up -d
```

---

## 📚 Documentation

- **README.md** (this file) - Quick start
- **DEPLOYMENT_GUIDE_PRODUCTION.md** - Complete deployment guide
- **EXTERNAL_DEPLOYMENT_GUIDE.md** - External server setup
- **DOCKER_TESTING_CHECKLIST.md** - Testing procedures

---

## 🔍 Verify Deployment

```bash
# Check containers
docker compose ps  # All should be "healthy"

# Test backend
curl http://localhost:8001/api/health

# Test frontend
open http://localhost
```

---

## 📞 Troubleshooting

**Frontend errors?**
```bash
# Check backend URL was set correctly
cat .env
# Rebuild if needed
docker compose build --no-cache frontend
```

**Backend won't start?**
```bash
docker compose logs backend
# Check OPENAI_API_KEY is set in backend/.env
```

---

**Version:** 2.0 Standalone | **Status:** ✅ Production Ready | **Node:** 20.x | **Python:** 3.11
