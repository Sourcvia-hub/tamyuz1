# 📦 Alibaba Cloud (KSA) Database Configuration Guide

## Overview
Configure Sourcevia application to store data in Alibaba Cloud KSA region using ApsaraDB for MongoDB.

---

## 🎯 Option 1: ApsaraDB for MongoDB (Recommended)

### Step 1: Create MongoDB Instance on Alibaba Cloud

1. **Log in to Alibaba Cloud Console**
   - Go to: https://www.alibabacloud.com/
   - Select **KSA (Saudi Arabia)** region

2. **Create ApsaraDB for MongoDB Instance**
   - Navigate to: **Products** → **ApsaraDB for MongoDB**
   - Click **Create Instance**
   
   **Configuration:**
   ```
   Region: Saudi Arabia (Riyadh)
   Zone: Choose any available zone
   Engine Version: MongoDB 4.4 or 5.0
   Replication Factor: 3 nodes (High Availability)
   Storage Type: Enhanced SSD
   Storage Capacity: 20GB (can scale up)
   Network Type: VPC
   ```

3. **Configure Network Access**
   - Add your server IP (8.213.83.123) to whitelist
   - Or enable public network access temporarily for testing
   
4. **Create Database and User**
   ```
   Database Name: sourcevia
   Username: sourcevia_user
   Password: [Generate strong password]
   ```

5. **Get Connection String**
   
   Your connection string will look like:
   ```
   mongodb://sourcevia_user:YOUR_PASSWORD@dds-xxxxx.mongodb.rds.aliyuncs.com:3717,dds-xxxxx.mongodb.rds.aliyuncs.com:3717/sourcevia?replicaSet=mgset-xxxxx
   ```

---

### Step 2: Update Application Configuration

**On your Alibaba Cloud server (8.213.83.123):**

1. **Update Backend Environment Variables**

   Edit `/path/to/app/backend/.env`:
   ```bash
   # MongoDB Configuration - Alibaba Cloud
   MONGO_URL=mongodb://sourcevia_user:YOUR_PASSWORD@dds-xxxxx.mongodb.rds.aliyuncs.com:3717,dds-xxxxx.mongodb.rds.aliyuncs.com:3717/sourcevia?replicaSet=mgset-xxxxx&authSource=admin
   ```

2. **Update docker-compose.yml**

   Remove local MongoDB container and use cloud connection:
   ```yaml
   version: '3.8'
   
   services:
     backend:
       build: ./backend
       ports:
         - "8001:8001"
       environment:
         - MONGO_URL=${MONGO_URL}
         - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
         - OPENAI_API_KEY=${OPENAI_API_KEY}
       env_file:
         - ./backend/.env
       restart: always
   
     frontend:
       build: ./frontend
       ports:
         - "80:80"
       environment:
         - REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
       restart: always
   
   # Remove mongo service - using Alibaba Cloud MongoDB
   ```

3. **Rebuild and Restart**
   ```bash
   docker compose down
   docker compose up -d --build
   ```

---

### Step 3: Migrate Existing Data (If Applicable)

If you have existing data to migrate:

**Using mongodump and mongorestore:**

```bash
# 1. Backup from local/current database
mongodump --uri="mongodb://localhost:27017/procureflix" --out=/tmp/backup

# 2. Restore to Alibaba Cloud MongoDB
mongorestore --uri="mongodb://sourcevia_user:YOUR_PASSWORD@dds-xxxxx.mongodb.rds.aliyuncs.com:3717/sourcevia?replicaSet=mgset-xxxxx&authSource=admin" /tmp/backup/procureflix --nsFrom="procureflix.*" --nsTo="sourcevia.*"
```

**Or using MongoDB Compass (GUI tool):**
1. Connect to local MongoDB
2. Export collections
3. Connect to Alibaba Cloud MongoDB
4. Import collections

---

## 🎯 Option 2: Self-Managed MongoDB on ECS

If you prefer full control, deploy MongoDB on Alibaba Cloud ECS:

### Step 1: Create ECS Instance

1. **Launch ECS Instance**
   ```
   Region: Saudi Arabia (Riyadh)
   Instance Type: ecs.c6.large (2 vCPU, 4GB RAM minimum)
   OS: Ubuntu 22.04
   Disk: 50GB SSD
   Network: Same VPC as your application server
   ```

2. **Configure Security Group**
   - Allow port 27017 from your application server IP
   - Do NOT expose MongoDB to public internet

### Step 2: Install MongoDB on ECS

```bash
# SSH to ECS instance
ssh root@<ECS_IP>

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Configure MongoDB for remote access
sudo nano /etc/mongod.conf
```

**Update mongod.conf:**
```yaml
net:
  port: 27017
  bindIp: 0.0.0.0  # Listen on all interfaces

security:
  authorization: enabled
```

