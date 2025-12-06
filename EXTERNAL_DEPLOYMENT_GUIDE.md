# ProcureFlix - External Deployment Guide
## Standalone Production Package (No Emergent Dependencies)

---

## 🎯 Package Overview

This is a **completely standalone, production-ready** ProcureFlix package designed for deployment on **any standard Docker environment**. It has been specifically prepared to work on clean Ubuntu 24.04 servers (including Alibaba Cloud ECS) without any Emergent-specific dependencies.

**What's Different from Original Package:**
- ✅ **No emergentintegrations** - Removed from requirements.txt
- ✅ **Pre-built Frontend** - No yarn build required in Docker
- ✅ **Standard OpenAI SDK** - Uses public openai library
- ✅ **Production Model** - Uses gpt-4o (not gpt-5)
- ✅ **Verified Clean Build** - No missing modules or path issues

---

## 📋 Prerequisites

### Server Requirements
- **OS:** Ubuntu 24.04 LTS (or any Linux with Docker support)
- **RAM:** Minimum 4GB, Recommended 8GB
- **Disk:** Minimum 10GB free space
- **CPU:** 2+ cores recommended

### Software Requirements
```bash
# Docker
docker --version  # Should be 20.10+

# Docker Compose
docker compose version  # Should be 2.0+
```

### API Keys (Required for AI Features)
- **OpenAI API Key** - Get from https://platform.openai.com/api-keys
  - Model used: `gpt-4o`
  - Cost: ~$0.005 per 1K tokens
  - Optional: Can disable AI by setting `PROCUREFLIX_AI_ENABLED=false`

---

## 🚀 Quick Deployment (5 Minutes)

### Step 1: Upload Package to Server

**Option A: Using SCP**
```bash
# From your local machine
scp -r procureflix/ user@your-server-ip:/opt/procureflix
```

**Option B: Using Git/FTP/Cloud Storage**
- Upload via your preferred method
- Ensure all files are transferred

### Step 2: Configure Backend

```bash
# SSH to your server
ssh user@your-server-ip

# Navigate to project
cd /opt/procureflix

# Copy env template
cp backend/.env.template backend/.env

# Edit backend/.env
nano backend/.env
```

**Required Changes in `backend/.env`:**
```bash
# Add your OpenAI API key (REQUIRED for AI features)
OPENAI_API_KEY=sk-your-actual-openai-key-here

# Verify these settings (should already be correct)
PROCUREFLIX_DATA_BACKEND=memory
PROCUREFLIX_AI_ENABLED=true
PROCUREFLIX_AI_PROVIDER=openai
PROCUREFLIX_AI_MODEL=gpt-4o
```

**Optional: To disable AI features:**
```bash
PROCUREFLIX_AI_ENABLED=false
# No API key needed if AI is disabled
```

### Step 3: Build Docker Images

```bash
# Build all images (takes 3-5 minutes)
docker compose build --no-cache
```

**Expected Output:**
```
[+] Building backend...
 => [1/5] FROM docker.io/library/python:3.11-slim
 => [2/5] WORKDIR /app
 => [3/5] COPY requirements.txt .
 => [4/5] RUN pip install --no-cache-dir -r requirements.txt
 => [5/5] COPY . .
 => exporting to image

[+] Building frontend...
 => [1/2] FROM docker.io/library/nginx:alpine
 => [2/2] COPY build /usr/share/nginx/html
 => exporting to image

✅ Successfully built all images
```

### Step 4: Start Services

```bash
# Start all containers
docker compose up -d

# Check status (wait 30-60 seconds for health checks)
docker compose ps
```

**Expected Status:**
```
NAME                   STATUS         PORTS
procureflix-backend    Up (healthy)   0.0.0.0:8001->8001/tcp
procureflix-frontend   Up (healthy)   0.0.0.0:80->80/tcp
procureflix-mongo      Up (healthy)   27017/tcp
```

### Step 5: Verify Deployment

**Backend Health Check:**
```bash
curl http://localhost:8001/api/health
```

**Expected Response:**
```json
{
    "status": "ok",
    "database": "connected",
    "api_version": "1.0"
}
```

**ProcureFlix Health Check:**
```bash
curl http://localhost:8001/api/procureflix/health
```

