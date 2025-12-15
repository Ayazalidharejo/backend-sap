const mongoose = require('mongoose');

// Item Schema
// Relaxed so challans can be created without strict product details
const itemSchema = new mongoose.Schema({
  productName: { type: String, required: false },
  quantity: { type: Number, required: false, min: 0 },
}, { _id: true });

// Delivery Challan Schema
const deliveryChallanSchema = new mongoose.Schema({
  challanNo: { 
    type: String, 
    unique: true, 
    required: false, // controller generates this; keep schema flexible
    uppercase: true 
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

module.exports = mongoose.model('DeliveryChallan', deliveryChallanSchema);
