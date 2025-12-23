const mongoose = require('mongoose');

// Item Schema
// Relaxed so challans can be created without strict product details
const itemSchema = new mongoose.Schema({
  productName: { type: String, required: false },
  description: { type: String, required: false, trim: true },
  buyDescription: { type: String, required: false, trim: true },
  quantity: { type: Number, required: false, min: 0 },
  unitPrice: { type: Number, required: false, min: 0, default: 0 },
  total: { type: Number, required: false, min: 0, default: 0 },
  buyPrice: { type: Number, required: false, min: 0, default: 0 },
  sellPrice: { type: Number, required: false, min: 0, default: 0 },
}, { _id: true });

// Delivery Challan Schema
const deliveryChallanSchema = new mongoose.Schema({
  challanNo: { 
    type: String, 
    unique: true, 
    required: false, // controller generates this; keep schema flexible
    uppercase: true 
  },
  // Shared reference number across Quotation/Invoice/Delivery Challan (usually the Quotation No)
  referenceNo: {
    type: String,
    trim: true,
    uppercase: true
  },
  // Link back to source quotation (used to prevent duplicate auto-creates)
  sourceQuotationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quotation'
  },
  date: { 
    type: Date, 
    required: false, 
    default: Date.now 
  },
  // Make customer optional so challans can be saved without selecting a customer
  customer: { 
    type: String, 
    required: false,
    trim: true 
  },
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer' 
  },
  address: { 
    type: String, 
    trim: true 
  },
  items: [itemSchema],
  status: { 
    type: String, 
    enum: ['Delivered', 'In Transit', 'Pending'], 
    default: 'Pending' 
  },
  vehicleNo: { 
    type: String, 
    trim: true 
  },
}, { 
  timestamps: true 
});

// Pre-save middleware to set referenceNo to challanNo
deliveryChallanSchema.pre('save', function(next) {
  // Set referenceNo to challanNo if not set or if challanNo changes
  if (this.challanNo && (!this.referenceNo || this.isModified('challanNo'))) {
    this.referenceNo = this.challanNo
  }
  next();
});

module.exports = mongoose.model('DeliveryChallan', deliveryChallanSchema);
