const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const wbsController = require('../controllers/wbs.controller');

const router = express.Router();

router.get('/wbs', authMiddleware, wbsController.list);
router.get('/wbs/:id', authMiddleware, wbsController.getOne);
router.post('/wbs', authMiddleware, wbsController.create);
router.put('/wbs/:id', authMiddleware, wbsController.update);
router.delete('/wbs/:id', authMiddleware, wbsController.remove);

module.exports = router;
