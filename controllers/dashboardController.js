const Invoice = require('../models/Invoice');
const Accounting = require('../models/Accounting');
const Inventory = require('../models/Inventory');
const Customer = require('../models/Customer');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Use parallel queries and aggregation for better performance
    const [expensesAgg, inventoryAgg, revenueAgg, invoicesAgg, incomeAgg] = await Promise.all([
      // Total expenses aggregation
      Accounting.aggregate([
        { $match: { category: 'Expense' } },
        { $group: { _id: null, totalExpenses: { $sum: { $ifNull: ['$debit', 0] } } } }
      ]),
      // Inventory stats aggregation
      Inventory.aggregate([
        {
          $group: {
            _id: null,
            totalStockCount: { $sum: 1 },
            probs: {
              $sum: { $cond: [{ $eq: ['$category', 'probs'] }, 1, 0] }
            },
            machine: {
              $sum: { $cond: [{ $eq: ['$category', 'machines'] }, 1, 0] }
            },
            parts: {
              $sum: { $cond: [{ $eq: ['$category', 'parts'] }, 1, 0] }
            },
            soldItems: {
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
            }
          }
        }
      ]),
      // Sales revenue aggregation - Calculate from sold inventory items (matching Reports page)
      // Use lastSoldTotal if available, otherwise calculate from lastSoldUnitPrice * lastSoldQuantity
      Inventory.aggregate([
        {
          $match: { isSoldEntry: true }
        },
        {
          $addFields: {
            // Calculate unit price: prefer lastSoldUnitPrice, fallback to price
            calcUnitPrice: {
              $cond: [
                { $gt: [{ $ifNull: ['$lastSoldUnitPrice', 0] }, 0] },
                { $ifNull: ['$lastSoldUnitPrice', 0] },
                { $ifNull: ['$price', 0] }
              ]
            },
            // Calculate quantity: prefer lastSoldQuantity, fallback to quantity or 1
            calcQuantity: {
              $cond: [
                { $gt: [{ $ifNull: ['$lastSoldQuantity', 0] }, 0] },
                { $ifNull: ['$lastSoldQuantity', 0] },
                { $ifNull: ['$quantity', 1] }
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            // Calculate revenue from sold items - use lastSoldTotal if available, otherwise calculate
            saleRevenue: {
              $sum: {
                $cond: [
                  { $gt: [{ $ifNull: ['$lastSoldTotal', 0] }, 0] },
                  { $ifNull: ['$lastSoldTotal', 0] },
                  { $multiply: ['$calcUnitPrice', '$calcQuantity'] }
                ]
              }
            }
          }
        }
      ]),
      // Invoice aggregation for chart data (using invoice totalAmount which includes taxes)
      Invoice.aggregate([
        {
          $group: {
            _id: null,
            invoices: {
              $push: {
                date: '$date',
                totalAmount: { $ifNull: ['$totalAmount', 0] }
              }
            }
          }
        }
      ]),
      // Total income aggregation
      Accounting.aggregate([
        { $match: { category: 'Income' } },
        { $group: { _id: null, totalIncome: { $sum: { $ifNull: ['$credit', 0] } } } }
      ])
    ]);
    
    const totalExpenses = expensesAgg[0]?.totalExpenses || 0;
    const inventoryStats = inventoryAgg[0] || {
      totalStockCount: 0,
      probs: 0,
      machine: 0,
      parts: 0,
      soldItems: 0
    };
    // Revenue is now calculated from sold inventory items (matching Reports page)
    const saleRevenue = revenueAgg[0]?.saleRevenue || 0;
    // Get invoices for chart data
    const invoices = invoicesAgg[0]?.invoices || [];
    const totalIncome = incomeAgg[0]?.totalIncome || 0;
    
    const dashboardStats = {
      totalExpenses,
      totalStockCount: inventoryStats.totalStockCount,
      probs: inventoryStats.probs,
      machine: inventoryStats.machine,
      parts: inventoryStats.parts,
      saleRevenue,
      soldItems: inventoryStats.soldItems,
    };
    
    // Generate sale revenue chart data (last 12 months) - optimized
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const saleRevenueData = months.map((month, index) => {
      const revenue = invoices
        .filter(inv => {
          const invDate = new Date(inv.date);
          return invDate.getMonth() === index && invDate.getFullYear() === currentYear;
        })
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      return { month, revenue };
    });
    
    // Generate profit/loss chart data
    const profit = totalIncome - totalExpenses;
    const profitPercent = totalIncome > 0 ? ((profit / totalIncome) * 100).toFixed(2) : 0;
    const lossPercent = totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(2) : 0;
    const expensePercent = totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(2) : 0;
    
    const profitLossChartData = [
      { name: 'Profit', value: parseFloat(profitPercent), color: '#10b981' },
      { name: 'Loss', value: parseFloat(lossPercent), color: '#ef4444' },
      { name: 'Expenses', value: parseFloat(expensePercent), color: '#f59e0b' },
    ];
    
    res.json({
      dashboardStats,
      saleRevenueData,
      profitLossChartData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
