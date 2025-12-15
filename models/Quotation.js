const mongoose = require('mongoose');

// Product Item Schema
// Relaxed validation so that empty/zero values are allowed and do not block saving
const productSchema = new mongoose.Schema({
  product: { type: String, required: false },
  quantity: { type: Number, required: false, min: 0 },
  unitPrice: { type: Number, required: false, min: 0, default: 0 },
  total: { type: Number, required: false, min: 0, default: 0 },
}, { _id: true });

// Quotation Schema
const quotationSchema = new mongoose.Schema({
  quotationNo: { 
    type: String, 
    unique: true, 
    required: false,
    uppercase: true 
  },
  date: { 
    type: Date, 
    required: false, 
    default: Date.now 
  },
  // Make customer optional so quotations can be saved without selecting a customer
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
    enum: ['Accepted', 'Pending', 'Rejected'], 
    default: 'Pending' 
  },
  validUntil: { 
    type: Date 
  },
  termsAndConditions: {
    type: [String],
    default: ['PAYMENT: 30% IN ADVANCE', 'VALIDITY: 30 DAYS']
  },
}, { 
  timestamps: true 
});

// Indexes for better query performance
quotationSchema.index({ createdAt: -1 });
quotationSchema.index({ date: -1 });
quotationSchema.index({ status: 1 });
quotationSchema.index({ customer: 1 });

// Pre-save middleware to calculate totalAmount
quotationSchema.pre('save', function(next) {
  if (this.products && this.products.length > 0) {
    this.totalAmount = this.products.reduce((sum, product) => {
      return sum + (product.total || 0);
    }, 0);
  }
  next();
});

module.exports = mongoose.model('Quotation', quotationSchema);
