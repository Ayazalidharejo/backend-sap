const Customer = require('../models/Customer');
const generateSequentialId = require('../utils/generateSequentialId');

// Get all customers
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    
    // Format customers with id field
    const formattedCustomers = customers.map(c => ({
      ...c.toObject(),
      id: c._id.toString(),
      ledger: c.ledger.map(entry => ({
        ...entry.toObject(),
        id: entry._id ? entry._id.toString() : entry.id
      }))
    }));
    
    // Calculate stats if requested
    if (req.query.includeStats === 'true') {
      const stats = {
        totalBalance: customers.reduce((sum, c) => sum + Math.abs(c.totalBalance || 0), 0),
        totalCustomers: customers.length,
        totalCredit: customers
          .filter(c => c.debitCredit === 'Credit')
          .reduce((sum, c) => sum + Math.abs(c.totalBalance || 0), 0),
        totalDebit: customers
          .filter(c => c.debitCredit === 'Debit')
          .reduce((sum, c) => sum + Math.abs(c.totalBalance || 0), 0),
      };
      
      return res.json({
        customers: formattedCustomers,
        stats,
      });
    }
    
    res.json(formattedCustomers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single customer
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    // Format response with id field and formatted ledger
    res.json({
      ...customer.toObject(),
      id: customer._id.toString(),
      ledger: customer.ledger.map(entry => ({
        ...entry.toObject(),
        id: entry._id ? entry._id.toString() : entry.id
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create customer
exports.createCustomer = async (req, res) => {
  try {
    const { customerName, phoneNumber, city, amount, debitCredit } = req.body;
    
    // Generate serial number
    const serialNumber = await generateSequentialId('CUST', Customer, 'serialNumber');
    
    // Create initial ledger entry if amount provided
    const ledger = [];
    if (amount && parseFloat(amount) > 0) {
      ledger.push({
        date: new Date(),
        particulars: 'Initial Balance',
        debitAmount: debitCredit === 'Debit' ? parseFloat(amount) : 0,
        creditAmount: debitCredit === 'Credit' ? parseFloat(amount) : 0,
        totalAmount: parseFloat(amount),
      });
    }
    
    const customer = new Customer({
      serialNumber,
      customerName,
      phoneNumber,
      city,
      ledger,
    });
    
    await customer.save();
    
    // Format response with id field
    res.status(201).json({
      ...customer.toObject(),
      id: customer._id.toString()
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Serial number already exists' });
    }
    res.status(400).json({ message: error.message });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const { customerName, phoneNumber, city, amount, debitCredit } = req.body;
    
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    if (customerName) customer.customerName = customerName;
    if (phoneNumber !== undefined) customer.phoneNumber = phoneNumber;
    if (city !== undefined) customer.city = city;

    // Optional: update Initial Balance (so "Amount" + "Payment Type" changes actually reflect in list)
    if (amount !== undefined && debitCredit !== undefined) {
      const normalizedAmount = Math.abs(parseFloat(amount) || 0);
      const type = debitCredit === 'Credit' ? 'Credit' : 'Debit';

      // Find existing initial balance entry
      let initialIndex = customer.ledger.findIndex(
        (e) => (e.particulars || '').toLowerCase().trim() === 'initial balance'
      );

      if (initialIndex === -1) {
        // Put initial balance at the start so running totals remain correct
        customer.ledger.unshift({
          date: customer.createdAt || new Date(),
          particulars: 'Initial Balance',
          debitAmount: type === 'Debit' ? normalizedAmount : 0,
          creditAmount: type === 'Credit' ? normalizedAmount : 0,
          totalAmount: 0,
        });
        initialIndex = 0;
      } else {
        // Ensure initial balance stays first (running totals depend on order)
        if (initialIndex > 0) {
          const [initialEntry] = customer.ledger.splice(initialIndex, 1);
          customer.ledger.unshift(initialEntry);
          initialIndex = 0;
        }

        customer.ledger[initialIndex].particulars = 'Initial Balance';
        customer.ledger[initialIndex].debitAmount = type === 'Debit' ? normalizedAmount : 0;
        customer.ledger[initialIndex].creditAmount = type === 'Credit' ? normalizedAmount : 0;
      }
    }
    
    // Save + recalc balance
    await customer.recalculateBalance();
    
    // Format response with id field
    res.json({
      ...customer.toObject(),
      id: customer._id.toString()
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete customer
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add ledger entry
exports.addLedgerEntry = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    const { date, particulars, debitAmount, creditAmount, reference, quantity, unitPrice } = req.body;
    
    const entry = {
      date: date ? new Date(date) : new Date(),
      particulars,
      debitAmount: parseFloat(debitAmount) || 0,
      creditAmount: parseFloat(creditAmount) || 0,
      reference,
      // Optional sale metadata (Inventory/Sales flows send these)
      quantity: quantity !== undefined ? (parseFloat(quantity) || 0) : 0,
      unitPrice: unitPrice !== undefined ? (parseFloat(unitPrice) || 0) : 0,
    };
    
    const previousBalance = customer.totalBalance || 0;
    entry.totalAmount = previousBalance + entry.debitAmount - entry.creditAmount;
    
    customer.ledger.push(entry);
    await customer.recalculateBalance();
    
    // Format response with id field
    res.json({
      ...customer.toObject(),
      id: customer._id.toString()
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update ledger entry
exports.updateLedgerEntry = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    const entryId = req.params.entryId;
    const entry = customer.ledger.id(entryId);
    
    if (!entry) {
      return res.status(404).json({ message: 'Ledger entry not found' });
    }
    
    const { date, particulars, debitAmount, creditAmount, reference, quantity, unitPrice } = req.body;
    if (date) entry.date = new Date(date);
    if (particulars) entry.particulars = particulars;
    if (debitAmount !== undefined) entry.debitAmount = parseFloat(debitAmount) || 0;
    if (creditAmount !== undefined) entry.creditAmount = parseFloat(creditAmount) || 0;
    if (reference !== undefined) entry.reference = reference;
    if (quantity !== undefined) entry.quantity = parseFloat(quantity) || 0;
    if (unitPrice !== undefined) entry.unitPrice = parseFloat(unitPrice) || 0;
    
    await customer.recalculateBalance();
    
    // Format response with id field and formatted ledger
    res.json({
      ...customer.toObject(),
      id: customer._id.toString(),
      ledger: customer.ledger.map(lentry => ({
        ...lentry.toObject(),
        id: lentry._id ? lentry._id.toString() : lentry.id
      }))
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete ledger entry
exports.deleteLedgerEntry = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    const entryId = req.params.entryId;
    const ledgerEntry = customer.ledger.id(entryId);
    
    if (!ledgerEntry) {
      return res.status(404).json({ message: 'Ledger entry not found' });
    }
    
    // Use pull() method to remove subdocument (works in all Mongoose versions)
    customer.ledger.pull(entryId);
    await customer.save();
    await customer.recalculateBalance();
    
    // Format response with id field
    res.json({
      ...customer.toObject(),
      id: customer._id.toString()
    });
  } catch (error) {
    console.error('Error deleting ledger entry:', error);
    res.status(400).json({ message: error.message || 'Failed to delete ledger entry' });
  }
};

// Get customer statistics
exports.getCustomerStats = async (req, res) => {
  try {
    const customers = await Customer.find();
    
    const stats = {
      totalBalance: customers.reduce((sum, c) => sum + Math.abs(c.totalBalance), 0),
      totalCustomers: customers.length,
      totalCredit: customers
        .filter(c => c.debitCredit === 'Credit')
        .reduce((sum, c) => sum + Math.abs(c.totalBalance), 0),
      totalDebit: customers
        .filter(c => c.debitCredit === 'Debit')
        .reduce((sum, c) => sum + Math.abs(c.totalBalance), 0),
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
