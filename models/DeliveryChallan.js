const mongoose = require('mongoose');

// Item Schema
const itemSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
}, { _id: true });

// Delivery Challan Schema
const deliveryChallanSchema = new mongoose.Schema({
  challanNo: { 
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
