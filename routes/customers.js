const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// All customers
router.get('/', customerController.getAllCustomers);

// Customer stats
router.get('/stats', customerController.getCustomerStats);

// Single customer
router.get('/:id', customerController.getCustomerById);

// Create customer
router.post('/', customerController.createCustomer);

// Update customer
router.put('/:id', customerController.updateCustomer);

// Delete customer
router.delete('/:id', customerController.deleteCustomer);

// Ledger entries
router.post('/:id/ledger', customerController.addLedgerEntry);
router.put('/:id/ledger/:entryId', customerController.updateLedgerEntry);
router.delete('/:id/ledger/:entryId', customerController.deleteLedgerEntry);

module.exports = router;
