const Engineer = require('../models/Engineer');
const User = require('../models/User');
const Assignment = require('../models/Assignment');

const getAllEngineers = async (req, res) => {
  try {
    const { page = 1, limit = 10, department, status, search } = req.query;
    
    const query = {};
    
    if (department) query.department = department;
    if (status) query['availability.status'] = status;
    
    let engineers = await Engineer.find(query)
      .populate('userId', 'name email avatar')
      .populate('manager', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    // Apply search filter if provided
    if (search) {
      engineers = engineers.filter(engineer => 
        engineer.userId.name.toLowerCase().includes(search.toLowerCase()) ||
        engineer.userId.email.toLowerCase().includes(search.toLowerCase()) ||
        engineer.employeeId.toLowerCase().includes(search.toLowerCase())
      );
    }

    const total = await Engineer.countDocuments(query);

    res.json({
      engineers,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get engineers error:', error);
    res.status(500).json({ error: 'Server error fetching engineers' });
  }
};

const getEngineer = async (req, res) => {
  try {
    const engineer = await Engineer.findById(req.params.id)
      .populate('userId', 'name email avatar')
      .populate('manager', 'name email');

    if (!engineer) {
      return res.status(404).json({ error: 'Engineer not found' });
    }

    // Get current assignments
    const assignments = await Assignment.find({ 
      engineer: engineer._id,
      status: { $in: ['assigned', 'active'] }
    }).populate('project', 'name status priority');

    res.json({
      engineer,
      assignments
    });
  } catch (error) {
    console.error('Get engineer error:', error);
    res.status(500).json({ error: 'Server error fetching engineer' });
  }
};

const createEngineer = async (req, res) => {
  try {
    const {
      email, password, name, department, skills, experience, salary, manager
    } = req.body;

    // Create user account
    const user = new User({
      email,
      password,
      name,
      role: 'engineer'
    });
    await user.save();

    // Create engineer profile
    const engineer = new Engineer({
      userId: user._id,
      employeeId: `ENG${Date.now()}`,
      department,
      skills: skills || [],
      experience: experience || { total: 0, current: 0 },
      salary,
      manager,
      joiningDate: new Date()
    });

    await engineer.save();
    
    const populatedEngineer = await Engineer.findById(engineer._id)
      .populate('userId', 'name email avatar')
      .populate('manager', 'name email');

    res.status(201).json({
      message: 'Engineer created successfully',
      engineer: populatedEngineer
    });
  } catch (error) {
    console.error('Create engineer error:', error);
    res.status(500).json({ error: 'Server error creating engineer' });
  }
};

const updateEngineer = async (req, res) => {
  try {
    const { skills, experience, availability, performance, salary, manager } = req.body;
    
    const engineer = await Engineer.findByIdAndUpdate(
      req.params.id,
      {
        skills,
        experience,
        availability,
        performance,
        salary,
        manager
      },
      { new: true }
    ).populate('userId', 'name email avatar')
     .populate('manager', 'name email');

    if (!engineer) {
      return res.status(404).json({ error: 'Engineer not found' });
    }

    res.json({
      message: 'Engineer updated successfully',
      engineer
    });
  } catch (error) {
    console.error('Update engineer error:', error);
    res.status(500).json({ error: 'Server error updating engineer' });
  }
};

const deleteEngineer = async (req, res) => {
  try {
    const engineer = await Engineer.findById(req.params.id);
    
    if (!engineer) {
      return res.status(404).json({ error: 'Engineer not found' });
    }

    // Check for active assignments
    const activeAssignments = await Assignment.countDocuments({
      engineer: engineer._id,
      status: { $in: ['assigned', 'active'] }
    });

    if (activeAssignments > 0) {
      return res.status(400).json({
        error: 'Cannot delete engineer with active assignments',
        activeAssignments
      });
    }

    // Soft delete - deactivate user instead of deleting
    await User.findByIdAndUpdate(engineer.userId, { isActive: false });

    res.json({ message: 'Engineer deactivated successfully' });
  } catch (error) {
    console.error('Delete engineer error:', error);
    res.status(500).json({ error: 'Server error deleting engineer' });
  }
};

const getEngineerCapacity = async (req, res) => {
  try {
    const engineerId = req.params.id;
    
    // Get engineer
    const engineer = await Engineer.findById(engineerId)
      .populate('userId', 'name email');

    if (!engineer) {
      return res.status(404).json({ error: 'Engineer not found' });
    }

    // Get current assignments
    const assignments = await Assignment.find({
      engineer: engineerId,
      status: { $in: ['assigned', 'active'] }
    }).populate('project', 'name status priority startDate endDate');

    // Calculate capacity
    const totalAllocation = assignments.reduce((sum, assignment) => 
      sum + assignment.allocation, 0
    );

    const capacity = {
      engineer: engineer,
      totalCapacity: engineer.availability.capacity,
      currentAllocation: totalAllocation,
      availableCapacity: engineer.availability.capacity - totalAllocation,
      assignments: assignments,
      utilizationRate: (totalAllocation / engineer.availability.capacity) * 100
    };

    res.json(capacity);
  } catch (error) {
    console.error('Get capacity error:', error);
    res.status(500).json({ error: 'Server error fetching capacity' });
  }
};

module.exports = {
  getAllEngineers,
  getEngineer,
  createEngineer,
  updateEngineer,
  deleteEngineer,
  getEngineerCapacity
};
