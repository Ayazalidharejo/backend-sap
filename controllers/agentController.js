const Agent = require('../models/Agent');
const jwt = require('jsonwebtoken');

// Get all agents
exports.getAllAgents = async (req, res) => {
  try {
    const agents = await Agent.find().select('-password').sort({ createdAt: -1 });
    
    // Format agents with id field
    const formattedAgents = agents.map(agent => ({
      ...agent.toObject(),
      id: agent._id.toString()
    }));
    
    if (req.query.includeStats === 'true') {
      const stats = {
        totalAgents: agents.length,
        activeAgents: agents.filter(a => a.status === 'Active').length,
        totalSales: agents.reduce((sum, a) => sum + (a.sales || 0), 0),
        averageSales: agents.length > 0 
          ? agents.reduce((sum, a) => sum + (a.sales || 0), 0) / agents.length 
          : 0,
      };
      
      return res.json({
        agents: formattedAgents,
        agentStats: stats,
      });
    }
    
    res.json(formattedAgents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single agent
exports.getAgentById = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id).select('-password');
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Format response with id field
    res.json({
      ...agent.toObject(),
      id: agent._id.toString()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create agent
exports.createAgent = async (req, res) => {
  try {
    const agent = new Agent(req.body);
    await agent.save();
    
    // Don't send password in response
    const agentResponse = agent.toObject();
    delete agentResponse.password;
    
    res.status(201).json({
      ...agentResponse,
      id: agent._id.toString()
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(400).json({ message: error.message });
  }
};

// Update agent
exports.updateAgent = async (req, res) => {
  try {
    // If password is being updated, it will be hashed by pre-save middleware
    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Format response with id field
    res.json({
      ...agent.toObject(),
      id: agent._id.toString()
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete agent
exports.deleteAgent = async (req, res) => {
  try {
    const agent = await Agent.findByIdAndDelete(req.params.id);
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Agent login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const agent = await Agent.findOne({ email });
    
    if (!agent) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const isMatch = await agent.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: agent._id, email: agent.email },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );
    
    const agentResponse = agent.toObject();
    delete agentResponse.password;
    
    res.json({
      token,
      agent: agentResponse,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get agent statistics
exports.getAgentStats = async (req, res) => {
  try {
    const agents = await Agent.find();
    
    const stats = {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'Active').length,
      totalSales: agents.reduce((sum, a) => sum + a.sales, 0),
      averageSales: agents.length > 0 
        ? agents.reduce((sum, a) => sum + a.sales, 0) / agents.length 
        : 0,
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
