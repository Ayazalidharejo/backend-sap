# Backend Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env` (if not already done)
   - Update `MONGODB_URI` with your MongoDB connection string
   - The `.env` file should contain:
     ```
     MONGODB_URI=your_mongodb_connection_string
     PORT=5000
     NODE_ENV=development
     FRONTEND_URL=http://localhost:5173
     JWT_SECRET=your-super-secret-jwt-key
     ```

3. **Seed the Database**
   ```bash
   npm run seed
   ```
   This will add sample accounting entries and customers to your MongoDB database.

4. **Start the Server**
   ```bash
   npm run dev
   ```
   Or for production:
   ```bash
   npm start
   ```

5. **Verify Backend is Running**
   - Open http://localhost:5000/api/health in your browser
   - You should see: `{"status":"OK","message":"Medical Service Backend API is running"}`

## API Endpoints

### Accounting
- `GET /api/accounting` - Get all entries (with stats: `?includeStats=true`)
- `GET /api/accounting/stats` - Get statistics only
- `GET /api/accounting/:id` - Get single entry
- `POST /api/accounting` - Create new entry
- `PUT /api/accounting/:id` - Update entry
- `DELETE /api/accounting/:id` - Delete entry
- `GET /api/accounting/statement` - Get statement for PDF

### Query Parameters for Accounting
- `category=Income|Expense` - Filter by category
- `expenseType=Office Expense|Home Expense` - Filter by expense type
- `includeStats=true` - Include statistics in response

## Sample Data

The seed script adds:
- 16 accounting entries (mix of Income, Office Expense, Home Expense)
- 2 sample customers with ledger transactions

## Frontend Integration

The frontend API service is located at `frontend/src/services/api.js`.

Make sure:
1. Backend is running on `http://localhost:5000`
2. Frontend is configured to use the API service
3. CORS is enabled in backend (already configured)

## Troubleshooting

See `TROUBLESHOOTING.md` for common MongoDB connection issues.
