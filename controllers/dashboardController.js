const Invoice = require('../models/Invoice');
const Accounting = require('../models/Accounting');
const Inventory = require('../models/Inventory');
const Customer = require('../models/Customer');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Calculate total expenses
    const expenses = await Accounting.find({ category: 'Expense' });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.debit, 0);
    
    // Calculate inventory stats
    const inventoryItems = await Inventory.find();
    const totalStockCount = inventoryItems.length;
    const probs = inventoryItems.filter(i => i.category === 'probs').length;
    const machine = inventoryItems.filter(i => i.category === 'machines').length;
    const parts = inventoryItems.filter(i => i.category === 'parts').length;
    
    // Calculate sales revenue
    const invoices = await Invoice.find();
    const saleRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const soldItems = inventoryItems.filter(i => i.machineCategory === 'sold' || i.status === 'Sold').length;
    
    const dashboardStats = {
      totalExpenses,
      totalStockCount,
      probs,
      machine,
      parts,
      saleRevenue,
      soldItems,
    };
    
    // Generate sale revenue chart data (last 12 months)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const saleRevenueData = months.map((month, index) => {
      const monthInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate.getMonth() === index;
      });
      const revenue = monthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      return { month, revenue };
    });
    
    // Generate profit/loss chart data
    const totalIncome = expenses.filter(e => e.category === 'Income').reduce((sum, e) => sum + e.credit, 0);
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
