const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');
const DeliveryChallan = require('../models/DeliveryChallan');
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
    
    // Auto-generate Invoice + Delivery Challan if status changed to "Accepted"
    // Both will share the same referenceNo (REFxxx) so all three match.
    if (isNowAccepted && !wasAccepted) {
      // Generate referenceNo ONLY on first acceptance
      const referenceNo = (quotation.referenceNo || await generateSequentialId('REF', Quotation, 'referenceNo')).toUpperCase()
      quotation.referenceNo = referenceNo

      // ===== Invoice (idempotent) =====
      let invoice = await Invoice.findOne({
        $or: [
          { sourceQuotationId: quotation._id },
          // Backward-compat: older auto-created invoices used this subject format
          { subject: `Invoice for ${quotation.quotationNo}` },
          ...(referenceNo ? [{ referenceNo }] : [])
        ]
      });

      if (!invoice) {
        const invoiceNo = await generateSequentialId('INV', Invoice, 'invoiceNo');

        invoice = new Invoice({
          invoiceNo,
          referenceNo,
          sourceQuotationId: quotation._id,
          date: quotation.date || new Date(),
          customer: quotation.customer,
          customerId: quotation.customerId,
          subject: quotation.subject || `Invoice for ${quotation.quotationNo}`,
          address: quotation.address,
          email: quotation.email || 'duamedicalservice@gmail.com',
          products: quotation.products,
          // Carry tax config forward
          salesTaxEnabled: quotation.salesTaxEnabled,
          salesTaxRate: quotation.salesTaxRate,
          fbrTaxEnabled: quotation.fbrTaxEnabled,
          fbrTaxRate: quotation.fbrTaxRate,
          status: 'Pending',
          dueDate: quotation.validUntil, // already defaults to +30 days in model
        });

        await invoice.save();
      } else if (!invoice.referenceNo && referenceNo) {
        // Backfill referenceNo for older invoices created before this feature existed
        invoice.referenceNo = referenceNo
        await invoice.save()
      }

      // ===== Delivery Challan (idempotent) =====
      let challan = await DeliveryChallan.findOne({
        $or: [
          { sourceQuotationId: quotation._id },
          ...(referenceNo ? [{ referenceNo }] : [])
        ]
      });

      if (!challan) {
        const challanNo = await generateSequentialId('DC', DeliveryChallan, 'challanNo');

        const challanItems = Array.isArray(quotation.products)
          ? quotation.products
              .filter(p => (p && (p.product || '').trim()) !== '')
              .map(p => ({
                productName: p.product,
                quantity: p.quantity || 0
              }))
          : [];

        challan = new DeliveryChallan({
          challanNo,
          referenceNo,
          sourceQuotationId: quotation._id,
          date: quotation.date || new Date(),
          customer: quotation.customer,
          customerId: quotation.customerId,
          items: challanItems,
          status: 'Pending',
          vehicleNo: ''
        });

        await challan.save();
      } else if (!challan.referenceNo && referenceNo) {
        // Backfill referenceNo for older challans created before this feature existed
        challan.referenceNo = referenceNo
        await challan.save()
      }

      // Link back to quotation (best-effort)
      quotation.linkedInvoiceId = invoice?._id || quotation.linkedInvoiceId
      quotation.linkedDeliveryChallanId = challan?._id || quotation.linkedDeliveryChallanId
      await quotation.save()
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
