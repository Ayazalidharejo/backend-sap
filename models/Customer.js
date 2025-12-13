const mongoose = require('mongoose');

// Ledger Entry Sub-document Schema
const ledgerEntrySchema = new mongoose.Schema({
  date: { type: Date, required: true, default: Date.now },
  particulars: { type: String, required: true },
  debitAmount: { type: Number, default: 0, min: 0 },
  creditAmount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, default: 0 },
  reference: String, // Invoice/Quotation reference
}, { timestamps: true });

// Main Customer Schema
const customerSchema = new mongoose.Schema({
  serialNumber: { 
    type: String, 
    unique: true, 
    required: true,
    uppercase: true 
  },
  customerName: { 
    type: String, 
    required: true,
    trim: true 
  },
  phoneNumber: { 
    type: String, 
    trim: true 
  },
  city: { 
    type: String, 
    trim: true 
  },
  totalBalance: { 
    type: Number, 
    default: 0 
  },
  debitCredit: { 
    type: String, 
    enum: ['Debit', 'Credit'], 
    default: 'Debit' 
  },
  ledger: [ledgerEntrySchema],
}, { 
  timestamps: true 
});

// Pre-save middleware to calculate balance
customerSchema.pre('save', function(next) {
  if (this.ledger && this.ledger.length > 0) {
    this.totalBalance = this.ledger.reduce((sum, entry) => {
      return sum + (entry.debitAmount || 0) - (entry.creditAmount || 0);
    }, 0);
    
    this.debitCredit = this.totalBalance >= 0 ? 'Debit' : 'Credit';
  }
  next();
});

// Method to recalculate balance after ledger update
customerSchema.methods.recalculateBalance = function() {
  if (this.ledger && this.ledger.length > 0) {
    this.totalBalance = this.ledger.reduce((sum, entry) => {
      return sum + (entry.debitAmount || 0) - (entry.creditAmount || 0);
    }, 0);
    
    this.debitCredit = this.totalBalance >= 0 ? 'Debit' : 'Credit';
  }
  return this.save();
};

module.exports = mongoose.model('Customer', customerSchema);
