const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');

// All quotations
router.get('/', quotationController.getAllQuotations);

// Quotation stats
router.get('/stats', quotationController.getQuotationStats);

// Single quotation
router.get('/:id', quotationController.getQuotationById);

// Create quotation
router.post('/', quotationController.createQuotation);

// Update quotation (with auto-invoice generation)
router.put('/:id', quotationController.updateQuotation);

// Delete quotation
router.delete('/:id', quotationController.deleteQuotation);

module.exports = router;
