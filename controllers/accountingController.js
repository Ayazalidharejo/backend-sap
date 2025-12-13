const Accounting = require('../models/Accounting');

// Get all accounting entries
exports.getAllAccounting = async (req, res) => {
  try {
    const { category, expenseType } = req.query;
    
    // Build query
    const query = {};
    if (category) {
      query.category = category;
    }
    if (expenseType) {
      query.expenseType = expenseType;
    }
    
    const entries = await Accounting.find(query).sort({ date: -1 });
    
    if (req.query.includeStats === 'true') {
      const allEntries = await Accounting.find().sort({ date: 1 });
      
      // Recalculate balance for all entries
      let balance = 0;
      const entriesWithBalance = allEntries.map(e => {
        balance = balance + (e.credit || 0) - (e.debit || 0);
        return { ...e.toObject(), balance };
      });
      
      const stats = {
        totalIncome: allEntries
          .filter(e => e.category === 'Income')
          .reduce((sum, e) => sum + e.credit, 0),
        totalExpenses: allEntries
          .filter(e => e.category === 'Expense')
          .reduce((sum, e) => sum + e.debit, 0),
        netBalance: entriesWithBalance.length > 0 ? entriesWithBalance[entriesWithBalance.length - 1].balance : 0,
      };
      
      // Format entries with proper balance
      const formattedEntries = entries.map(e => {
        const entryIndex = allEntries.findIndex(ae => ae._id.toString() === e._id.toString());
        return {
          ...e.toObject(),
          balance: entryIndex >= 0 ? entriesWithBalance[entryIndex].balance : e.balance,
          id: e._id.toString()
        };
      });
      
      return res.json({
        accountingEntries: formattedEntries,
        accountingStats: stats,
      });
    }
    
    // Format entries for frontend
    const formattedEntries = entries.map(e => ({
      ...e.toObject(),
      id: e._id.toString()
    }));
    
    res.json(formattedEntries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single accounting entry
exports.getAccountingById = async (req, res) => {
  try {
    const entry = await Accounting.findById(req.params.id);
    
    if (!entry) {
      return res.status(404).json({ message: 'Accounting entry not found' });
    }
    
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create accounting entry
exports.createAccountingEntry = async (req, res) => {
  try {
    const entry = new Accounting({
      ...req.body,
      balance: 0, // Will be recalculated
    });
    
    await entry.save();
    
    // Recalculate all balances after insert
    const entries = await Accounting.find().sort({ date: 1 });
    let balance = 0;
    for (const e of entries) {
      balance = balance + (e.credit || 0) - (e.debit || 0);
      e.balance = balance;
      await e.save();
    }
    
    // Return updated entry with proper balance
    const updatedEntry = await Accounting.findById(entry._id);
    res.status(201).json({
      ...updatedEntry.toObject(),
      id: updatedEntry._id.toString()
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update accounting entry
exports.updateAccountingEntry = async (req, res) => {
  try {
    const entry = await Accounting.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!entry) {
      return res.status(404).json({ message: 'Accounting entry not found' });
    }
    
    // Recalculate all balances after update
    const entries = await Accounting.find().sort({ date: 1 });
    let balance = 0;
    for (const e of entries) {
      balance = balance + (e.credit || 0) - (e.debit || 0);
      e.balance = balance;
      await e.save();
    }
    
    // Return updated entry with proper ID format
    const updatedEntry = await Accounting.findById(req.params.id);
    res.json({
      ...updatedEntry.toObject(),
      id: updatedEntry._id.toString()
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete accounting entry
exports.deleteAccountingEntry = async (req, res) => {
  try {
    await Accounting.findByIdAndDelete(req.params.id);
    
    // Recalculate all balances
    const entries = await Accounting.find().sort({ date: 1 });
    let balance = 0;
    for (const e of entries) {
      balance = balance + (e.credit || 0) - (e.debit || 0);
      e.balance = balance;
      await e.save();
    }
    
    res.json({ message: 'Accounting entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get accounting statistics
exports.getAccountingStats = async (req, res) => {
  try {
    const entries = await Accounting.find();
    
    const stats = {
      totalIncome: entries
        .filter(e => e.category === 'Income')
        .reduce((sum, e) => sum + e.credit, 0),
      totalExpenses: entries
        .filter(e => e.category === 'Expense')
        .reduce((sum, e) => sum + e.debit, 0),
      netBalance: entries.length > 0 ? entries[entries.length - 1].balance : 0,
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get accounting statement (for PDF generation)
exports.getAccountingStatement = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const entries = await Accounting.find(query).sort({ date: 1 });
    
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
