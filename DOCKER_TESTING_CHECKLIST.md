# ProcureFlix - Docker Testing & Deployment Checklist

## 📋 Pre-Deployment Validation

This checklist ensures your Docker deployment is configured correctly before building and running.

---

## ✅ Phase 1: Environment Preparation

### 1.1 Required Software
- [ ] Docker installed (version 20.10+)
- [ ] Docker Compose installed (version 2.0+)
- [ ] At least 4GB available RAM
- [ ] At least 10GB available disk space

**Verification Commands:**
```bash
docker --version
docker compose version
docker system df  # Check available space
```

### 1.2 Required API Keys
- [ ] OpenAI API Key obtained (if using AI features)
- [ ] OR Anthropic/Google API Key (if using alternative AI provider)
- [ ] SharePoint credentials (optional - only if using SharePoint backend)

**Where to get API keys:**
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/
- Google AI: https://makersuite.google.com/app/apikey

---

## ✅ Phase 2: Configuration Setup

### 2.1 Backend Configuration

**Step 1:** Navigate to the project directory:
```bash
cd /path/to/procureflix
```

**Step 2:** Create backend .env file from template:
```bash
cp backend/.env.template backend/.env
```

**Step 3:** Edit `backend/.env` and configure:

**Required Variables:**
```bash
# Database (leave as-is for Docker)
MONGO_URL=mongodb://mongo:27017/procureflix

# Data Backend
PROCUREFLIX_DATA_BACKEND=memory

# AI Configuration (REQUIRED for AI features)
PROCUREFLIX_AI_ENABLED=true
PROCUREFLIX_AI_PROVIDER=openai
PROCUREFLIX_AI_MODEL=gpt-4
OPENAI_API_KEY=your-actual-openai-api-key-here

# CORS (update with your production domain)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:80,http://localhost
```

**Optional Variables (for SharePoint integration):**
```bash
# Only if PROCUREFLIX_DATA_BACKEND=sharepoint
SHAREPOINT_SITE_URL=https://your-tenant.sharepoint.com/sites/ProcureFlix
SHAREPOINT_TENANT_ID=your-tenant-id
SHAREPOINT_CLIENT_ID=your-client-id
SHAREPOINT_CLIENT_SECRET=your-client-secret
```

**Checklist:**
- [ ] `backend/.env` file created
- [ ] `OPENAI_API_KEY` added (or commented out if AI disabled)
- [ ] `MONGO_URL` points to `mongodb://mongo:27017/procureflix` (Docker network)
- [ ] `PROCUREFLIX_DATA_BACKEND` set to `memory` or `sharepoint`

### 2.2 Frontend Configuration

**Step 1:** Create frontend .env file (OPTIONAL):
```bash
cp frontend/.env.template frontend/.env
```

**Note:** Frontend .env is **OPTIONAL** for Docker deployment because nginx automatically proxies API requests to the backend. Only create this file if:
- You're running frontend in development mode (`yarn start`)
- Your backend is on a different server/domain

**For standard Docker Compose deployment:**
- Leave `frontend/.env` empty or don't create it
- Nginx will handle all API routing internally

**Checklist:**
- [ ] Understand that frontend .env is optional for Docker
- [ ] If created, either leave empty or set only for development/custom backend

### 2.3 Docker Compose Configuration Review

**Verify `docker-compose.yml` settings:**

```yaml
# Backend environment variables in docker-compose.yml
backend:
  environment:
    - MONGO_URL=mongodb://mongo:27017/procureflix
    - PROCUREFLIX_DATA_BACKEND=memory
    - PROCUREFLIX_AI_ENABLED=true
    - PROCUREFLIX_AI_PROVIDER=openai
    - PROCUREFLIX_AI_MODEL=gpt-4
```

**Checklist:**
- [ ] Backend container exposes port 8001
- [ ] Frontend container exposes port 80
- [ ] MongoDB container exposes port 27017 (internal only for security)
- [ ] All services are on `procureflix-network`
- [ ] Health checks are configured for all services

---

## ✅ Phase 3: Docker Build Process

