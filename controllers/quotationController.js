const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');
const generateSequentialId = require('../utils/generateSequentialId');

// Get all quotations
exports.getAllQuotations = async (req, res) => {
  try {
    // Use lean() for better performance
    const quotations = await Quotation.find().lean().sort({ createdAt: -1 });
    
    // Format quotations with id field
    const formattedQuotations = quotations.map(quo => ({
      ...quo,
      id: quo._id.toString(),
      products: (quo.products || []).map(prod => ({
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
            totalQuotations: { $sum: 1 },
            totalAmount: { $sum: { $ifNull: ['$totalAmount', 0] } },
            accepted: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0]
              }
            },
            pending: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0]
              }
            }
          }
        }
      ];
      
      const statsResult = await Quotation.aggregate(statsPipeline);
      const stats = statsResult[0] || {
        totalQuotations: 0,
        totalAmount: 0,
        accepted: 0,
        pending: 0
      };
      
      return res.json({
        quotations: formattedQuotations,
        stats,
      });
    }
    
    res.json(formattedQuotations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single quotation
exports.getQuotationById = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    
    // Format response with id field
    res.json({
      ...quotation.toObject(),
      id: quotation._id.toString(),
      products: quotation.products.map(prod => ({
        ...prod.toObject(),
        id: prod._id ? prod._id.toString() : prod.id
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create quotation
exports.createQuotation = async (req, res) => {
  try {
    const quotationNo = await generateSequentialId('QUO', Quotation, 'quotationNo');
    
    const quotation = new Quotation({
      quotationNo,
      ...req.body,
      email: req.body.email || 'duamedicalservice@gmail.com',
    });
    
    await quotation.save();
    
    // Format response with id field
    res.status(201).json({
      ...quotation.toObject(),
      id: quotation._id.toString(),
      products: quotation.products.map(prod => ({
        ...prod.toObject(),
        id: prod._id ? prod._id.toString() : prod.id
      }))
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Quotation number already exists' });
    }
    res.status(400).json({ message: error.message });
  }
};

// Update quotation (with auto-invoice generation)
exports.updateQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    
    const wasAccepted = quotation.status === 'Accepted';
    const isNowAccepted = req.body.status === 'Accepted';
    
    // Update quotation
    Object.assign(quotation, {
      ...req.body,
      email: req.body.email || 'duamedicalservice@gmail.com',
    });
    await quotation.save();
    
    // Auto-generate invoice if status changed to "Accepted"
    if (isNowAccepted && !wasAccepted) {
      const invoiceNo = await generateSequentialId('INV', Invoice, 'invoiceNo');
      
      const invoice = new Invoice({
        invoiceNo,
        date: new Date(),
        customer: quotation.customer,
        customerId: quotation.customerId,
        subject: quotation.subject || `Invoice for ${quotation.quotationNo}`,
        address: quotation.address,
        email: quotation.email || 'duamedicalservice@gmail.com',
        products: quotation.products,
        totalAmount: quotation.totalAmount,
        status: 'Pending',
        dueDate: quotation.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });
      
      await invoice.save();
    }
    
    // Format response with id field
    res.json({
      ...quotation.toObject(),
      id: quotation._id.toString(),
      products: quotation.products.map(prod => ({
        ...prod.toObject(),
        id: prod._id ? prod._id.toString() : prod.id
      }))
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete quotation
exports.deleteQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findByIdAndDelete(req.params.id);
    
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    
    res.json({ message: 'Quotation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get quotation statistics
exports.getQuotationStats = async (req, res) => {
  try {
    const quotations = await Quotation.find();
    
    const stats = {
      totalQuotations: quotations.length,
      totalAmount: quotations.reduce((sum, quo) => sum + quo.totalAmount, 0),
      accepted: quotations.filter(quo => quo.status === 'Accepted').length,
      pending: quotations.filter(quo => quo.status === 'Pending').length,
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
