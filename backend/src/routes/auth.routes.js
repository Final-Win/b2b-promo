const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const authController = require('../controllers/auth.controller');
const usersDb = require('../db/users.db');

const router = express.Router();

router.post('/auth/signup', authController.signup);
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refresh);
router.post('/auth/logout', authMiddleware, authController.logout);
router.get('/auth/me', authMiddleware, authController.me);
router.delete('/auth/me', authMiddleware, authController.withdraw);

router.get('/users', authMiddleware, async (req, res, next) => {
  try {
    const users = await usersDb.listUsers();
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
