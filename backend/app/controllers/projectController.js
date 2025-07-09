const Project = require('../models/Project');
const Assignment = require('../models/Assignment');
const Engineer = require('../models/Engineer');

const getAllProjects = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, search } = req.query;
    
    const query = {};
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    
    let projects = await Project.find(query)
      .populate('manager', 'name email')
      .populate('team', 'employeeId userId')
      .populate({
        path: 'team',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Apply search filter if provided
    if (search) {
      projects = projects.filter(project => 
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        project.client.toLowerCase().includes(search.toLowerCase())
      );
    }

    const total = await Project.countDocuments(query);

    res.json({
      projects,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Server error fetching projects' });
  }
};

const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('manager', 'name email')
      .populate('team', 'employeeId userId')
      .populate({
        path: 'team',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get assignments for this project
    const assignments = await Assignment.find({ project: project._id })
      .populate('engineer', 'employeeId userId')
      .populate({
        path: 'engineer',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      });

    res.json({
      project,
      assignments
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Server error fetching project' });
  }
};

const createProject = async (req, res) => {
  try {
    const {
      name, description, client, startDate, endDate, priority,
      budget, requiredSkills, timeline
    } = req.body;

    const project = new Project({
      name,
      description,
      client,
      startDate,
      endDate,
      priority: priority || 'medium',
      budget,
      requiredSkills: requiredSkills || [],
      timeline: timeline || { phases: [] },
      manager: req.user._id
    });

    await project.save();
    
    const populatedProject = await Project.findById(project._id)
      .populate('manager', 'name email');

    res.status(201).json({
      message: 'Project created successfully',
      project: populatedProject
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Server error creating project' });
  }
};

const updateProject = async (req, res) => {
  try {
    const {
      name, description, client, startDate, endDate, status, priority,
      budget, requiredSkills, timeline, progress
    } = req.body;

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        client,
        startDate,
        endDate,
        status,
        priority,
        budget,
        requiredSkills,
        timeline,
        progress
      },
      { new: true }
    ).populate('manager', 'name email');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      message: 'Project updated successfully',
      project
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Server error updating project' });
  }
};

const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check for active assignments
    const activeAssignments = await Assignment.countDocuments({
      project: project._id,
      status: { $in: ['assigned', 'active'] }
    });

    if (activeAssignments > 0) {
      return res.status(400).json({
        error: 'Cannot delete project with active assignments',
        activeAssignments
      });
    }

    await Project.findByIdAndDelete(req.params.id);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Server error deleting project' });
  }
};

const getProjectStats = async (req, res) => {
  try {
    const projectId = req.params.id;
    
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get assignments
    const assignments = await Assignment.find({ project: projectId })
      .populate('engineer', 'employeeId userId performance')
      .populate({
        path: 'engineer',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      });

    // Calculate stats
    const totalAssignments = assignments.length;
    const activeAssignments = assignments.filter(a => a.status === 'active').length;
    const completedAssignments = assignments.filter(a => a.status === 'completed').length;
    
    const totalHours = assignments.reduce((sum, a) => sum + a.performance.hoursWorked, 0);
    const totalTasks = assignments.reduce((sum, a) => sum + a.tasks.length, 0);
    const completedTasks = assignments.reduce((sum, a) => 
      sum + a.tasks.filter(t => t.status === 'completed').length, 0
    );

    const stats = {
      project,
      assignments: {
        total: totalAssignments,
        active: activeAssignments,
        completed: completedAssignments,
        completionRate: totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0
      },
      tasks: {
        total: totalTasks,
        completed: completedTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
      },
      time: {
        totalHours,
        averageHoursPerAssignment: totalAssignments > 0 ? totalHours / totalAssignments : 0
      },
      budget: {
        allocated: project.budget?.allocated || 0,
        spent: project.budget?.spent || 0,
        remaining: (project.budget?.allocated || 0) - (project.budget?.spent || 0)
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({ error: 'Server error fetching project stats' });
  }
};

module.exports = {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectStats
};