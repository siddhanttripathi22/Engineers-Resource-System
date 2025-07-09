const express = require('express');
const { body } = require('express-validator');
const { checkRole, checkEngineerAccess } = require('../middleware/roleCheck');
const engineerController = require('../controllers/engineerController');

const router = express.Router();

// Validation schemas
const engineerValidation = [
  body('email').optional().isEmail().normalizeEmail(),
  body('password').optional().isLength({ min: 6 }),
  body('name').optional().trim().isLength({ min: 2 }),
  body('department').optional().isIn(['frontend', 'backend', 'fullstack', 'mobile', 'devops', 'qa', 'ui/ux']),
  body('skills').optional().isArray(),
  body('experience.total').optional().isNumeric({ min: 0 }),
  body('experience.current').optional().isNumeric({ min: 0 }),
  body('salary').optional().isNumeric({ min: 0 })
];

// Routes
router.get('/', checkRole(['admin', 'manager']), engineerController.getAllEngineers);
router.get('/:id', checkEngineerAccess, engineerController.getEngineer);
router.post('/', checkRole(['admin', 'manager']), engineerValidation, engineerController.createEngineer);
router.put('/:id', checkRole(['admin', 'manager']), engineerValidation, engineerController.updateEngineer);
router.delete('/:id', checkRole(['admin', 'manager']), engineerController.deleteEngineer);
router.get('/:id/capacity', checkEngineerAccess, engineerController.getEngineerCapacity);

module.exports = router;