### 3.1 Clean Previous Build (if any)
```bash
# Stop and remove previous containers
docker compose down -v

# Remove old images (optional but recommended)
docker compose down --rmi all -v

# Verify cleanup
docker compose ps  # Should show no containers
```

### 3.2 Build All Images

**Command:**
```bash
docker compose build --no-cache
```

**Expected Output:**
```
[+] Building frontend
 => [internal] load build context
 => => transferring context
 => [build 1/5] FROM docker.io/library/node:18-alpine
 => [build 2/5] WORKDIR /app
 => [build 3/5] COPY package.json yarn.lock ./
 => [build 4/5] RUN yarn install --frozen-lockfile
 => [build 5/5] COPY . .
 => [build] RUN yarn build
 => [stage-1 1/3] FROM docker.io/library/nginx:alpine
 => [stage-1 2/3] COPY nginx.conf /etc/nginx/nginx.conf
 => [stage-1 3/3] COPY --from=build /app/build /usr/share/nginx/html
 => => exporting to image

[+] Building backend
 => [internal] load build context
 => [1/5] FROM docker.io/library/python:3.11-slim
 => [2/5] WORKDIR /app
 => [3/5] COPY requirements.txt .
 => [4/5] RUN pip install --no-cache-dir -r requirements.txt
 => [5/5] COPY . .
 => => exporting to image
```

**Checklist:**
- [ ] Frontend build completed without errors
- [ ] Backend build completed without errors
- [ ] No permission denied errors
- [ ] No missing dependency errors

**Common Issues & Solutions:**

| Issue | Solution |
|-------|----------|
| `yarn install` fails | Check internet connection; try `--network-timeout 100000` |
| `pip install` fails | Verify requirements.txt; check PyPI access |
| `COPY` permission denied | Run with proper user permissions |
| Out of disk space | Clean Docker: `docker system prune -a` |

### 3.3 Verify Built Images

```bash
docker images | grep procureflix
```

**Expected Output:**
```
procureflix-backend     latest    abc123def456    2 minutes ago    450MB
procureflix-frontend    latest    def789ghi012    2 minutes ago    45MB
```

**Checklist:**
- [ ] Backend image created (size ~400-500MB)
- [ ] Frontend image created (size ~40-50MB)
- [ ] Images have recent timestamps

---

## ✅ Phase 4: Starting Services

### 4.1 Start All Services

**Command:**
```bash
docker compose up -d
```

**Expected Output:**
```
[+] Running 4/4
 ✔ Network procureflix_procureflix-network   Created
 ✔ Container procureflix-mongo              Started
 ✔ Container procureflix-backend            Started
 ✔ Container procureflix-frontend           Started
```

**Checklist:**
- [ ] All 3 containers started (mongo, backend, frontend)
- [ ] No error messages in output
- [ ] Services start in correct order (mongo → backend → frontend)

### 4.2 Verify Container Status

**Command:**
```bash
docker compose ps
```

**Expected Output:**
```
NAME                     IMAGE                    STATUS         PORTS
procureflix-backend      procureflix-backend      Up (healthy)   0.0.0.0:8001->8001/tcp
procureflix-frontend     procureflix-frontend     Up (healthy)   0.0.0.0:80->80/tcp
procureflix-mongo        mongo:7.0                Up (healthy)   27017/tcp
```

**Checklist:**
- [ ] All containers show "Up" status
- [ ] Health checks show "healthy" after 30-60 seconds
- [ ] Ports are correctly mapped:
  - Frontend: `0.0.0.0:80->80/tcp`
  - Backend: `0.0.0.0:8001->8001/tcp`
- [ ] MongoDB is running (internal port only)

---

## ✅ Phase 5: Health Checks & Verification

### 5.1 Backend Health Checks

**Test 1: Basic API Health**
```bash
curl -s http://localhost:8001/api/health | python3 -m json.tool
```

**Expected Response:**
```json
{
    "status": "ok",
    "database": "connected",
    "api_version": "1.0",
    "endpoints": {
        "login": "/api/auth/login",
        "register": "/api/auth/register",
        "docs": "/docs"
    }
}
```

