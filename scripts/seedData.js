const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('../config/database');

// Import models
const Accounting = require('../models/Accounting');
const Customer = require('../models/Customer');
const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');

// Generate comprehensive accounting data (will be populated by generateAccountingData function)
// Sample data - will be replaced by generated data
const seedAccountingData = [];

const seedCustomersData = [
  {
    customerName: 'Ali Medical Center',
    serialNumber: 'CUST001',
    phoneNumber: '021-1234567',
    city: 'Karachi',
    ledger: [
      {
        date: new Date('2024-01-15'),
        particulars: 'Initial consultation invoice',
        debitAmount: 0,
        creditAmount: 10000,
        totalAmount: 10000
      },
      {
        date: new Date('2024-02-01'),
        particulars: 'Equipment purchase invoice',
        debitAmount: 0,
        creditAmount: 50000,
        totalAmount: 60000
      }
    ]
  },
  {
    customerName: 'City Hospital',
    serialNumber: 'CUST002',
    phoneNumber: '042-7654321',
    city: 'Lahore',
    ledger: [
      {
        date: new Date('2024-01-20'),
        particulars: 'Service payment invoice',
        debitAmount: 0,
        creditAmount: 75000,
        totalAmount: 75000
      }
    ]
  },
  {
    customerName: 'National Medical Supplies',
    serialNumber: 'CUST003',
    phoneNumber: '051-1234567',
    city: 'Islamabad',
    ledger: []
  },
  {
    customerName: 'Royal Healthcare',
    serialNumber: 'CUST004',
    phoneNumber: '021-9876543',
    city: 'Karachi',
    ledger: []
  },
  {
    customerName: 'Prime Hospital',
    serialNumber: 'CUST005',
    phoneNumber: '042-9876543',
    city: 'Lahore',
    ledger: []
  }
];

