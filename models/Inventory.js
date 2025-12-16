const mongoose = require('mongoose');

// Unified Inventory Schema (for machines, probs, parts, productsCategory, importStock)
const inventorySchema = new mongoose.Schema({
  category: { 
    type: String, 
    enum: ['machines', 'probs', 'parts', 'productsCategory', 'importStock'], 
    required: true 
  },
  sN: { type: Number },
  pN: { type: String, trim: true }, // Product Number
  serialNo: { type: String, trim: true },
  boxNo: { type: String, trim: true },
  productName: { type: String, trim: true },
  partName: { type: String, trim: true },
  probes: { type: String, trim: true },
  proType: { type: String, trim: true }, // Probe Type
  description: { type: String, trim: true },
  quantity: { type: Number, default: 0, min: 0 },
  price: { type: Number, min: 0 },
  categoryName: { type: String, trim: true, default: 'Default' }, // For custom categories
  
  // For machines only
  machineCategory: { 
    type: String, 
    enum: ['instock', 'repair', 'sold'] 
  },
  
  // For importStock only
  status: { 
    type: String, 
    enum: ['InStock', 'Sold', 'Repair Items'] 
  },
  
  // For sold items
  buyerName: { type: String, trim: true },
  buyerSerial: { type: String, trim: true },
  buyerCity: { type: String, trim: true },
  
  // Sale metadata (for tracking last sale)
  lastSoldQuantity: { type: Number, min: 0 },
  lastSoldUnitPrice: { type: Number, min: 0 },
  lastSoldTotal: { type: Number, min: 0 },
  lastSoldDate: { type: Date },
  lastSoldCustomer: { type: String, trim: true },
  
  // Flag to identify sold entries (separate from stock items)
  isSoldEntry: { type: Boolean, default: false },
  
  date: { 
    type: Date, 
    default: Date.now 
  },
}, { 
  timestamps: true 
});

// Indexes for better query performance
inventorySchema.index({ category: 1 });
inventorySchema.index({ categoryName: 1 });
inventorySchema.index({ productName: 1 });
inventorySchema.index({ createdAt: -1 });
inventorySchema.index({ machineCategory: 1 });
inventorySchema.index({ status: 1 });
inventorySchema.index({ sN: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
