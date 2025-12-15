# 📦 Database Backup & Restore Guide

Yeh guide aapko batayegi ke aap apna data kaise secure aur safe backup kar sakte hain.

## 🚀 Quick Start

### Manual Backup (Ek baar backup banane ke liye)

```bash
cd backend
npm run backup
```

Backup `backend/backups/` folder mein save hoga.

### Available Backups Dekhne Ke Liye

```bash
npm run list-backups
```

### Restore Karne Ke Liye

```bash
npm run restore backup-medical-service-2024-01-15T10-30-00.tar.gz
```

---

## 📋 Backup Options

### Option 1: Local Backup (Computer Par)

**Pros:**
- ✅ Fast aur easy
- ✅ Free
- ✅ Offline access

**Cons:**
- ❌ Computer damage ho to data loss
- ❌ Manual backup karna padta hai

**Setup:**
1. Backup script already ready hai
2. Run: `npm run backup`
3. Backup `backend/backups/` folder mein save hoga

---

### Option 2: Cloud Storage (Google Drive, Dropbox, OneDrive)

**Pros:**
- ✅ Automatic sync
- ✅ Multiple devices se access
- ✅ Secure cloud storage

**Steps:**

#### Google Drive:
1. `backend/backups/` folder ko Google Drive Desktop app se sync karein
2. Ya manually backup files ko Google Drive mein upload karein

#### Dropbox:
1. `backend/backups/` folder ko Dropbox folder mein move karein
2. Ya Dropbox Desktop app install karein aur folder sync karein

#### OneDrive:
1. `backend/backups/` folder ko OneDrive folder mein move karein
2. Automatic sync ho jayega

---

### Option 3: MongoDB Atlas Automated Backups (Best Option)

**Pros:**
- ✅ Automatic daily backups
- ✅ Point-in-time recovery
- ✅ Secure cloud storage
- ✅ Free tier available

**Setup:**

1. **MongoDB Atlas Account:**
   - https://www.mongodb.com/cloud/atlas
   - Free account banayein (M0 cluster - Free forever)

2. **Enable Automated Backups:**
   - Atlas dashboard → Clusters → Your Cluster
   - "Backups" tab → "Enable Cloud Backup"
   - Free tier: Daily snapshots (last 2 days)
   - Paid tier: More retention options

3. **Manual Backup Download:**
   - Atlas → Backups → Snapshot → Download
   - Ya API se download karein

---

### Option 4: External Hard Drive / USB

**Pros:**
- ✅ Offline storage
- ✅ Large capacity
- ✅ Portable

**Steps:**
1. Backup banayein: `npm run backup`
2. Backup file ko external drive mein copy karein
3. Multiple copies banayein (safety ke liye)

---

### Option 5: Automated Daily Backups (Cron Job / Task Scheduler)

**Windows (Task Scheduler):**

1. Task Scheduler open karein
2. "Create Basic Task"
3. Name: "Daily Database Backup"
4. Trigger: Daily, 2:00 AM
5. Action: Start a program
6. Program: `node`
7. Arguments: `C:\path\to\backend\scripts\backup.js`
8. Working directory: `C:\path\to\backend`

**Linux/Mac (Cron):**

```bash
# Crontab edit karein
crontab -e

# Daily backup at 2 AM
0 2 * * * cd /path/to/backend && node scripts/backup.js >> logs/backup.log 2>&1
```

---

## 🔐 Security Best Practices

### 1. **Encrypt Backups**

Backup files ko encrypt karein sensitive data ke liye:

```bash
# Windows: Use 7-Zip with password
# Linux/Mac: Use zip with encryption
zip -e backup-encrypted.zip backup-file.tar.gz
```

### 2. **Multiple Backup Locations**

- ✅ Local backup (computer par)
- ✅ Cloud backup (Google Drive/Dropbox)
- ✅ External drive backup
- ✅ MongoDB Atlas backup

### 3. **Regular Backup Schedule**

- **Daily:** Important data ke liye
- **Weekly:** Full database backup
- **Monthly:** Archive backup (long-term storage)

### 4. **Test Restore**

Regular basis par restore test karein:
```bash
npm run restore <backup-filename>
```

---

## 📁 Backup File Locations

### Default Location:
```
backend/backups/
├── backup-medical-service-2024-01-15T10-30-00.tar.gz
├── backup-medical-service-2024-01-16T10-30-00.tar.gz
└── ...
```

### Backup File Format:
- **Compressed:** `backup-<database>-<timestamp>.tar.gz`
- **JSON:** `backup-<database>-<timestamp>.json` (if mongodump not available)

---

## 🔄 Restore Process

### Step 1: Available Backups Dekhein
```bash
npm run list-backups
```

### Step 2: Restore Karein
```bash
npm run restore backup-medical-service-2024-01-15T10-30-00.tar.gz
```

**⚠️ Warning:** Restore karne se pehle current data delete ho jayega!

---

## 📊 Backup Size & Storage

### Typical Backup Sizes:
- Small database (< 1000 records): ~1-5 MB
- Medium database (1000-10000 records): ~5-50 MB
- Large database (> 10000 records): ~50-500 MB

### Storage Recommendations:
- **Local:** Minimum 1 GB free space
- **Cloud:** Google Drive (15 GB free), Dropbox (2 GB free)
- **External:** 32 GB+ USB drive recommended

---

## 🛠️ Troubleshooting

### Issue: "mongodump not found"
**Solution:** 
- MongoDB Database Tools install karein: https://www.mongodb.com/try/download/database-tools
- Ya Node.js backup use karein (automatic fallback)

### Issue: "Backup file too large"
**Solution:**
- Compress backup (already done automatically)
- Delete old backups: `npm run backup` automatically cleans 30+ day old backups

### Issue: "Permission denied"
**Solution:**
- `backend/backups/` folder ka permission check karein
- Windows: Run as Administrator
- Linux/Mac: `chmod 755 backend/backups/`

---

## 📝 Backup Checklist

- [ ] Daily automatic backup setup
- [ ] Cloud storage sync configured
- [ ] External drive backup created
- [ ] MongoDB Atlas backup enabled (if using Atlas)
- [ ] Backup restore tested
- [ ] Backup encryption enabled (for sensitive data)
- [ ] Multiple backup locations verified
- [ ] Backup schedule documented

---

## 🆘 Emergency Restore

Agar data loss ho jaye:

1. **Latest backup find karein:**
   ```bash
   npm run list-backups
   ```

2. **Restore karein:**
   ```bash
   npm run restore <latest-backup-file>
   ```

3. **Verify karein:**
   - Frontend open karein
   - Data check karein
   - All records verify karein

---

## 💡 Pro Tips

1. **3-2-1 Rule:**
   - 3 copies of data
   - 2 different storage types
   - 1 offsite backup

2. **Automated Backups:**
   - Cron job / Task Scheduler setup karein
   - Daily automatic backup enable karein

3. **MongoDB Atlas:**
   - Production ke liye Atlas use karein
   - Free tier se start karein
   - Automatic backups enable karein

4. **Backup Testing:**
   - Monthly restore test karein
   - Verify backup integrity

---

## 📞 Support

Agar backup/restore mein koi issue ho:
1. Check `BACKUP_GUIDE.md` file
2. Check backup logs
3. Verify MongoDB connection
4. Test with small backup first

---

**Last Updated:** 2024
**Version:** 1.0