**Test 2: ProcureFlix Health**
```bash
curl -s http://localhost:8001/api/procureflix/health | python3 -m json.tool
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

**Test 3: Vendors API (In-Memory Data)**
```bash
curl -s http://localhost:8001/api/procureflix/vendors | python3 -m json.tool | head -20
```

**Expected Response:** Array of vendor objects with seed data

**Checklist:**
- [ ] `/api/health` returns 200 OK
- [ ] Database status is "connected"
- [ ] `/api/procureflix/health` returns OK
- [ ] Data backend shows "memory"
- [ ] Vendors endpoint returns seed data

### 5.2 Frontend Health Checks

**Test 1: Frontend Accessibility**
```bash
curl -I http://localhost:80
```

**Expected Response:**
```
HTTP/1.1 200 OK
Server: nginx
Content-Type: text/html
```

**Test 2: API Proxy (via nginx)**
```bash
curl -s http://localhost:80/api/health | python3 -m json.tool
```

**Expected Response:** Same as backend `/api/health`

**Test 3: Browser Access**
- Open browser: http://localhost
- Should see ProcureFlix login page
- UI should load without console errors

**Checklist:**
- [ ] Frontend loads on http://localhost
- [ ] Login page displays correctly
- [ ] No 404 errors for static assets
- [ ] API proxy works (can reach backend via nginx)
- [ ] No CORS errors in browser console

### 5.3 End-to-End Login Test

**Test Login Flow:**
1. Open browser: http://localhost
2. Login with credentials:
   - Email: `admin@sourcevia.com`
   - Password: `admin123`
3. Should redirect to dashboard
4. Navigate to: http://localhost/pf/
5. Should see ProcureFlix dashboard with modules

**Checklist:**
- [ ] Login successful
- [ ] JWT token stored
- [ ] Redirect to dashboard works
- [ ] ProcureFlix UI loads
- [ ] Navigation works
- [ ] API calls succeed (check Network tab)

---

## ✅ Phase 6: Log Analysis

### 6.1 Check Container Logs

**Backend Logs:**
```bash
docker compose logs backend -f --tail=50
```

**Expected Patterns:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001
[ProcureFlix] Router mounted at /api/procureflix
🔒 CORS Configuration:
   Allowed Origins: ['http://localhost:3000', 'http://localhost:80', ...]
AI Client initialized: enabled=True, model=gpt-4
```

**Frontend Logs:**
```bash
docker compose logs frontend -f --tail=20
```

**Expected Patterns:**
```
/docker-entrypoint.sh: Launching /docker-entrypoint.d/
/docker-entrypoint.sh: Configuration complete; ready for start up
```

**MongoDB Logs:**
```bash
docker compose logs mongo -f --tail=20
```

**Expected Patterns:**
```
"msg":"Waiting for connections","attr":{"port":27017}
```

**Checklist:**
- [ ] No error messages in backend logs
- [ ] No startup failures in any service
- [ ] CORS configuration logged correctly
- [ ] ProcureFlix router mounted successfully
- [ ] AI client initialized (if enabled)

### 6.2 Common Log Issues

| Log Message | Issue | Solution |
|-------------|-------|----------|
| `Connection refused` to MongoDB | Backend started before Mongo ready | Wait 30s; check `depends_on` in docker-compose.yml |
| `CORS error` | Missing origin in ALLOWED_ORIGINS | Add frontend URL to backend .env |
| `AI client failed` | Invalid API key | Check OPENAI_API_KEY in backend .env |
| `Module not found` | Missing Python package | Rebuild backend: `docker compose build --no-cache backend` |
| `404 Not Found` for assets | Frontend build issue | Rebuild frontend: `docker compose build --no-cache frontend` |

---

## ✅ Phase 7: AI Features Testing (Optional)

### 7.1 Test AI Endpoints

**Only if `PROCUREFLIX_AI_ENABLED=true` and API key is configured**

**Test 1: Vendor Risk Analysis**
```bash
curl -s http://localhost:8001/api/procureflix/vendors/vendor-tech-innovate/ai/risk-explanation | python3 -m json.tool
```

