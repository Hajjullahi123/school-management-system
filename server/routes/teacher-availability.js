const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

// Get all availabilities for a school
router.get('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const availabilities = await prisma.teacherAvailability.findMany({
      where: { schoolId: req.schoolId },
      include: { teacher: { include: { user: true } } }
    });
    res.json(availabilities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get availabilities for a specific teacher
router.get('/teacher/:teacherId', authenticate, async (req, res) => {
  try {
    const teacherId = parseInt(req.params.teacherId);
    const availabilities = await prisma.teacherAvailability.findMany({
      where: { schoolId: req.schoolId, teacherId }
    });
    res.json(availabilities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create/Update availability
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { teacherId, dayOfWeek, startTime, endTime, isAvailable } = req.body;

    // Simple logic: delete existing similar blocks if any, then create new
    // Or just create many. For simplicity, let's create.
    const availability = await prisma.teacherAvailability.create({
      data: {
        schoolId: req.schoolId,
        teacherId: parseInt(teacherId),
        dayOfWeek,
        startTime,
        endTime,
        isAvailable: isAvailable !== undefined ? isAvailable : false
      }
    });
    res.json(availability);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete availability
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    await prisma.teacherAvailability.delete({
      where: { id: parseInt(req.params.id), schoolId: req.schoolId }
    });
    res.json({ message: 'Availability record removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
