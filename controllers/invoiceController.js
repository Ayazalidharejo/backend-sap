const Invoice = require('../models/Invoice');
const generateSequentialId = require('../utils/generateSequentialId');

// Get all invoices
exports.getAllInvoices = async (req, res) => {
  try {
    // Use lean() for better performance
    const invoices = await Invoice.find().lean().sort({ createdAt: -1 });
    
    // Format invoices with id field
    const formattedInvoices = invoices.map(inv => ({
      ...inv,
      id: inv._id.toString(),
      products: (inv.products || []).map(prod => ({
        ...prod,
        id: prod._id ? prod._id.toString() : (prod.id || Date.now().toString())
      }))
    }));
    
    if (req.query.includeStats === 'true') {
      // Use MongoDB aggregation for faster stats calculation
      const statsPipeline = [
        {
          $group: {
            _id: null,
            totalInvoices: { $sum: 1 },
            totalAmount: { $sum: { $ifNull: ['$totalAmount', 0] } },
            paidAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'Paid'] },
                  { $ifNull: ['$totalAmount', 0] },
                  0
                ]
              }
            },
            pendingAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'Pending'] },
                  { $ifNull: ['$totalAmount', 0] },
                  0
                ]
              }
            }
          }
        }
      ];
      
      const statsResult = await Invoice.aggregate(statsPipeline);
      const stats = statsResult[0] || {
        totalInvoices: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0
      };
      
      return res.json({
        invoices: formattedInvoices,
        stats,
      });
    }
    
    res.json(formattedInvoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single invoice
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    // Format response with id field
    res.json({
      ...invoice.toObject(),
      id: invoice._id.toString(),
      products: invoice.products.map(prod => ({
        ...prod.toObject(),
        id: prod._id ? prod._id.toString() : prod.id
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create invoice
exports.createInvoice = async (req, res) => {
  try {
    const invoiceNo = await generateSequentialId('INV', Invoice, 'invoiceNo');
    
    const invoice = new Invoice({
      invoiceNo,
      ...req.body,
      email: req.body.email || 'duamedicalservice@gmail.com',
    });
    
    await invoice.save();
    
    // Format response with id field
    res.status(201).json({
      ...invoice.toObject(),
      id: invoice._id.toString(),
      products: invoice.products.map(prod => ({
        ...prod.toObject(),
        id: prod._id ? prod._id.toString() : prod.id
      }))
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Invoice number already exists' });
    }
    res.status(400).json({ message: error.message });
  }
};

// Update invoice
exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { ...req.body, email: req.body.email || 'duamedicalservice@gmail.com' },
      { new: true, runValidators: true }
    );
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    // Format response with id field
    res.json({
      ...invoice.toObject(),
      id: invoice._id.toString(),
      products: invoice.products.map(prod => ({
        ...prod.toObject(),
        id: prod._id ? prod._id.toString() : prod.id
      }))
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete invoice
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get invoice statistics
exports.getInvoiceStats = async (req, res) => {
  try {
    // Use MongoDB aggregation for faster stats calculation
    const statsPipeline = [
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$totalAmount', 0] } },
          paidAmount: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'Paid'] },
                { $ifNull: ['$totalAmount', 0] },
                0
              ]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'Pending'] },
                { $ifNull: ['$totalAmount', 0] },
                0
              ]
            }
          }
        }
      }
    ];
    
    const statsResult = await Invoice.aggregate(statsPipeline);
    const stats = statsResult[0] || {
      totalInvoices: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
