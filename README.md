# Medical Service Management System - Backend API

MongoDB ke saath complete backend API for Medical Service Management System.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup Environment Variables
```bash
# Copy example file
cp .env.example .env

# Edit .env file and add your MongoDB connection string
```

### 3. MongoDB Setup Options

#### Option A: Local MongoDB
```bash
# Install MongoDB locally, then:
MONGODB_URI=mongodb://localhost:27017/medical-service
```

#### Option B: MongoDB Atlas (Cloud - Recommended)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create cluster
4. Get connection string
5. Add to `.env`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medical-service
```

### 4. Run Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:5000`

## 📡 API Endpoints

### Health Check
- `GET /api/health` - Check server status

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers?includeStats=true` - Get customers with stats
- `GET /api/customers/:id` - Get single customer
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `POST /api/customers/:id/ledger` - Add ledger entry
- `PUT /api/customers/:id/ledger/:entryId` - Update ledger entry
- `DELETE /api/customers/:id/ledger/:entryId` - Delete ledger entry

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices?includeStats=true` - Get invoices with stats
- `GET /api/invoices/:id` - Get single invoice
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Quotations
- `GET /api/quotations` - Get all quotations
- `GET /api/quotations?includeStats=true` - Get quotations with stats
- `GET /api/quotations/:id` - Get single quotation
- `POST /api/quotations` - Create quotation
- `PUT /api/quotations/:id` - Update quotation (auto-generates invoice if status=Accepted)
- `DELETE /api/quotations/:id` - Delete quotation

### Inventory
- `GET /api/inventory` - Get all inventory items
- `GET /api/inventory?category=machines` - Filter by category
- `GET /api/inventory?includeStats=true` - Get inventory with stats
- `GET /api/inventory/:id` - Get single item
- `POST /api/inventory` - Create inventory item
- `PUT /api/inventory/:id` - Update inventory item
- `DELETE /api/inventory/:id` - Delete inventory item

### Accounting
- `GET /api/accounting` - Get all accounting entries
- `GET /api/accounting?includeStats=true` - Get accounting with stats
- `GET /api/accounting/statement` - Get statement (for PDF)
- `GET /api/accounting/:id` - Get single entry
- `POST /api/accounting` - Create accounting entry
- `PUT /api/accounting/:id` - Update accounting entry
- `DELETE /api/accounting/:id` - Delete accounting entry

### Delivery Challans
- `GET /api/delivery-challans` - Get all challans
- `GET /api/delivery-challans?includeStats=true` - Get challans with stats
- `GET /api/delivery-challans/:id` - Get single challan
- `POST /api/delivery-challans` - Create challan
- `PUT /api/delivery-challans/:id` - Update challan
- `DELETE /api/delivery-challans/:id` - Delete challan

### Dashboard
- `GET /api/dashboard/stats` - Get all dashboard statistics

### Agents
- `POST /api/agents/login` - Agent login
- `GET /api/agents` - Get all agents
- `GET /api/agents?includeStats=true` - Get agents with stats
- `GET /api/agents/:id` - Get single agent
- `POST /api/agents` - Create agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

## 🔧 Features

- ✅ Sequential ID Generation (QUO001, INV001, CUST001, etc.)
- ✅ Auto-Invoice Generation (when quotation status = "Accepted")
- ✅ Automatic Balance Calculation (Customer ledger)
- ✅ Statistics Calculation (Dashboard, Customers, Invoices, etc.)
- ✅ MongoDB with Mongoose ODM
- ✅ CORS enabled for frontend
- ✅ JWT Authentication (Agents)
- ✅ Error Handling
- ✅ Data Validation

## 📦 Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── models/                  # Mongoose Models
│   ├── Customer.js
│   ├── Invoice.js
│   ├── Quotation.js
│   ├── Inventory.js
│   ├── Accounting.js
│   ├── DeliveryChallan.js
│   └── Agent.js
├── controllers/             # Business Logic
│   ├── customerController.js
│   ├── invoiceController.js
│   ├── quotationController.js
│   ├── inventoryController.js
│   ├── accountingController.js
│   ├── deliveryChallanController.js
│   ├── dashboardController.js
│   └── agentController.js
├── routes/                  # API Routes
│   ├── customers.js
│   ├── invoices.js
│   ├── quotations.js
│   ├── inventory.js
│   ├── accounting.js
│   ├── deliveryChallans.js
│   ├── dashboard.js
│   └── agents.js
├── utils/
│   └── generateSequentialId.js
├── .env.example
├── .gitignore
├── package.json
├── server.js                # Entry point
└── README.md
```

## 🔐 Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/medical-service
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-secret-key
```

## 📝 Testing

### Test API with curl:

```bash
# Health check
curl http://localhost:5000/api/health

# Get all customers
curl http://localhost:5000/api/customers

# Create customer
curl -X POST http://localhost:5000/api/customers \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Test Customer","phoneNumber":"1234567890","city":"Karachi"}'
```

## 🔄 Frontend Integration

Frontend ko connect karne ke liye, `frontend/src/services/api.js` file banayein (example file already exists: `api.example.js`)

1. Copy `api.example.js` to `api.js`
2. Frontend ke har component mein `mockData.js` ko `api.js` se replace karein
3. `async/await` add karein kyunki ab API calls async hain

## 📚 Next Steps

1. ✅ Backend complete
2. 🔄 Frontend API integration (see `frontend/src/services/api.example.js`)
3. 🔄 Authentication middleware (optional)
4. 🔄 API documentation (Swagger - optional)
5. 🔄 Production deployment

---

**Made with ❤️ for Medical Service Management System**
