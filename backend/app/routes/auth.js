const express = require('express');
const { body } = require('express-validator');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/roleCheck');
const authController = require('../controllers/authController');

const router = express.Router();

// Validation schemas
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 }),
  body('role').optional().isIn(['admin', 'manager', 'engineer'])
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, authController.updateProfile);

module.exports = router;
