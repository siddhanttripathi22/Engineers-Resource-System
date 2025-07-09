const Assignment = require('../models/Assignment');
const Engineer = require('../models/Engineer');
const Project = require('../models/Project');

const getAllAssignments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, engineer, project } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (engineer) query.engineer = engineer;
    if (project) query.project = project;

    const assignments = await Assignment.find(query)
      .populate('engineer', 'employeeId userId')
      .populate({
        path: 'engineer',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .populate('project', 'name status priority client')
      .populate('assignedBy', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Assignment.countDocuments(query);

    res.json({
      assignments,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Server error fetching assignments' });
  }
};

const getAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('engineer', 'employeeId userId skills')
      .populate({
        path: 'engineer',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .populate('project', 'name status priority client description')
      .populate('assignedBy', 'name email');

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ assignment });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ error: 'Server error fetching assignment' });
  }
};

const createAssignment = async (req, res) => {
  try {
    const {
      engineer, project, role, allocation, startDate, endDate, tasks, notes
    } = req.body;

    // Check if engineer exists
    const engineerDoc = await Engineer.findById(engineer);
    if (!engineerDoc) {
      return res.status(404).json({ error: 'Engineer not found' });
    }

    // Check if project exists
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check capacity
    const existingAssignments = await Assignment.find({
      engineer,
      status: { $in: ['assigned', 'active'] }
    });

    const currentAllocation = existingAssignments.reduce((sum, a) => sum + a.allocation, 0);
    
    if (currentAllocation + allocation > engineerDoc.availability.capacity) {
      return res.status(400).json({
        error: 'Engineer capacity exceeded',
        currentAllocation,
        requestedAllocation: allocation,
        availableCapacity: engineerDoc.availability.capacity - currentAllocation
      });
    }

    // Create assignment
    const assignment = new Assignment({
      engineer,
      project,
      role,
      allocation,
      startDate,
      endDate,
      tasks: tasks || [],
      notes,
      assignedBy: req.user._id
    });

    await assignment.save();

    // Update engineer's current workload
    engineerDoc.availability.currentWorkload = currentAllocation + allocation;
    await engineerDoc.save();

    // Add engineer to project team if not already there
    if (!projectDoc.team.includes(engineer)) {
      projectDoc.team.push(engineer);
      await projectDoc.save();
    }

    const populatedAssignment = await Assignment.findById(assignment._id)
      .populate('engineer', 'employeeId userId')
      .populate({
        path: 'engineer',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .populate('project', 'name status priority client')
      .populate('assignedBy', 'name email');

    res.status(201).json({
      message: 'Assignment created successfully',
      assignment: populatedAssignment
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Server error creating assignment' });
  }
};

const updateAssignment = async (req, res) => {
  try {
    const {
      role, allocation, startDate, endDate, status, tasks, performance, notes
    } = req.body;

    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // If allocation is changing, check capacity
    if (allocation && allocation !== assignment.allocation) {
      const engineer = await Engineer.findById(assignment.engineer);
      const otherAssignments = await Assignment.find({
        engineer: assignment.engineer,
        _id: { $ne: assignment._id },
        status: { $in: ['assigned', 'active'] }
      });

      const otherAllocation = otherAssignments.reduce((sum, a) => sum + a.allocation, 0);
      
      if (otherAllocation + allocation > engineer.availability.capacity) {
        return res.status(400).json({
          error: 'Engineer capacity exceeded',
          currentAllocation: otherAllocation,
          requestedAllocation: allocation,
          availableCapacity: engineer.availability.capacity - otherAllocation
        });
      }

      // Update engineer's current workload
      engineer.availability.currentWorkload = otherAllocation + allocation;
      await engineer.save();
    }

    const updatedAssignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      {
        role,
        allocation,
        startDate,
        endDate,
        status,
        tasks,
        performance,
        notes
      },
      { new: true }
    ).populate('engineer', 'employeeId userId')
     .populate({
       path: 'engineer',
       populate: {
         path: 'userId',
         select: 'name email'
       }
     })
     .populate('project', 'name status priority client')
     .populate('assignedBy', 'name email');

    res.json({
      message: 'Assignment updated successfully',
      assignment: updatedAssignment
    });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ error: 'Server error updating assignment' });
  }
};

const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Update engineer's workload
    const engineer = await Engineer.findById(assignment.engineer);
    if (engineer) {
      engineer.availability.currentWorkload -= assignment.allocation;
      await engineer.save();
    }

    await Assignment.findByIdAndDelete(req.params.id);

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Server error deleting assignment' });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const { taskId, status, completedAt } = req.body;
    
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const task = assignment.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    task.status = status;
    if (status === 'completed' && completedAt) {
      task.completedAt = completedAt;
    }

    // Update assignment performance
    const completedTasks = assignment.tasks.filter(t => t.status === 'completed').length;
    assignment.performance.tasksCompleted = completedTasks;
    assignment.performance.efficiency = (completedTasks / assignment.tasks.length) * 100;

    await assignment.save();

    res.json({
      message: 'Task status updated successfully',
      assignment
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: 'Server error updating task status' });
  }
};

module.exports = {
  getAllAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  updateTaskStatus
};