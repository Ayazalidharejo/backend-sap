const Inventory = require('../models/Inventory');
const generateSequentialId = require('../utils/generateSequentialId');

// Helper function to determine normalized status for any item
const getNormalizedStatus = (item) => {
  // Check if item is sold
  const isSold = item.isSoldEntry === true ||
                 item.machineCategory === 'sold' ||
                 item.status === 'Sold' ||
                 (item.category === 'productsCategory' && (item.quantity || 0) === 0 && item.buyerName) ||
                 (item.buyerName && (item.quantity || 0) === 0);
  
  if (isSold) {
    return 'Sold';
  }
  
  // Check if item is in repair
  if (item.machineCategory === 'repair' || item.status === 'Repair Items') {
    return 'Repair';
  }
  
  // For machines: check machineCategory
  if (item.category === 'machines') {
    if (item.machineCategory === 'instock' || !item.machineCategory) {
      return 'InStock';
    }
    return item.machineCategory === 'sold' ? 'Sold' : 'Repair';
  }
  
  // For importStock: use status field if available
  if (item.category === 'importStock') {
    if (item.status) {
      // Normalize 'Repair Items' to 'Repair'
      if (item.status === 'Repair Items') {
        return 'Repair';
      }
      return item.status; // 'InStock', 'Sold', or 'Repair'
    }
    // Default to InStock if no status
    return 'InStock';
  }
  
  // For other categories (probs, parts, productsCategory): default to InStock
  // unless explicitly sold (checked above)
  return 'InStock';
};