**Expected Response:**
```json
{
    "ai_enabled": true,
    "risk_explanation": "...",
    "key_factors": ["..."],
    "recommendations": ["..."]
}
```

**Test 2: Contract Analysis**
```bash
curl -s http://localhost:8001/api/procureflix/contracts/contract-001/ai/analysis | python3 -m json.tool
```

**Checklist:**
- [ ] AI endpoints return `ai_enabled: true`
- [ ] Responses include generated content
- [ ] No API key errors
- [ ] Response time < 10 seconds

### 7.2 AI Troubleshooting

| Issue | Check | Solution |
|-------|-------|----------|
| `ai_enabled: false` | API key missing | Set OPENAI_API_KEY in backend/.env; restart: `docker compose restart backend` |
| `401 Unauthorized` | Invalid API key | Verify API key is correct; check OpenAI dashboard |
| `429 Rate limit` | Too many requests | Wait or upgrade OpenAI plan |
| Timeout errors | Slow LLM response | Increase timeout in nginx.conf (`proxy_read_timeout`) |

---

## ✅ Phase 8: Production Deployment Prep

### 8.1 Security Checklist

- [ ] Change default MongoDB password (if using external MongoDB)
- [ ] Set strong API keys (not demo/test keys)
- [ ] Update CORS origins to production domain only
- [ ] Enable HTTPS/SSL certificates
- [ ] Set `DEBUG=false` in backend .env
- [ ] Review nginx security headers
- [ ] Set up firewall rules (only ports 80, 443 exposed)

### 8.2 Update for Production Domain

**Step 1:** Update `backend/.env`:
```bash
ALLOWED_ORIGINS=https://your-production-domain.com,https://www.your-production-domain.com
ENVIRONMENT=production
DEBUG=false
```

**Step 2:** Update nginx for HTTPS (add SSL block in `frontend/nginx.conf`):
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # ... rest of configuration
}
```

**Step 3:** Update `docker-compose.yml` for production:
```yaml
frontend:
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./ssl:/etc/nginx/ssl:ro
```

**Checklist:**
- [ ] Production domain configured
- [ ] SSL certificates obtained (e.g., Let's Encrypt)
- [ ] CORS updated for production URLs
- [ ] Debug mode disabled
- [ ] Strong API keys set

---

## ✅ Phase 9: Performance Verification

### 9.1 Resource Usage Check

```bash
docker stats
```

**Expected Resource Usage:**
```
CONTAINER          CPU %    MEM USAGE / LIMIT     MEM %
procureflix-backend    0.5%     250MB / 4GB          6.25%
procureflix-frontend   0.1%     50MB / 4GB           1.25%
procureflix-mongo      0.3%     150MB / 4GB          3.75%
```

**Checklist:**
- [ ] Backend memory < 500MB under normal load
- [ ] Frontend memory < 100MB
- [ ] MongoDB memory < 500MB
- [ ] CPU usage < 5% when idle
- [ ] No memory leaks (stable over time)

### 9.2 Response Time Check

**Measure API response times:**
```bash
time curl -s http://localhost:8001/api/health > /dev/null
```

**Expected:** < 100ms

**Measure frontend load time:**
```bash
time curl -s http://localhost > /dev/null
```

**Expected:** < 200ms

**Checklist:**
- [ ] API response times < 200ms
- [ ] Frontend loads < 500ms
- [ ] No timeout errors
- [ ] Consistent performance across requests

---

## ✅ Phase 10: Backup & Persistence

### 10.1 Data Persistence Verification

**Check Docker volumes:**
```bash
docker volume ls | grep procureflix
```

**Expected Output:**
```
procureflix_mongo-data
procureflix_mongo-config
procureflix_backend-logs
```

**Checklist:**
- [ ] MongoDB data volume exists
- [ ] Volumes persist after `docker compose down`
- [ ] Logs are collected in backend-logs volume

### 10.2 Backup Strategy

**Create backup script:**
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/procureflix"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup MongoDB
docker compose exec -T mongo mongodump --archive --gzip > $BACKUP_DIR/mongo_$DATE.gz

# Backup configuration
tar -czf $BACKUP_DIR/config_$DATE.tar.gz backend/.env frontend/.env docker-compose.yml

echo "Backup completed: $BACKUP_DIR"
```

