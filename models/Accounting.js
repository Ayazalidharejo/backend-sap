const mongoose = require('mongoose');

// Accounting Entry Schema
const accountingEntrySchema = new mongoose.Schema({
  date: { 
    type: Date, 
    required: true, 
    default: Date.now 
  },
  account: { 
    type: String, 
    required: true,
    trim: true 
  },
  debit: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  credit: { 
    type: Number, 
    default: 0, 
    min: 0 
  },
  balance: { 
    type: Number, 
    default: 0 
  },
  category: { 
    type: String, 
    enum: ['Income', 'Expense'], 
    required: true 
  },
  expenseType: {
    type: String,
    enum: ['Office Expense', 'Home Expense'],
    required: function() {
      return this.category === 'Expense';
    }
  },
  description: { 
    type: String, 
    trim: true 
  },
  reference: { 
    type: String, 
    trim: true 
  },
  customer: { 
    type: String, 
    trim: true 
  },
}, { 
  timestamps: true 
});

// Index for date-based queries
accountingEntrySchema.index({ date: -1 });

module.exports = mongoose.model('Accounting', accountingEntrySchema);