// Get all inventory items (with optional status filter)
exports.getAllInventory = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Fetch all items (no status filter in query, we'll filter after normalizing)
    // Add timeout to prevent hanging
    const items = await Inventory.find({})
      .lean()
      .sort({ createdAt: -1 })
      .maxTimeMS(30000); // 30 second timeout
    
    // Format items with normalized status field
    let formattedItems = items.map(item => {
      const originalCategory = item.category // Preserve: 'machines', 'probs', 'parts', 'productsCategory', 'importStock'
      const normalizedStatus = getNormalizedStatus(item);
      
      return {
        ...item,
        id: item._id.toString(),
        itemType: originalCategory, // Keep original category as itemType
        status: normalizedStatus, // Always set normalized status
        // For machines: category becomes machineCategory value (instock/repair/sold) for display
        // For importStock: category becomes categoryName for display
        category: originalCategory === 'machines' ? (item.machineCategory || 'instock') : 
                  (originalCategory === 'importStock' && item.categoryName ? item.categoryName : originalCategory)
      }
    });
    
    // Apply status filter if provided
    if (status) {
      formattedItems = formattedItems.filter(item => item.status === status);
    }
    
    if (req.query.includeStats === 'true') {
      // Use MongoDB aggregation for faster stats calculation
      const statsPipeline = [
        {
          $group: {
            _id: null,
            totalStockValue: {
              $sum: {
                $cond: [
                  { $and: [
                    // Exclude sold entries
                    { $ne: [{ $ifNull: ['$isSoldEntry', false] }, true] },
                    // Exclude machines with sold status
                    { $ne: [{ $ifNull: ['$machineCategory', ''] }, 'sold'] },
                    // Exclude items with Sold status
                    { $ne: [{ $ifNull: ['$status', ''] }, 'Sold'] },
                    // Exclude productsCategory with quantity = 0 (sold)
                    { $or: [
                      { $ne: ['$category', 'productsCategory'] },
                      { $gt: [{ $ifNull: ['$quantity', 0] }, 0] }
                    ]},
                    // Exclude items with buyerName AND quantity = 0 (sold)
                    { $or: [
                      { $eq: [{ $ifNull: ['$buyerName', ''] }, ''] },
                      { $eq: ['$buyerName', null] },
                      { $gt: [{ $ifNull: ['$quantity', 0] }, 0] }
                    ]}
                  ]},
                  // Calculate value: price * quantity (if quantity > 0, otherwise use 1 for single items like machines)
                  { $multiply: [
                    { $ifNull: ['$price', 0] },
                    { $cond: [
                      { $gt: [{ $ifNull: ['$quantity', 0] }, 0] },
                      { $ifNull: ['$quantity', 0] },
                      1
                    ]}
                  ]},
                  0
                ]
              }
            },
            itemsInStockMachines: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$category', 'machines'] },
                    { $or: [
                      { $eq: [{ $ifNull: ['$machineCategory', 'instock'] }, 'instock'] },
                      { $eq: ['$machineCategory', null] }
                    ]},
                    { $ne: [{ $ifNull: ['$isSoldEntry', false] }, true] }
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
                    { $eq: [{ $ifNull: ['$machineCategory', ''] }, 'sold'] },
                    { $eq: [{ $ifNull: ['$status', ''] }, 'Sold'] },
                    { $eq: [{ $ifNull: ['$isSoldEntry', false] }, true] },
                    { $and: [
                      { $eq: ['$category', 'productsCategory'] },
                      { $lte: [{ $ifNull: ['$quantity', 0] }, 0] }
                    ]},
                    { $and: [
                      { $ne: [{ $ifNull: ['$buyerName', ''] }, ''] },
                      { $ne: ['$buyerName', null] }
                    ]}
                  ]},
                  1,
                  0
                ]
              }
            },
            stockInProbes: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$category', 'probs'] },
                    { $ne: [{ $ifNull: ['$isSoldEntry', false] }, true] },
                    { $ne: [{ $ifNull: ['$status', ''] }, 'Sold'] }
                  ]},
                  1,
                  0
                ]
              }
            },
            stockInParts: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$category', 'parts'] },
                    { $ne: [{ $ifNull: ['$isSoldEntry', false] }, true] },
                    { $ne: [{ $ifNull: ['$status', ''] }, 'Sold'] },
                    { $gt: [{ $ifNull: ['$quantity', 0] }, 0] }
                  ]},
                  1,
                  0
                ]
              }
            }
          }
        }
      ];
      
      // Add timeout to aggregate query to prevent hanging
      const statsResult = await Inventory.aggregate(statsPipeline, { maxTimeMS: 30000 });
      const stats = statsResult[0] || {
        totalStockValue: 0,
        itemsInStockMachines: 0,
        itemsSold: 0,
        stockInProbes: 0,
        stockInParts: 0
      };
      
      // Calculate all stats manually for accuracy (use already fetched items instead of querying again)
      const allItems = items; // Reuse items already fetched above
      
      let manualTotalStockValue = 0;
      let manualItemsInStockMachines = 0;
      let manualItemsSold = 0;
      let manualStockInProbes = 0;
      let manualStockInParts = 0;
      
      const includedItems = [];
      const excludedItems = [];
      const machinesInStock = [];
      const soldItems = [];
      const probesInStock = [];
      const partsInStock = [];
      
      allItems.forEach(item => {
        // Check if item is sold - be more specific
        const isSold = item.isSoldEntry === true ||
                      item.machineCategory === 'sold' ||
                      item.status === 'Sold' ||
                      (item.category === 'productsCategory' && (item.quantity || 0) === 0 && item.buyerName) ||
                      (item.buyerName && (item.quantity || 0) === 0 && item.category === 'productsCategory');
        
        // Count sold items
        if (isSold) {
          manualItemsSold++;
          soldItems.push({
            id: item._id.toString(),
            category: item.category,
            productName: item.productName || item.description || 'N/A',
            reason: item.isSoldEntry ? 'isSoldEntry' : 
                   item.machineCategory === 'sold' ? 'machineCategory=sold' :
                   item.status === 'Sold' ? 'status=Sold' :
                   (item.quantity || 0) === 0 && item.buyerName ? 'quantity=0 with buyerName' : 'other'
          });
        }
        
        // Count in-stock items and calculate value
        if (!isSold) {
          // Calculate stock value
          const price = item.price || 0;
          // For items with quantity > 0, use that quantity
          // For items without quantity (like machines), use 1
          const quantity = (item.quantity || 0) > 0 ? item.quantity : 1;
          const value = price * quantity;
          manualTotalStockValue += value;
          
          // Count machines in stock (only instock or null, not repair or sold)
          if (item.category === 'machines') {
            // Only count machines with machineCategory = 'instock' or null/undefined (default in stock)
            // Exclude 'repair' and 'sold'
            const machineCategory = item.machineCategory;
            const isMachineInStock = (machineCategory === 'instock' || 
                                     machineCategory === null || 
                                     machineCategory === undefined);
            
            if (isMachineInStock) {
              manualItemsInStockMachines++;
              machinesInStock.push({
                id: item._id.toString(),
                productName: item.productName || item.description || 'N/A',
                machineCategory: machineCategory,
                price: price,
                quantity: quantity
              });
            }
          }
          
          // Count probes in stock
          if (item.category === 'probs') {
            manualStockInProbes++;
            probesInStock.push({
              id: item._id.toString(),
              productName: item.productName || item.description || 'N/A',
              price: price,
              quantity: quantity
            });
          }
          
          // Count parts in stock
          if (item.category === 'parts' && (item.quantity || 0) > 0) {
            manualStockInParts++;
            partsInStock.push({
              id: item._id.toString(),
              productName: item.productName || item.description || 'N/A',
              price: price,
              quantity: quantity
            });
          }
          
          includedItems.push({
            id: item._id.toString(),
            category: item.category,
            productName: item.productName || item.description || 'N/A',
            price: price,
            quantity: quantity,
            value: value,
            machineCategory: item.machineCategory,
            status: item.status
          });
        }
      });
      
      // Use manual calculations for all stats
      const finalStats = {
        totalStockValue: manualTotalStockValue,
        itemsInStockMachines: manualItemsInStockMachines,
        itemsSold: manualItemsSold,
        stockInProbes: manualStockInProbes,
        stockInParts: manualStockInParts
      };
      
      // Debug log for stats
      console.log('📊 Backend Stats Calculated (Aggregate):', stats);
      console.log('📊 Backend Stats Calculated (Manual):', finalStats);
      console.log('💰 Detailed Stats Breakdown:', {
        totalItems: allItems.length,
        includedItemsCount: includedItems.length,
        excludedItemsCount: excludedItems.length,
        machinesInStock: machinesInStock.length,
        soldItems: soldItems.length,
        probesInStock: probesInStock.length,
        partsInStock: partsInStock.length,
        sampleMachines: machinesInStock.slice(0, 5),
        sampleSold: soldItems.slice(0, 5),
        sampleIncluded: includedItems.filter(i => i.value > 0).slice(0, 10)
      });
      
      return res.json({
        items: formattedItems,
        stats: finalStats, // Use manual calculations for all stats
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
    let pN, serialNo, sN;
    
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
    } else if (category === 'productsCategory') {
      if (!req.body.pN) pN = await generateSequentialId('PN', Inventory, 'pN');
      if (!req.body.serialNo) serialNo = await generateSequentialId('MCH', Inventory, 'serialNo');
    } else if (category === 'probs') {
      // Box No should be entered manually for probes
      if (!req.body.boxNo) {
        return res.status(400).json({ message: 'Box No is required for probes' });
      }
    } else if (category === 'parts') {
      // No auto-generation needed for parts
    } else if (category === 'importStock') {
      // Serial No should be entered manually for import stock
      if (!req.body.serialNo) {
        return res.status(400).json({ message: 'Serial No is required for import stock' });
      }
    }
    
    // Set initialQuantity only for stock items (not for sold-entry rows)
    const isSoldEntry = req.body.isSoldEntry === true
    let initialQuantity
    if (!isSoldEntry) {
      if (category === 'machines') {
        // machines are typically single items; default initial to 1 if not provided
        const q = req.body.quantity
        initialQuantity = typeof q === 'number' ? q : (q !== undefined ? parseInt(q) : 1)
        if (!Number.isFinite(initialQuantity) || initialQuantity < 0) initialQuantity = 1
      } else {
        const q = req.body.quantity
        initialQuantity = typeof q === 'number' ? q : (q !== undefined ? parseInt(q) : 0)
        if (!Number.isFinite(initialQuantity) || initialQuantity < 0) initialQuantity = 0
      }
    }

    const item = new Inventory({
      ...req.body,
      sN: req.body.sN || sN,
      // Use provided values, fallback to auto-generated only if not provided
      pN: req.body.pN || pN,
      serialNo: req.body.serialNo || serialNo,
      boxNo: req.body.boxNo,
      ...(initialQuantity !== undefined ? { initialQuantity } : {})
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