**Create admin user:**
```bash
mongosh

use admin
db.createUser({
  user: "admin",
  pwd: "STRONG_PASSWORD",
  roles: [ { role: "root", db: "admin" } ]
})

use sourcevia
db.createUser({
  user: "sourcevia_user",
  pwd: "STRONG_PASSWORD",
  roles: [ { role: "readWrite", db: "sourcevia" } ]
})
exit

sudo systemctl restart mongod
```

### Step 3: Update Application

**Connection String:**
```
MONGO_URL=mongodb://sourcevia_user:PASSWORD@<ECS_PRIVATE_IP>:27017/sourcevia?authSource=sourcevia
```

---

## 🔒 Security Best Practices

### 1. Network Security

**For ApsaraDB:**
- Use VPC connection (not public internet)
- Whitelist only your application server IP
- Use SSL/TLS connection

**For Self-Managed:**
- Use private network only
- Configure Security Group rules strictly
- Enable firewall (ufw) on ECS

### 2. Authentication

```bash
# Use strong passwords
# Minimum 16 characters, mix of upper/lower/numbers/symbols

# Example strong password generation:
openssl rand -base64 32
```

### 3. Connection String Security

```bash
# Never commit .env file to git
# Add to .gitignore:
echo "backend/.env" >> .gitignore
echo "frontend/.env" >> .gitignore

# Use environment variables only
# Never hardcode connection strings
```

---

## 📊 Cost Estimate (Alibaba Cloud KSA)

### ApsaraDB for MongoDB
```
Configuration: 2GB RAM, 20GB Storage, 3-node replica set
Monthly Cost: ~$50-80 USD
Includes: High availability, automatic backups, monitoring
```

### Self-Managed on ECS
```
ECS Instance: ecs.c6.large (2 vCPU, 4GB RAM)
Storage: 50GB SSD
Monthly Cost: ~$30-40 USD
Note: You manage backups, monitoring, scaling yourself
```

---

## ✅ Verification Steps

After configuration, test the connection:

### 1. Test from Application Server

```bash
# Install mongo shell
sudo apt-get install mongodb-clients

# Test connection
mongosh "mongodb://sourcevia_user:PASSWORD@YOUR_MONGODB_HOST:27017/sourcevia"

# List databases
show dbs

# Check collections
use sourcevia
show collections
```

### 2. Test Application

```bash
# Check backend logs
docker logs backend

# Should see:
# ✅ Connected to MongoDB
# ✅ Database: sourcevia
```

### 3. Test CRUD Operations

- Login to application
- Create a vendor
- Create a purchase request
- Verify data persists after container restart

---

## 🔄 Backup Strategy

### Automated Backups (ApsaraDB)
- Alibaba Cloud automatically backs up daily
- Retention: 7-30 days (configurable)
- Point-in-time recovery available

### Manual Backups (Self-Managed)

**Create backup script:**
```bash
#!/bin/bash
# /root/mongodb_backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mongodb"
mkdir -p $BACKUP_DIR

mongodump --uri="mongodb://sourcevia_user:PASSWORD@localhost:27017/sourcevia" --out="$BACKUP_DIR/backup_$DATE"

# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed: $DATE"
```

**Schedule daily backups:**
```bash
chmod +x /root/mongodb_backup.sh
crontab -e

# Add line:
0 2 * * * /root/mongodb_backup.sh >> /var/log/mongodb_backup.log 2>&1
```

---

## 🚨 Troubleshooting

### Issue: Connection Timeout

**Check:**
1. Security Group allows port 27017
2. MongoDB is running: `sudo systemctl status mongod`
3. Firewall allows connection: `sudo ufw status`
4. Connection string is correct

### Issue: Authentication Failed

**Check:**
1. Username and password are correct
2. User has permissions on the database
3. authSource parameter is correct in connection string

### Issue: Slow Performance

**Solutions:**
1. Create indexes on frequently queried fields
2. Upgrade instance size if needed
3. Enable MongoDB profiling to identify slow queries
4. Use connection pooling (already configured in backend)

---

## 📞 Support

**Alibaba Cloud Support:**
- KSA Support: https://www.alibabacloud.com/support
- Documentation: https://www.alibabacloud.com/help/apsaradb-for-mongodb

**MongoDB Support:**
- Documentation: https://docs.mongodb.com/
- Community: https://community.mongodb.com/

---

## ✅ Next Steps

1. ✅ Choose deployment option (ApsaraDB or Self-Managed)
2. ✅ Create MongoDB instance in Alibaba Cloud KSA region
3. ✅ Get connection string
4. ✅ Update backend/.env with MONGO_URL
5. ✅ Rebuild and restart application
6. ✅ Migrate existing data (if any)
7. ✅ Test connection and CRUD operations
8. ✅ Set up automated backups
9. ✅ Monitor performance

**Your data will now be stored in Alibaba Cloud KSA region with high availability and automatic backups.**
