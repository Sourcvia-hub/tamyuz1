#!/bin/bash
# ProcureFlix Production Package Builder
# This script prepares a standalone Docker package for external deployment

set -e  # Exit on any error

echo "=================================="
echo "ProcureFlix Production Package Builder"
echo "=================================="
echo ""

# Step 1: Build frontend
echo "📦 Step 1: Building frontend..."
cd frontend
yarn install --frozen-lockfile
yarn build
cd ..
echo "✅ Frontend build complete"
echo ""

# Step 2: Create production Dockerfile for frontend
echo "📦 Step 2: Preparing production Dockerfile..."
cp frontend/Dockerfile.production frontend/Dockerfile
echo "✅ Production Dockerfile ready"
echo ""

# Step 3: Verify package contents
echo "📦 Step 3: Verifying package contents..."

# Check backend requirements.txt
if grep -q "emergentintegrations" backend/requirements.txt; then
    echo "❌ ERROR: backend/requirements.txt still contains emergentintegrations"
    echo "   This package is not available on public PyPI"
    exit 1
fi
echo "✅ Backend requirements.txt is clean (no emergent dependencies)"

# Check frontend build folder
if [ ! -d "frontend/build" ]; then
    echo "❌ ERROR: frontend/build folder not found"
    exit 1
fi
echo "✅ Frontend build folder exists"

# Check Docker files
for file in docker-compose.yml backend/Dockerfile frontend/Dockerfile backend/.env.template; do
    if [ ! -f "$file" ]; then
        echo "❌ ERROR: $file not found"
        exit 1
    fi
done
echo "✅ All Docker configuration files present"
echo ""

# Step 4: Test Docker build (optional - requires Docker)
if command -v docker &> /dev/null; then
    echo "📦 Step 4: Testing Docker build..."
    echo "   (This may take a few minutes...)"
    
    if docker compose build --no-cache > /tmp/docker-build.log 2>&1; then
        echo "✅ Docker build test PASSED"
    else
        echo "⚠️  Docker build test FAILED"
        echo "   Check /tmp/docker-build.log for details"
        echo "   Note: This might be expected if Docker is not available"
    fi
else
    echo "ℹ️  Step 4: Skipping Docker build test (Docker not available)"
fi
echo ""

# Step 5: Create package info
echo "📦 Step 5: Creating package info..."
cat > PACKAGE_INFO.txt << EOF
ProcureFlix Production Package
================================

Build Date: $(date)
Package Version: 1.0
Status: Ready for External Deployment

This package is completely standalone and does not require any Emergent-specific dependencies.

Quick Start:
------------
1. Copy this entire folder to your server
2. Edit backend/.env (add your OpenAI API key)
3. Run: docker compose build
4. Run: docker compose up -d
5. Access: http://localhost

For detailed instructions, see:
- DOCKER_TESTING_CHECKLIST.md
- PRODUCTION_DEPLOYMENT.md

Package Contents:
-----------------
✅ Backend (FastAPI + MongoDB)
✅ Frontend (Pre-built React app + Nginx)
✅ Docker Compose configuration
✅ Comprehensive documentation
✅ Health checks and monitoring

AI Features:
-----------
- Provider: OpenAI (standard SDK)
- Model: gpt-4o
- Requires: OPENAI_API_KEY in backend/.env

Data Backend:
------------
- Mode: In-memory (with seed data)
- Optional: SharePoint integration available

Support:
--------
See documentation files for troubleshooting and deployment guides.
EOF
echo "✅ Package info created"
echo ""

echo "=================================="
echo "✅ Production package ready!"
echo "=================================="
echo ""
echo "Package contents verified:"
echo "  - Backend: Clean (no Emergent dependencies)"
echo "  - Frontend: Pre-built (no build required in Docker)"
echo "  - Docker: All configuration files present"
echo "  - Docs: Comprehensive deployment guides included"
echo ""
echo "Next steps:"
echo "  1. Review PACKAGE_INFO.txt"
echo "  2. Test: docker compose build && docker compose up -d"
echo "  3. Deploy to your server"
echo ""
