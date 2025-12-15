const DeliveryChallan = require('../models/DeliveryChallan');
const generateSequentialId = require('../utils/generateSequentialId');

// Get all delivery challans
exports.getAllDeliveryChallans = async (req, res) => {
  try {
    const challans = await DeliveryChallan.find().sort({ createdAt: -1 });
    
    // Format challans with id field
    const formattedChallans = challans.map(challan => ({
      ...challan.toObject(),
      id: challan._id.toString(),
      items: challan.items ? challan.items.length : 0 // Convert items array to count if needed
    }));
    
    if (req.query.includeStats === 'true') {
      const stats = {
        totalChallans: challans.length,
        delivered: challans.filter(dc => dc.status === 'Delivered').length,
        inTransit: challans.filter(dc => dc.status === 'In Transit').length,
        pending: challans.filter(dc => dc.status === 'Pending').length,
      };
      
      return res.json({
        deliveryChallans: formattedChallans,
        deliveryChallanStats: stats,
      });
    }
    
    res.json(formattedChallans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single delivery challan
exports.getDeliveryChallanById = async (req, res) => {
  try {
    const challan = await DeliveryChallan.findById(req.params.id);
    
    if (!challan) {
      return res.status(404).json({ message: 'Delivery challan not found' });
    }
    
    // Format response with id field
    res.json({
      ...challan.toObject(),
      id: challan._id.toString(),
      items: challan.items ? challan.items.length : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create delivery challan
exports.createDeliveryChallan = async (req, res) => {
  try {
    // Generate challan number, but allow flexible payload (no manual required-field validation)
    const challanNo = await generateSequentialId('DC', DeliveryChallan, 'challanNo');
    
    const challanData = { ...req.body };
    
    // If items is provided as a number, convert to array
    if (req.body.items !== undefined && !Array.isArray(req.body.items)) {
      const itemsCount = parseInt(req.body.items) || 0;
      if (itemsCount > 0) {
        challanData.items = Array.from({ length: itemsCount }, (_, i) => ({
          productName: `Item ${i + 1}`,
          quantity: 1
        }));
      } else {
        challanData.items = []; // Empty array if count is 0
      }
    }
    
    // Ensure items is always an array
    if (!challanData.items) {
      challanData.items = [];
    }
    
    const challan = new DeliveryChallan({
      challanNo,
      ...challanData,
    });
    
    await challan.save();
    
    // Format response with id field
    res.status(201).json({
      ...challan.toObject(),
      id: challan._id.toString(),
      items: challan.items ? challan.items.length : 0
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Challan number already exists' });
    }
    // Provide more detailed error message
    const errorMessage = error.errors 
      ? Object.values(error.errors).map(e => e.message).join(', ')
      : error.message;
    res.status(400).json({ message: errorMessage || 'Failed to create delivery challan' });
  }
};

// Update delivery challan
exports.updateDeliveryChallan = async (req, res) => {
  try {
    const updateData = { ...req.body }
    
    // If items is provided as a number, convert to array
    if (req.body.items !== undefined && !Array.isArray(req.body.items)) {
      const itemsCount = parseInt(req.body.items) || 0;
      if (itemsCount > 0) {
        updateData.items = Array.from({ length: itemsCount }, (_, i) => ({
          productName: `Item ${i + 1}`,
          quantity: 1
        }));
      } else {
        updateData.items = []; // Empty array if count is 0
      }
    }
    
    const challan = await DeliveryChallan.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!challan) {
      return res.status(404).json({ message: 'Delivery challan not found' });
    }
    
    // Format response with id field and items count
    const response = challan.toObject()
    response.id = challan._id.toString()
    response.items = challan.items ? challan.items.length : 0 // Frontend expects count
    
    res.json(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete delivery challan
exports.deleteDeliveryChallan = async (req, res) => {
  try {
    const challan = await DeliveryChallan.findByIdAndDelete(req.params.id);
    
    if (!challan) {
      return res.status(404).json({ message: 'Delivery challan not found' });
    }
    
    res.json({ message: 'Delivery challan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get delivery challan statistics
exports.getDeliveryChallanStats = async (req, res) => {
  try {
    const challans = await DeliveryChallan.find();
    
    const stats = {
      totalChallans: challans.length,
      delivered: challans.filter(dc => dc.status === 'Delivered').length,
      inTransit: challans.filter(dc => dc.status === 'In Transit').length,
      pending: challans.filter(dc => dc.status === 'Pending').length,
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
