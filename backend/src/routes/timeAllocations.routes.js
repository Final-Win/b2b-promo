const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const timeAllocationsController = require('../controllers/timeAllocations.controller');

const router = express.Router();

router.get('/time-allocations/daily-sum', authMiddleware, timeAllocationsController.dailySum);

module.exports = router;
