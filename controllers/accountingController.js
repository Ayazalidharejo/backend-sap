const Accounting = require('../models/Accounting');

async function recalcBalancesFromDate(fromDate) {
  const from = fromDate ? new Date(fromDate) : null;

  // Determine starting balance from the last entry strictly before `from`
  let startingBalance = 0;
  if (from) {
    const prev = await Accounting.findOne({ date: { $lt: from } })
      .select({ balance: 1 })
      .sort({ date: -1, _id: -1 })
      .lean();
    startingBalance = prev?.balance || 0;
  }

  const query = from ? { date: { $gte: from } } : {};
  const entries = await Accounting.find(query)
    .select({ credit: 1, debit: 1, manualBalance: 1, date: 1 })
    .sort({ date: 1, _id: 1 })
    .lean();

  let balance = startingBalance;
  const ops = [];

  for (const e of entries) {
    // Preserve "manualBalance override" semantics (frontend uses it; legacy data may contain it)
    if (e.manualBalance !== null && e.manualBalance !== undefined && !Number.isNaN(Number(e.manualBalance))) {
      balance = Number(e.manualBalance);
    } else {
      balance = balance + (e.credit || 0) - (e.debit || 0);
    }

    ops.push({
      updateOne: {
        filter: { _id: e._id },
        update: { $set: { balance } },
      },
    });
  }

  if (ops.length > 0) {
    // Bulk update is dramatically faster than saving documents in a loop
    await Accounting.bulkWrite(ops, { ordered: false });
  }
}

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
    
    // Use lean() for better performance
    const entries = await Accounting.find(query).lean().sort({ date: -1 });
    
    if (req.query.includeStats === 'true') {
      // Use parallel queries for better performance
      const [allEntries, statsResult] = await Promise.all([
        Accounting.find().lean().sort({ date: 1 }),
        // Use aggregation for faster stats calculation
        Accounting.aggregate([
          {
            $group: {
              _id: '$category',
              total: {
                $sum: {
                  $cond: [
                    { $eq: ['$category', 'Income'] },
                    { $ifNull: ['$credit', 0] },
                    { $ifNull: ['$debit', 0] }
                  ]
                }
              }
            }
          }
        ])
      ]);
      
      // Calculate balance using aggregation for better performance
      let balance = 0;
      const entriesWithBalance = allEntries.map(e => {
        balance = balance + (e.credit || 0) - (e.debit || 0);
        return { ...e, balance };
      });
      
      // Extract stats from aggregation result
      const incomeStat = statsResult.find(s => s._id === 'Income');
      const expenseStat = statsResult.find(s => s._id === 'Expense');
      
      const stats = {
        totalIncome: incomeStat?.total || 0,
        totalExpenses: expenseStat?.total || 0,
        netBalance: entriesWithBalance.length > 0 ? entriesWithBalance[entriesWithBalance.length - 1].balance : 0,
      };
      
      // Format entries with proper balance
      const formattedEntries = entries.map(e => {
        const entryIndex = allEntries.findIndex(ae => ae._id.toString() === e._id.toString());
        return {
          ...e,
          balance: entryIndex >= 0 ? entriesWithBalance[entryIndex].balance : (e.balance || 0),
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
      ...e,
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
    
    // Recalculate balances only from this entry's date onward (fast)
    await recalcBalancesFromDate(entry.date);
    
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
    const existing = await Accounting.findById(req.params.id).select({ date: 1 }).lean();
    if (!existing) {
      return res.status(404).json({ message: 'Accounting entry not found' });
    }

    const entry = await Accounting.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!entry) {
      return res.status(404).json({ message: 'Accounting entry not found' });
    }
    
    // Recalculate from the earliest affected date (old date vs new date)
    const newDate = entry.date;
    const oldDate = existing.date;
    const earliest = oldDate && newDate ? (oldDate < newDate ? oldDate : newDate) : (oldDate || newDate);
    await recalcBalancesFromDate(earliest);
    
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
    let deletedEntry;
    try {
      deletedEntry = await Accounting.findByIdAndDelete(req.params.id);
    } catch (err) {
      // Handle case where plugins/middleware throw when document is missing
      if (err?.message && err.message.includes('No document found for query')) {
        // Treat as already deleted – no error to frontend
        return res.json({ message: 'Accounting entry already removed' });
      }
      throw err;
    }

    if (!deletedEntry) {
      // If nothing was found, treat it as already deleted
      return res.json({ message: 'Accounting entry already removed' });
    }
    
    // Recalculate only from the deleted entry date onward (fast)
    await recalcBalancesFromDate(deletedEntry.date);
    
    res.json({ message: 'Accounting entry deleted successfully' });
  } catch (error) {
    // As a last safety net, if this specific “no document found” bubbles up
    if (error?.message && error.message.includes('No document found for query')) {
      return res.json({ message: 'Accounting entry already removed' });
    }
    res.status(500).json({ message: error.message });
  }
};

// Get accounting statistics
exports.getAccountingStats = async (req, res) => {
  try {
    // Use aggregation for faster stats calculation
    const [statsResult, lastEntry] = await Promise.all([
      Accounting.aggregate([
        {
          $group: {
            _id: '$category',
            total: {
              $sum: {
                $cond: [
                  { $eq: ['$category', 'Income'] },
                  { $ifNull: ['$credit', 0] },
                  { $ifNull: ['$debit', 0] }
                ]
              }
            }
          }
        }
      ]),
      Accounting.findOne().lean().sort({ date: -1 })
    ]);
    
    const incomeStat = statsResult.find(s => s._id === 'Income');
    const expenseStat = statsResult.find(s => s._id === 'Expense');
    
    const stats = {
      totalIncome: incomeStat?.total || 0,
      totalExpenses: expenseStat?.total || 0,
      netBalance: lastEntry?.balance || 0,
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
