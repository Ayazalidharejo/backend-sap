const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// All inventory items
router.get('/', inventoryController.getAllInventory);

// Inventory stats
router.get('/stats', inventoryController.getInventoryStats);

// Single inventory item
router.get('/:id', inventoryController.getInventoryById);

// Create inventory item
router.post('/', inventoryController.createInventoryItem);

// Update inventory item
router.put('/:id', inventoryController.updateInventoryItem);

// Delete inventory item
router.delete('/:id', inventoryController.deleteInventoryItem);

module.exports = router;