**Checklist:**
- [ ] Backup script created
- [ ] Test backup creation
- [ ] Test backup restoration
- [ ] Set up automated backups (cron job)

---

## 🚨 Troubleshooting Guide

### Issue: Containers Won't Start

**Check:**
```bash
docker compose logs
docker compose ps
docker events
```

**Common Causes:**
- Port already in use → Change ports in docker-compose.yml
- Insufficient memory → Increase Docker memory limit
- File permission errors → Check file ownership

### Issue: Backend Can't Connect to MongoDB

**Check:**
```bash
docker compose exec backend ping mongo
docker compose logs mongo
```

**Common Causes:**
- MongoDB not ready → Wait 30-60 seconds; check health status
- Wrong MONGO_URL → Verify it's `mongodb://mongo:27017/procureflix`
- Network issues → Restart: `docker compose restart`

### Issue: Frontend Shows 502 Bad Gateway

**Check:**
```bash
docker compose logs nginx
curl http://localhost/api/health
```

**Common Causes:**
- Backend not running → Check backend status
- Nginx misconfiguration → Verify nginx.conf proxy_pass
- Backend not healthy → Wait for health check to pass

### Issue: API Key Errors

**Check:**
```bash
docker compose exec backend printenv | grep API_KEY
docker compose logs backend | grep -i "api key"
```

**Common Causes:**
- Key not set → Add to backend/.env and restart
- Invalid key → Verify key in provider dashboard
- Key not loaded → Restart: `docker compose restart backend`

---

## 📦 Deployment Platforms

### Alibaba Cloud ECS

**Prerequisites:**
- ECS instance with Docker installed
- Security group rules for ports 80, 443

**Deploy:**
```bash
# SSH to ECS instance
ssh user@your-ecs-ip

# Clone/upload project
scp -r procureflix user@your-ecs-ip:/opt/

# Deploy
cd /opt/procureflix
docker compose up -d
```

### AWS EC2

**Prerequisites:**
- EC2 instance (t3.medium or larger)
- Security group: Allow ports 80, 443, 22

**Deploy:**
```bash
# Install Docker on Ubuntu
sudo apt-get update
sudo apt-get install docker.io docker-compose-plugin

# Deploy
cd /path/to/procureflix
docker compose up -d
```

### Other Platforms

- Azure Container Instances
- Google Cloud Run
- DigitalOcean Droplet
- Any VPS with Docker support

---

## ✅ Final Verification Checklist

Before considering deployment complete:

- [ ] All health checks passing
- [ ] Login flow works end-to-end
- [ ] ProcureFlix modules accessible
- [ ] Vendors data loads (in-memory)
- [ ] AI features work (if enabled)
- [ ] No errors in any container logs
- [ ] Resource usage within limits
- [ ] Backup strategy in place
- [ ] SSL configured (for production)
- [ ] Security best practices applied
- [ ] Documentation reviewed
- [ ] Team trained on operation

---

## 📞 Support & Documentation

- **Full Deployment Guide:** See `PRODUCTION_DEPLOYMENT.md`
- **SharePoint Integration:** See `SHAREPOINT_INTEGRATION.md`
- **API Documentation:** Access at `http://your-domain/docs`
- **Health Endpoints:**
  - Backend: http://your-domain:8001/api/health
  - ProcureFlix: http://your-domain:8001/api/procureflix/health

---

## 🎯 Success Criteria

Your Docker deployment is successful when:

✅ All containers are running and healthy
✅ Frontend loads and login works
✅ Backend APIs respond correctly
✅ In-memory data is populated
✅ AI features work (if configured)
✅ No errors in logs
✅ Performance is acceptable
✅ Ready for user testing

**Congratulations! Your ProcureFlix instance is now running in Docker! 🎉**
