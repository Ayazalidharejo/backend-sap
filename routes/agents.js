const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');

// Agent login
router.post('/login', agentController.login);

// All agents
router.get('/', agentController.getAllAgents);

// Agent stats
router.get('/stats', agentController.getAgentStats);

// Single agent
router.get('/:id', agentController.getAgentById);

// Create agent
router.post('/', agentController.createAgent);

// Update agent
router.put('/:id', agentController.updateAgent);

// Delete agent
router.delete('/:id', agentController.deleteAgent);

module.exports = router;
