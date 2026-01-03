const mongoose = require('mongoose');

// Product Item Schema
// Relaxed validation so that empty/zero values are allowed and do not block saving
const productSchema = new mongoose.Schema({
  product: { type: String, required: false },
  description: { type: String, required: false, trim: true },
  buyDescription: { type: String, required: false, trim: true },
  quantity: { type: Number, required: false, min: 0 },
  unitPrice: { type: Number, required: false, min: 0, default: 0 },
  total: { type: Number, required: false, min: 0, default: 0 },
  buyPrice: { type: Number, required: false, min: 0, default: 0 },
  sellPrice: { type: Number, required: false, min: 0, default: 0 },
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
    default: ['PAYMENT: 30% IN ADVANCE', 'VALIDITY: 45 DAYS']
  },
  buybackDescription: {
    type: String,
    required: false,
    trim: true
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
  // Set referenceNo to quotationNo if not set or if quotationNo changes
  if (this.quotationNo && (!this.referenceNo || this.isModified('quotationNo'))) {
    this.referenceNo = this.quotationNo
  }
  
  // Default validUntil: 45 days from quotation date (or today)
  if (!this.validUntil) {
    const base = this.date ? new Date(this.date) : new Date()
    this.validUntil = new Date(base.getTime() + 45 * 24 * 60 * 60 * 1000)
  }

  if (this.products && this.products.length > 0) {
    this.subTotal = this.products.reduce((sum, product) => {
      return sum + (product.total || 0);
    }, 0);
  } else {
    this.subTotal = 0
  }

  const subTotal = this.subTotal || 0
  
  // Calculate buyback amount from products
  const totalBuyback = (this.products || []).reduce((sum, product) => {
    return sum + (parseFloat(product.buyPrice) || 0);
  }, 0);
  
  // Amount after buyback
  const afterBuyback = subTotal - totalBuyback;
  
  const salesRate = this.salesTaxEnabled ? (this.salesTaxRate || 0) : 0
  const fbrRate = this.fbrTaxEnabled ? (this.fbrTaxRate || 0) : 0

  // Calculate taxes on amount AFTER buyback (matching frontend calculation)
  this.salesTaxAmount = salesRate > 0 ? Math.round((afterBuyback * salesRate) / 100) : 0
  this.fbrTaxAmount = fbrRate > 0 ? Math.round((afterBuyback * fbrRate) / 100) : 0

  // Only calculate totalAmount if not already provided (frontend sends it)
  // Taxes are SUBTRACTED from afterBuyback (not added), matching frontend calcTotals
  if (this.totalAmount === null || this.totalAmount === undefined || this.totalAmount === 0) {
    this.totalAmount = Math.max(0, afterBuyback - this.salesTaxAmount - this.fbrTaxAmount)
  }
  // Otherwise, use the value sent from frontend (it's already calculated correctly)
  
  next();
});

module.exports = mongoose.model('Quotation', quotationSchema);