**Expected Response:**
```json
{
    "app": "ProcureFlix",
    "status": "ok",
    "data_backend": "memory",
    "sharepoint_configured": false
}
```

**Frontend Check:**
- Open browser: `http://your-server-ip`
- Should see ProcureFlix login page
- Login with: `admin@sourcevia.com` / `admin123`

---

## 🔧 Troubleshooting

### Issue 1: Backend Build Fails

**Symptom:**
```
ERROR: Could not find a version that satisfies the requirement [package]
```

**Solution:**
```bash
# Check internet connectivity
ping pypi.org

# Try with verbose output
docker compose build --no-cache backend --progress=plain

# If specific package fails, check requirements.txt
cat backend/requirements.txt | grep [package-name]
```

### Issue 2: Frontend Shows 502 Bad Gateway

**Symptom:** Browser shows "502 Bad Gateway" when accessing frontend

**Solution:**
```bash
# Check backend status
docker compose ps backend

# Wait for backend health check
docker compose logs backend | grep -i health

# If backend not healthy, check logs
docker compose logs backend --tail=50

# Restart if needed
docker compose restart backend
```

### Issue 3: AI Features Not Working

**Symptom:** AI endpoints return `ai_enabled: false`

**Solution:**
```bash
# Verify API key is set
docker compose exec backend printenv | grep OPENAI_API_KEY

# If empty, update backend/.env and restart
nano backend/.env  # Add OPENAI_API_KEY=sk-...
docker compose restart backend

# Test AI endpoint
curl http://localhost:8001/api/procureflix/vendors/vendor-tech-innovate/ai/risk-explanation
```

### Issue 4: Cannot Access from External IP

**Symptom:** Works on localhost but not from external IP

**Solution:**
```bash
# Check firewall rules
sudo ufw status

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# For Alibaba Cloud: Configure Security Group
# Go to ECS Console → Security Groups → Add Rule
# Type: Custom TCP, Port: 80, Source: 0.0.0.0/0
```

### Issue 5: Containers Keep Restarting

**Check Logs:**
```bash
# View all logs
docker compose logs

# View specific service
docker compose logs backend -f

# Check resource usage
docker stats
```

**Common Causes:**
- Out of memory → Increase server RAM or reduce workers
- Port conflict → Change ports in docker-compose.yml
- Database connection issues → Check MongoDB logs

---

## 📊 Package Verification Checklist

Before deployment, verify:

- [ ] `backend/requirements.txt` does NOT contain `emergentintegrations`
- [ ] `frontend/build/` folder exists with compiled React app
- [ ] `frontend/Dockerfile` is the production version (uses pre-built files)
- [ ] `backend/.env` has your OpenAI API key
- [ ] All `.env.template` files are present
- [ ] `docker-compose.yml` is configured correctly

---

## 🔐 Production Hardening

### 1. MongoDB Security

**Add Authentication:**
```yaml
# In docker-compose.yml, update mongo service:
mongo:
  environment:
    MONGO_INITDB_ROOT_USERNAME: admin
    MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
```

**Update backend/.env:**
```bash
MONGO_URL=mongodb://admin:${MONGO_PASSWORD}@mongo:27017/procureflix?authSource=admin
```

### 2. SSL/HTTPS Setup

**Get SSL Certificate (Let's Encrypt):**
```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com
```

**Update nginx.conf:**
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of config
}
```

**Update docker-compose.yml:**
```yaml
frontend:
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - /etc/letsencrypt:/etc/nginx/ssl:ro
```

### 3. CORS Configuration

**Update backend/.env:**
```bash
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### 4. Monitoring & Logs

**View Logs:**
```bash
# Real-time logs
docker compose logs -f

# Save logs
docker compose logs > logs-$(date +%Y%m%d).txt
```

**Setup Log Rotation:**
```bash
# Create logrotate config
sudo nano /etc/logrotate.d/docker-procureflix

# Add:
/var/lib/docker/containers/*/*.log {
  rotate 7
  daily
  compress
  missingok
  delaycompress
  copytruncate
}
```

---

## 🔄 Backup & Recovery

### Backup MongoDB Data