// Generate invoices for all months (Jan-Dec 2024 and 2025)
const generateInvoiceData = () => {
  const invoices = [];
  const customers = ['Ali Medical Center', 'City Hospital', 'National Medical Supplies', 'Royal Healthcare', 'Prime Hospital'];
  const products = [
    { name: 'CNC Machine', price: 50000 },
    { name: 'Sensor Probe', price: 15000 },
    { name: 'Medical Equipment', price: 80000 },
    { name: 'Diagnostic Tool', price: 25000 },
    { name: 'Monitoring System', price: 45000 },
    { name: 'Lab Equipment', price: 60000 },
    { name: 'Surgical Instrument', price: 35000 },
    { name: 'Testing Device', price: 20000 }
  ];

  let invoiceCounter = 1;
  const currentYear = new Date().getFullYear();
  
  // Generate for current year and previous year
  for (let year = currentYear - 1; year <= currentYear; year++) {
    for (let month = 0; month < 12; month++) {
      // Generate 2-4 invoices per month
      const invoicesPerMonth = Math.floor(Math.random() * 3) + 2;
      
      for (let i = 0; i < invoicesPerMonth; i++) {
        const day = Math.floor(Math.random() * 25) + 1;
        const date = new Date(year, month, day);
        
        // Select random customer
        const customer = customers[Math.floor(Math.random() * customers.length)];
        
        // Select 1-3 random products
        const numProducts = Math.floor(Math.random() * 3) + 1;
        const selectedProducts = [];
        const productIndices = new Set();
        
        while (productIndices.size < numProducts) {
          productIndices.add(Math.floor(Math.random() * products.length));
        }
        
        productIndices.forEach(idx => {
          const product = products[idx];
          const quantity = Math.floor(Math.random() * 5) + 1;
          selectedProducts.push({
            product: product.name,
            quantity: quantity,
            unitPrice: product.price,
            total: product.price * quantity
          });
        });
        
        const totalAmount = selectedProducts.reduce((sum, p) => sum + p.total, 0);
        const statuses = ['Paid', 'Pending', 'Partial'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        invoices.push({
          invoiceNo: `INV${String(invoiceCounter).padStart(4, '0')}`,
          date: date,
          customer: customer,
          email: 'duamedicalservice@gmail.com',
          address: '123 Business Street, Karachi',
          subject: `Invoice for ${selectedProducts[0].product}`,
          products: selectedProducts,
          totalAmount: totalAmount,
          status: status,
          dueDate: new Date(year, month, day + 30)
        });
        
        invoiceCounter++;
      }
    }
  }
  
  return invoices;
};

// Generate accounting entries for all months with real monthly distribution
const generateAccountingData = () => {
  const entries = [];
  const currentYear = new Date().getFullYear();
  let runningBalance = 0;
  
  // Generate for current year and previous year
  for (let year = currentYear - 1; year <= currentYear; year++) {
    for (let month = 0; month < 12; month++) {
      // Income entries (2-3 per month)
      const incomeEntries = Math.floor(Math.random() * 2) + 2;
      const incomeSources = ['Sales Revenue', 'Service Income', 'Product Sales', 'Consultation Fees', 'Repair Services', 'Equipment Sales'];
      
      for (let i = 0; i < incomeEntries; i++) {
        const day = Math.floor(Math.random() * 25) + 1;
        const date = new Date(year, month, day);
        const amount = Math.floor(Math.random() * 50000) + 20000;
        runningBalance += amount;
        
        entries.push({
          date: date,
          account: incomeSources[Math.floor(Math.random() * incomeSources.length)],
          category: 'Income',
          credit: amount,
          debit: 0,
          balance: runningBalance,
          description: `Monthly ${incomeSources[Math.floor(Math.random() * incomeSources.length)].toLowerCase()}`
        });
      }
      
      // Office Expense entries (2-4 per month)
      const officeExpenseEntries = Math.floor(Math.random() * 3) + 2;
      const officeExpenses = [
        { name: 'Office Rent', amount: 15000 },
        { name: 'Office Supplies', amount: 8000 },
        { name: 'Office Internet', amount: 4000 },
        { name: 'Office Maintenance', amount: 12000 },
        { name: 'Office Staff Salary', amount: 50000 },
        { name: 'Office Utilities', amount: 6000 }
      ];
      
      for (let i = 0; i < officeExpenseEntries; i++) {
        const day = Math.floor(Math.random() * 25) + 1;
        const date = new Date(year, month, day);
        const expense = officeExpenses[Math.floor(Math.random() * officeExpenses.length)];
        const amount = expense.amount + Math.floor(Math.random() * expense.amount * 0.3);
        runningBalance -= amount;
        
        entries.push({
          date: date,
          account: expense.name,
          category: 'Expense',
          expenseType: 'Office Expense',
          credit: 0,
          debit: amount,
          balance: runningBalance,
          description: `Monthly ${expense.name.toLowerCase()}`
        });
      }
      
      // Home Expense entries (1-3 per month)
      const homeExpenseEntries = Math.floor(Math.random() * 3) + 1;
      const homeExpenses = [
        { name: 'Home Electricity', amount: 5000 },
        { name: 'Home Internet', amount: 3000 },
        { name: 'Home Rent', amount: 25000 },
        { name: 'Home Groceries', amount: 7000 },
        { name: 'Home Utilities', amount: 6000 }
      ];
      
      for (let i = 0; i < homeExpenseEntries; i++) {
        const day = Math.floor(Math.random() * 25) + 1;
        const date = new Date(year, month, day);
        const expense = homeExpenses[Math.floor(Math.random() * homeExpenses.length)];
        const amount = expense.amount + Math.floor(Math.random() * expense.amount * 0.3);
        runningBalance -= amount;
        
        entries.push({
          date: date,
          account: expense.name,
          category: 'Expense',
          expenseType: 'Home Expense',
          credit: 0,
          debit: amount,
          balance: runningBalance,
          description: `Monthly ${expense.name.toLowerCase()}`
        });
      }
    }
  }
  
  // Sort by date
  return entries.sort((a, b) => a.date - b.date);
};

// Seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seed...');
    
    // Connect to database
    await connectDB();
    
    // Generate comprehensive mock data
    console.log('📝 Generating mock data...');
    const generatedAccountingData = generateAccountingData();
    const generatedInvoiceData = generateInvoiceData();
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
    await Accounting.deleteMany({});
    await Customer.deleteMany({});
    await Quotation.deleteMany({});
    await Invoice.deleteMany({});
    
    // Seed Accounting data
    console.log('📊 Seeding Accounting data...');
    const accountingEntries = await Accounting.insertMany(generatedAccountingData);
    console.log(`✅ Inserted ${accountingEntries.length} accounting entries`);
    
    // Seed Customers data
    console.log('👥 Seeding Customers data...');
    const customers = await Customer.insertMany(seedCustomersData);
    console.log(`✅ Inserted ${customers.length} customers`);
    
    // Seed Invoice data
    console.log('🧾 Seeding Invoice data...');
    const invoices = await Invoice.insertMany(generatedInvoiceData);
    console.log(`✅ Inserted ${invoices.length} invoices`);
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📈 Summary:');
    console.log(`   - Accounting Entries: ${accountingEntries.length}`);
    console.log(`   - Customers: ${customers.length}`);
    console.log(`   - Invoices: ${invoices.length}`);
    console.log('\n✅ You can now start using the API!');
    console.log('💡 Charts will now show real data from MongoDB!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seed if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
