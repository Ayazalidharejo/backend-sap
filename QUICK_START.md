# 🚀 Quick Start Guide

## Step 1: Install Dependencies
```bash
cd backend
npm install
```

## Step 2: Create .env File
Create a file named `.env` in the `backend` folder with this content:

```env
# MongoDB Connection (choose one)

# Option 1: Local MongoDB
MONGODB_URI=mongodb://localhost:27017/medical-service

# Option 2: MongoDB Atlas (Cloud) - Recommended
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medical-service

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:5173

# JWT Secret (change this!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

## Step 3: Setup MongoDB

### Option A: MongoDB Atlas (Cloud - Free)
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free account
3. Create a free cluster
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Replace `<password>` and `<database>` in the string
7. Paste in `.env` file as `MONGODB_URI`

### Option B: Local MongoDB
1. Download MongoDB from https://www.mongodb.com/try/download/community
2. Install it
3. Start MongoDB service
4. Use `mongodb://localhost:27017/medical-service` in `.env`

## Step 4: Run the Server

```bash
# Development mode (auto-reload on changes)
npm run dev

# Production mode
npm start
```

## Step 5: Test the API

Open browser or use curl:
```
http://localhost:5000/api/health
```

You should see:
```json
{
  "status": "OK",
  "message": "Medical Service Backend API is running",
  "timestamp": "..."
}
```

## ✅ Success!

Backend is now running! You can now:
1. Test all endpoints using Postman or curl
2. Connect frontend (see `frontend/src/services/api.example.js`)
3. Start using the API

## 📝 Important Notes

- MongoDB must be running/accessible before starting the server
- Frontend ko connect karne ke liye `FRONTEND_URL` correctly set karein
- Sequential IDs (QUO001, INV001, etc.) automatically generate honge
- Quotation status "Accepted" hone par automatically invoice generate hoga

## 🆘 Troubleshooting

**Error: MongoDB connection failed**
- Check `.env` file mein `MONGODB_URI` sahi hai
- MongoDB service running hai ya nahi check karein
- MongoDB Atlas ka connection string verify karein

**Error: Port already in use**
- `.env` mein `PORT` change karein (e.g., 5001)
- Ya kisi aur process ko stop karein jo port 5000 use kar rahi hai

**CORS Error (Frontend se)**
- `.env` mein `FRONTEND_URL` sahi set karein
- Frontend ka port check karein (default: 5173 for Vite)
