const Inventory = require('../models/Inventory');
const generateSequentialId = require('../utils/generateSequentialId');

// Get all inventory items (with optional category filter)
exports.getAllInventory = async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};
    
    // Use lean() for better performance - returns plain JavaScript objects
    const items = await Inventory.find(query).lean().sort({ createdAt: -1 });
    
    // Format items with id field - preserve original category, add itemType field
    const formattedItems = items.map(item => {
      const originalCategory = item.category // Preserve: 'machines', 'probs', 'parts', 'productsCategory', 'importStock'
      
      return {
        ...item,
        id: item._id.toString(),
        itemType: originalCategory, // Keep original category as itemType
        // For machines: category becomes machineCategory value (instock/repair/sold) for display
        // For importStock: category becomes categoryName for display
        category: originalCategory === 'machines' ? (item.machineCategory || 'instock') : 
                  (originalCategory === 'importStock' && item.categoryName ? item.categoryName : originalCategory)
      }
    });
    
    if (req.query.includeStats === 'true') {
      // Use MongoDB aggregation for faster stats calculation
      const statsPipeline = [
        {
          $group: {
            _id: null,
            totalStockValue: {
              $sum: { $multiply: [{ $ifNull: ['$price', 0] }, { $ifNull: ['$quantity', 0] }] }
            },
            itemsInStockMachines: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$category', 'machines'] },
                    { $eq: ['$machineCategory', 'instock'] }
                  ]},
                  1,
                  0
                ]
              }
            },
            itemsSold: {
              $sum: {
                $cond: [
                  { $or: [
                    { $eq: ['$machineCategory', 'sold'] },
                    { $eq: ['$status', 'Sold'] }
                  ]},
                  1,
                  0
                ]
              }
            },
            stockInProbes: {
              $sum: {
                $cond: [{ $eq: ['$category', 'probs'] }, 1, 0]
              }
            },
            stockInParts: {
              $sum: {
                $cond: [{ $eq: ['$category', 'parts'] }, 1, 0]
              }
            }
          }
        }
      ];
      
      const statsResult = await Inventory.aggregate(statsPipeline);
      const stats = statsResult[0] || {
        totalStockValue: 0,
        itemsInStockMachines: 0,
        itemsSold: 0,
        stockInProbes: 0,
        stockInParts: 0
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
    
    // Generate IDs based on category (only if not provided)
    let pN, serialNo, boxNo, modelNo, sN;
    
    // Get max S/N (only if not provided)
    if (!req.body.sN) {
      const maxSN = await Inventory.findOne({ category }).sort({ sN: -1 });
      sN = maxSN ? (maxSN.sN || 0) + 1 : 1;
    } else {
      sN = req.body.sN;
    }
    
    // Generate other IDs based on category (only if not provided)
    if (category === 'machines') {
      // For machines: all fields should be provided manually, auto-generate only if not provided
      if (!req.body.modelNo) {
        modelNo = await generateSequentialId('MOD', Inventory, 'modelNo');
      }
    } else if (category === 'productsCategory') {
      if (!req.body.pN) pN = await generateSequentialId('PN', Inventory, 'pN');
      if (!req.body.serialNo) serialNo = await generateSequentialId('MCH', Inventory, 'serialNo');
      if (!req.body.modelNo) modelNo = await generateSequentialId('MOD', Inventory, 'modelNo');
    } else if (category === 'probs') {
      if (!req.body.boxNo) boxNo = await generateSequentialId('BX', Inventory, 'boxNo');
      if (!req.body.modelNo) modelNo = await generateSequentialId('MOD', Inventory, 'modelNo');
    } else if (category === 'parts') {
      if (!req.body.modelNo) modelNo = await generateSequentialId('MOD', Inventory, 'modelNo');
    } else if (category === 'importStock') {
      if (!req.body.serialNo) serialNo = await generateSequentialId('IMP', Inventory, 'serialNo');
    }
    
    const item = new Inventory({
      ...req.body,
      sN: req.body.sN || sN,
      // Use provided values, fallback to auto-generated only if not provided
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
    // Use MongoDB aggregation for faster stats calculation
    const statsPipeline = [
      {
        $group: {
          _id: null,
          totalStockValue: {
            $sum: { $multiply: [{ $ifNull: ['$price', 0] }, { $ifNull: ['$quantity', 0] }] }
          },
          itemsInStockMachines: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$category', 'machines'] },
                  { $eq: ['$machineCategory', 'instock'] }
                ]},
                1,
                0
              ]
            }
          },
          itemsSold: {
            $sum: {
              $cond: [
                { $or: [
                  { $eq: ['$machineCategory', 'sold'] },
                  { $eq: ['$status', 'Sold'] }
                ]},
                1,
                0
              ]
            }
          },
          stockInProbes: {
            $sum: {
              $cond: [{ $eq: ['$category', 'probs'] }, 1, 0]
            }
          },
          stockInParts: {
            $sum: {
              $cond: [{ $eq: ['$category', 'parts'] }, 1, 0]
            }
          }
        }
      }
    ];
    
    const statsResult = await Inventory.aggregate(statsPipeline);
    const stats = statsResult[0] || {
      totalStockValue: 0,
      itemsInStockMachines: 0,
      itemsSold: 0,
      stockInProbes: 0,
      stockInParts: 0
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
