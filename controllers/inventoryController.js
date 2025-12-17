const Inventory = require('../models/Inventory');
const generateSequentialId = require('../utils/generateSequentialId');

// Get all inventory items (with optional category filter)
exports.getAllInventory = async (req, res) => {
  try {
    const { category, machineStatus } = req.query;
    let query = category ? { category } : {};
    
    // Add machineCategory filter for machines if machineStatus is provided
    if (category === 'machines' && machineStatus) {
      // machineStatus can be comma-separated values like "instock,repair,sold"
      const statusArray = machineStatus.split(',').map(s => s.trim()).filter(s => s.length > 0);
      if (statusArray.length > 0) {
        // Handle null/undefined machineCategory as 'instock' (default)
        // If 'instock' is in the filter, also include items where machineCategory is null/undefined
        if (statusArray.includes('instock')) {
          // Use $or to include items with null/undefined machineCategory when filtering for 'instock'
          query = {
            category: 'machines',
            $or: [
              { machineCategory: { $in: statusArray } },
              { machineCategory: { $exists: false } },
              { machineCategory: null }
            ]
          };
        } else {
          // For other filters (repair, sold), only match exact values
          query = {
            category: 'machines',
            machineCategory: { $in: statusArray }
          };
        }
      }
      console.log('🔍 Backend Machines Filter:', {
        category,
        machineStatus,
        statusArray,
        query: JSON.stringify(query),
        queryObject: query
      });
    } else if (category === 'machines') {
      // If machines category but no machineStatus, show all machines
      console.log('🔍 Backend Machines (No Filter):', {
        category,
        query: JSON.stringify(query)
      });
    }
    
    // Use lean() for better performance - returns plain JavaScript objects
    const items = await Inventory.find(query).lean().sort({ createdAt: -1 });
    
    // Debug log for machines
    if (category === 'machines') {
      console.log('📦 Backend Machines Results:', {
        totalItems: items.length,
        items: items.map(item => ({
          id: item._id.toString(),
          productName: item.productName,
          machineCategory: item.machineCategory
        }))
      });
    }
    
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
      
      const statsResult = await Inventory.aggregate(statsPipeline);
      const stats = statsResult[0] || {
        totalStockValue: 0,
        itemsInStockMachines: 0,
        itemsSold: 0,
        stockInProbes: 0,
        stockInParts: 0
      };
      
      // Calculate all stats manually for accuracy
      const allItems = await Inventory.find({}).lean();
      
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
    let pN, serialNo, boxNo, sN;
    
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
      if (!req.body.boxNo) boxNo = await generateSequentialId('BX', Inventory, 'boxNo');
    } else if (category === 'parts') {
      // No auto-generation needed for parts
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
