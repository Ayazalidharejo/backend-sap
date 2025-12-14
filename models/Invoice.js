const mongoose = require('mongoose');

// Product Item Schema
const productSchema = new mongoose.Schema({
  product: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
}, { _id: true });

// Invoice Schema
const invoiceSchema = new mongoose.Schema({
  invoiceNo: { 
    type: String, 
    unique: true, 
    required: true,
    uppercase: true 
  },
  date: { 
    type: Date, 
    required: true, 
    default: Date.now 
  },
  customer: { 
    type: String, 
    required: true,
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
  totalAmount: { 
    type: Number, 
    required: true, 
    min: 0 
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
