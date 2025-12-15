const mongoose = require('mongoose');

// Product Item Schema
// Relaxed validation so that empty/zero values are allowed and do not block saving
const productSchema = new mongoose.Schema({
  product:   { type: String, required: false },
  quantity:  { type: Number, required: false, min: 0 },
  unitPrice: { type: Number, required: false, min: 0, default: 0 },
  total:     { type: Number, required: false, min: 0, default: 0 },
}, { _id: true });

// Invoice Schema
const invoiceSchema = new mongoose.Schema({
  invoiceNo: { 
    type: String, 
    unique: true, 
    required: false, // controller always sets this; keep schema flexible
    uppercase: true 
  },
  date: { 
    type: Date, 
    required: false, 
    default: Date.now 
  },
  // Make customer optional so invoices can be saved without selecting a customer
  customer: { 
    type: String, 
    required: false,
    trim: true 
  },
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer' 
  },
  subject: { 
    type: String, 
    trim: true 
  },
  address: { 
    type: String, 
    trim: true 
  },
  email: { 
    type: String, 
    default: 'duamedicalservice@gmail.com',
    trim: true 
  },
  products: [productSchema],
  // totalAmount is derived from products; make it optional with default 0
  totalAmount: { 
    type: Number, 
    required: false, 
    min: 0,
    default: 0,
  },
  status: { 
    type: String, 
    enum: ['Paid', 'Pending', 'Partial'], 
    default: 'Pending' 
  },
  dueDate: { 
    type: Date 
  },
}, { 
  timestamps: true 
});

// Indexes for better query performance
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ date: -1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ customer: 1 });

// Pre-save middleware to calculate totalAmount
invoiceSchema.pre('save', function(next) {
  if (this.products && this.products.length > 0) {
    this.totalAmount = this.products.reduce((sum, product) => {
      return sum + (product.total || 0);
    }, 0);
  }
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
