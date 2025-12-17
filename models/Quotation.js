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
  // Shared reference number across Quotation/Invoice/Delivery Challan
  // Defaults to quotationNo (set in pre-save)
  referenceNo: {
    type: String,
    trim: true,
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
  // Derived totals (subtotal + optional taxes)
  subTotal: {
    type: Number,
    required: false,
    min: 0,
    default: 0,
  },
  salesTaxEnabled: { type: Boolean, default: false },
  salesTaxRate: { type: Number, required: false, min: 0, default: 0 }, // percent
  salesTaxAmount: { type: Number, required: false, min: 0, default: 0 },
  fbrTaxEnabled: { type: Boolean, default: false },
  fbrTaxRate: { type: Number, required: false, min: 0, default: 0 }, // percent
  fbrTaxAmount: { type: Number, required: false, min: 0, default: 0 },
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
  // Links created when quotation is Accepted
  linkedInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  linkedDeliveryChallanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryChallan'
  },
}, { 
  timestamps: true 
});

// Indexes for better query performance
quotationSchema.index({ createdAt: -1 });
quotationSchema.index({ date: -1 });
quotationSchema.index({ status: 1 });
quotationSchema.index({ customer: 1 });

// Pre-save middleware to calculate totals + defaults
quotationSchema.pre('save', function(next) {
  // Ensure referenceNo defaults to quotationNo
  if (!this.referenceNo && this.quotationNo) {
    this.referenceNo = String(this.quotationNo).toUpperCase()
  }

  // Default validUntil: 30 days from quotation date (or today)
  if (!this.validUntil) {
    const base = this.date ? new Date(this.date) : new Date()
    this.validUntil = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000)
  }

  if (this.products && this.products.length > 0) {
    this.subTotal = this.products.reduce((sum, product) => {
      return sum + (product.total || 0);
    }, 0);
  } else {
    this.subTotal = 0
  }

  const subTotal = this.subTotal || 0
  const salesRate = this.salesTaxEnabled ? (this.salesTaxRate || 0) : 0
  const fbrRate = this.fbrTaxEnabled ? (this.fbrTaxRate || 0) : 0

  this.salesTaxAmount = salesRate > 0 ? (subTotal * salesRate) / 100 : 0
  this.fbrTaxAmount = fbrRate > 0 ? (subTotal * fbrRate) / 100 : 0

  this.totalAmount = subTotal + (this.salesTaxAmount || 0) + (this.fbrTaxAmount || 0)
  next();
});

module.exports = mongoose.model('Quotation', quotationSchema);
