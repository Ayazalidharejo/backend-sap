const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

// All invoices
router.get('/', invoiceController.getAllInvoices);

// Invoice stats
router.get('/stats', invoiceController.getInvoiceStats);

// Single invoice
router.get('/:id', invoiceController.getInvoiceById);

// Create invoice
router.post('/', invoiceController.createInvoice);

// Update invoice
router.put('/:id', invoiceController.updateInvoice);

// Delete invoice
router.delete('/:id', invoiceController.deleteInvoice);

module.exports = router;
