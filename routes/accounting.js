const express = require('express');
const router = express.Router();
const accountingController = require('../controllers/accountingController');

// Get accounting statement (for PDF)
router.get('/statement', accountingController.getAccountingStatement);

// All accounting entries
router.get('/', accountingController.getAllAccounting);

// Accounting stats
router.get('/stats', accountingController.getAccountingStats);

// Single accounting entry
router.get('/:id', accountingController.getAccountingById);

// Create accounting entry
router.post('/', accountingController.createAccountingEntry);

// Update accounting entry
router.put('/:id', accountingController.updateAccountingEntry);

// Delete accounting entry
router.delete('/:id', accountingController.deleteAccountingEntry);

module.exports = router;