```bash
# Create backup
docker compose exec mongo mongodump --archive --gzip > backup-$(date +%Y%m%d).gz

# Copy to secure location
scp backup-*.gz user@backup-server:/backups/
```

### Restore from Backup

```bash
# Stop services
docker compose down

# Restore data
docker compose up -d mongo
docker compose exec -T mongo mongorestore --archive --gzip < backup-20250106.gz

# Start all services
docker compose up -d
```

### Backup Configuration

```bash
# Backup .env files and configs
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  backend/.env \
  docker-compose.yml \
  frontend/nginx.conf
```

---

## 📈 Scaling & Performance

### Increase Backend Workers

**Edit docker-compose.yml:**
```yaml
backend:
  command: ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "8"]
```

**Or edit backend/Dockerfile:**
```dockerfile
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "8"]
```

### Add More Backend Instances

```yaml
backend:
  deploy:
    replicas: 3
```

### Use External MongoDB

**Update backend/.env:**
```bash
MONGO_URL=mongodb://user:pass@your-mongodb-host:27017/procureflix
```

**Remove mongo from docker-compose.yml**

---

## 🌐 Alibaba Cloud Specific Notes

### ECS Instance Recommendations

**Minimum:**
- Instance Type: ecs.t6-c1m2.large
- vCPU: 2 cores
- Memory: 4 GB
- Disk: 40 GB

**Recommended:**
- Instance Type: ecs.c6.xlarge
- vCPU: 4 cores
- Memory: 8 GB
- Disk: 100 GB SSD

### Security Group Configuration

**Inbound Rules:**
| Protocol | Port | Source | Description |
|----------|------|---------|-------------|
| TCP | 22 | Your IP | SSH |
| TCP | 80 | 0.0.0.0/0 | HTTP |
| TCP | 443 | 0.0.0.0/0 | HTTPS |

**Outbound Rules:**
| Protocol | Port | Destination | Description |
|----------|------|-------------|-------------|
| ALL | ALL | 0.0.0.0/0 | Allow all outbound |

### Install Docker on Alibaba Cloud Ubuntu 24.04

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

---

## ✅ Deployment Success Checklist

After deployment, verify:

- [ ] Backend API responds: `curl http://localhost:8001/api/health`
- [ ] ProcureFlix API responds: `curl http://localhost:8001/api/procureflix/health`
- [ ] Frontend loads: Open `http://your-ip` in browser
- [ ] Login works: `admin@sourcevia.com` / `admin123`
- [ ] ProcureFlix dashboard loads: Navigate to `/pf/`
- [ ] Vendors module shows seed data (3 vendors)
- [ ] AI features work (if enabled): Test vendor risk analysis
- [ ] All containers healthy: `docker compose ps`
- [ ] No errors in logs: `docker compose logs`

---

## 📞 Support & Resources

### Documentation Files
- `DOCKER_TESTING_CHECKLIST.md` - Comprehensive testing guide
- `PRODUCTION_DEPLOYMENT.md` - Full deployment reference
- `DOCKER_VALIDATION_REPORT.md` - Package validation details
- `PACKAGE_CONTENTS.md` - Package overview
- `SHAREPOINT_INTEGRATION.md` - SharePoint setup (future)

### API Documentation
- Interactive Docs: `http://your-ip:8001/docs`
- OpenAPI Spec: `http://your-ip:8001/openapi.json`

### Default Credentials
- **Admin:** admin@sourcevia.com / admin123
- **Procurement:** po@sourcevia.com / po123456
- **Operations:** user@sourcevia.com / user12345

---

## 🎉 You're All Set!

Your ProcureFlix instance should now be running successfully on your external server. The application is fully functional with:

✅ Backend API on port 8001
✅ Frontend UI on port 80
✅ MongoDB for user data
✅ In-memory storage for ProcureFlix data
✅ AI-powered analysis (if configured)
✅ Complete procurement workflow modules

**Next Steps:**
1. Change default passwords
2. Configure production domain and SSL
3. Set up regular backups
4. Monitor resource usage
5. Consider SharePoint integration for persistent storage

---

**Package Version:** 1.0 (Standalone Production)  
**Build Date:** December 2024  
**Verified On:** Ubuntu 24.04 LTS + Docker 20.10+  
**Status:** ✅ Ready for Production Deployment
