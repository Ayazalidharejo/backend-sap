const Inventory = require('../models/Inventory');
const generateSequentialId = require('../utils/generateSequentialId');

// Get all inventory items (with optional category filter)
exports.getAllInventory = async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};
    
    const items = await Inventory.find(query).sort({ createdAt: -1 });
    
    // Format items with id field - preserve original category, add itemType field
    const formattedItems = items.map(item => {
      const itemObj = item.toObject()
      const originalCategory = itemObj.category // Preserve: 'machines', 'probs', 'parts', 'productsCategory', 'importStock'
      
      return {
        ...itemObj,
        id: item._id.toString(),
        itemType: originalCategory, // Keep original category as itemType
        // For machines: category becomes machineCategory value (instock/repair/sold) for display
        // For importStock: category becomes categoryName for display
        category: originalCategory === 'machines' ? (itemObj.machineCategory || 'instock') : 
                  (originalCategory === 'importStock' && itemObj.categoryName ? itemObj.categoryName : originalCategory)
      }
    });
    
    if (req.query.includeStats === 'true') {
      const stats = {
        totalStockValue: items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0),
        itemsInStockMachines: items.filter(i => i.category === 'machines' && (i.machineCategory === 'instock' || i.category === 'instock')).length,
        itemsSold: items.filter(i => (i.machineCategory === 'sold' || i.status === 'Sold')).length,
        stockInProbes: items.filter(i => i.category === 'probs').length,
        stockInParts: items.filter(i => i.category === 'parts').length,
      };
      
      return res.json({
        items: formattedItems,
        stats,
      });
    }
    
    res.json(formattedItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single inventory item
exports.getInventoryById = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    
    const itemObj = item.toObject()
    // For machines, map machineCategory to category
    if (itemObj.category === 'machines') {
      itemObj.category = itemObj.machineCategory || 'instock'
    }
    // For importStock, use categoryName as category
    if (itemObj.category === 'importStock' && itemObj.categoryName) {
      itemObj.category = itemObj.categoryName
    }
    
    res.json({
      ...itemObj,
      id: item._id.toString()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create inventory item
exports.createInventoryItem = async (req, res) => {
  try {
    const { category } = req.body;
    
    // Generate IDs based on category
    let pN, serialNo, boxNo, modelNo, sN;
    
    // Get max S/N
    const maxSN = await Inventory.findOne({ category }).sort({ sN: -1 });
    sN = maxSN ? (maxSN.sN || 0) + 1 : 1;
    
    // Generate other IDs based on category
    if (category === 'machines' || category === 'productsCategory') {
      pN = await generateSequentialId('PN', Inventory, 'pN');
      serialNo = await generateSequentialId('MCH', Inventory, 'serialNo');
      modelNo = await generateSequentialId('MOD', Inventory, 'modelNo');
    } else if (category === 'probs') {
      boxNo = await generateSequentialId('BX', Inventory, 'boxNo');
      modelNo = await generateSequentialId('MOD', Inventory, 'modelNo');
    } else if (category === 'parts') {
      modelNo = await generateSequentialId('MOD', Inventory, 'modelNo');
    } else if (category === 'importStock') {
      serialNo = await generateSequentialId('IMP', Inventory, 'serialNo');
    }
    
    const item = new Inventory({
      ...req.body,
      sN,
      pN: req.body.pN || pN,
      serialNo: req.body.serialNo || serialNo,
      boxNo: req.body.boxNo || boxNo,
      modelNo: req.body.modelNo || modelNo,
    });
    
    await item.save();
    
      // Format response with id field and category mapping
    const itemObj = item.toObject()
    if (itemObj.category === 'machines') {
      itemObj.category = itemObj.machineCategory || 'instock'
    }
    if (itemObj.category === 'importStock' && itemObj.categoryName) {
      itemObj.category = itemObj.categoryName
    }
    res.status(201).json({
      ...itemObj,
      id: item._id.toString()
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update inventory item
exports.updateInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    
    // Format response with id field and category mapping
    const itemObj = item.toObject()
    if (itemObj.category === 'machines') {
      itemObj.category = itemObj.machineCategory || 'instock'
    }
    if (itemObj.category === 'importStock' && itemObj.categoryName) {
      itemObj.category = itemObj.categoryName
    }
    res.json({
      ...itemObj,
      id: item._id.toString()
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete inventory item
exports.deleteInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get inventory statistics
exports.getInventoryStats = async (req, res) => {
  try {
    const items = await Inventory.find();
    
    const stats = {
      totalStockValue: items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0),
      itemsInStockMachines: items.filter(i => i.category === 'machines' && i.machineCategory === 'instock').length,
      itemsSold: items.filter(i => i.machineCategory === 'sold' || i.status === 'Sold').length,
      stockInProbes: items.filter(i => i.category === 'probs').length,
      stockInParts: items.filter(i => i.category === 'parts').length,
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
