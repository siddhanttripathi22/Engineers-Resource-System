const express = require('express');
const { body } = require('express-validator');
const { checkRole, checkProjectAccess } = require('../middleware/roleCheck');
const projectController = require('../controllers/projectController');

const router = express.Router();

// Validation schemas
const projectValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Project name must be at least 2 characters'),
  body('description').optional().trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('status').optional().isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('startDate').optional().isISO8601().toDate(),
  body('endDate').optional().isISO8601().toDate(),
  body('budget').optional().isNumeric({ min: 0 }),
  body('clientId').optional().isMongoId(),
  body('managerId').optional().isMongoId(),
  body('teamMembers').optional().isArray(),
  body('teamMembers.*').optional().isMongoId(),
  body('technologies').optional().isArray(),
  body('requirements').optional().isArray()
];

const taskValidation = [
  body('title').trim().isLength({ min: 2 }).withMessage('Task title must be at least 2 characters'),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo', 'in-progress', 'review', 'completed']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('assignedTo').optional().isMongoId(),
  body('estimatedHours').optional().isNumeric({ min: 0 }),
  body('actualHours').optional().isNumeric({ min: 0 }),
  body('dueDate').optional().isISO8601().toDate(),
  body('dependencies').optional().isArray(),
  body('dependencies.*').optional().isMongoId()
];

// Routes
router.get('/', checkRole(['admin', 'manager', 'engineer']), projectController.getAllProjects);
router.get('/:id', checkProjectAccess, projectController.getProject);
router.post('/', checkRole(['admin', 'manager']), projectValidation, projectController.createProject);
router.put('/:id', checkRole(['admin', 'manager']), projectValidation, projectController.updateProject);
router.delete('/:id', checkRole(['admin']), projectController.deleteProject);

// Project team management
router.post('/:id/team', checkRole(['admin', 'manager']), projectController.addTeamMember);
router.delete('/:id/team/:memberId', checkRole(['admin', 'manager']), projectController.removeTeamMember);

// Project tasks
router.get('/:id/tasks', checkProjectAccess, projectController.getProjectTasks);
router.post('/:id/tasks', checkRole(['admin', 'manager']), taskValidation, projectController.createTask);
router.put('/:id/tasks/:taskId', checkRole(['admin', 'manager', 'engineer']), taskValidation, projectController.updateTask);
router.delete('/:id/tasks/:taskId', checkRole(['admin', 'manager']), projectController.deleteTask);

// Project analytics
router.get('/:id/analytics', checkRole(['admin', 'manager']), projectController.getProjectAnalytics);
router.get('/:id/progress', checkProjectAccess, projectController.getProjectProgress);
router.get('/:id/timeline', checkProjectAccess, projectController.getProjectTimeline);

module.exports = router;