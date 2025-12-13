const express = require('express');
const router = express.Router();
const deliveryChallanController = require('../controllers/deliveryChallanController');

// All delivery challans
router.get('/', deliveryChallanController.getAllDeliveryChallans);

// Delivery challan stats
router.get('/stats', deliveryChallanController.getDeliveryChallanStats);

// Single delivery challan
router.get('/:id', deliveryChallanController.getDeliveryChallanById);

// Create delivery challan
router.post('/', deliveryChallanController.createDeliveryChallan);

// Update delivery challan
router.put('/:id', deliveryChallanController.updateDeliveryChallan);

// Delete delivery challan
router.delete('/:id', deliveryChallanController.deleteDeliveryChallan);

module.exports = router;
