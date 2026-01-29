const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get Interventions for a Student
router.get('/student/:studentId', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    const interventions = await prisma.intervention.findMany({
      where: {
        studentId,
        schoolId: req.schoolId
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        term: {
          select: { name: true }
        },
        academicSession: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(interventions);
  } catch (error) {
    console.error('Error fetching interventions:', error);
    res.status(500).json({ error: 'Failed to fetch interventions' });
  }
});

// Create Intervention
router.post('/', async (req, res) => {
  try {
    const { studentId, termId, academicSessionId, type, description, status } = req.body;

    if (!studentId || !termId || !academicSessionId || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const intervention = await prisma.intervention.create({
      data: {
        schoolId: req.schoolId,
        studentId: parseInt(studentId),
        termId: parseInt(termId),
        academicSessionId: parseInt(academicSessionId),
        teacherId: req.user.id,
        type,
        description,
        status: status || 'active'
      }
    });

    res.status(201).json(intervention);
  } catch (error) {
    console.error('Error creating intervention:', error);
    res.status(500).json({ error: 'Failed to create intervention' });
  }
});

// Update Intervention
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, outcome, endDate, notes } = req.body;

    // Verify ownership or admin rights (simplified: allow if same school)
    const existing = await prisma.intervention.findFirst({
      where: { id, schoolId: req.schoolId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Intervention not found' });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (outcome) updateData.outcome = outcome;
    if (endDate) updateData.endDate = new Date(endDate);
    if (notes) updateData.description = notes; // Append or replace? Replaced for simplicity

    const updated = await prisma.intervention.update({
      where: { id },
      data: updateData
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating intervention:', error);
    res.status(500).json({ error: 'Failed to update intervention' });
  }
});

// Delete Intervention
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Check exists
    const existing = await prisma.intervention.findFirst({
      where: { id, schoolId: req.schoolId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Intervention not found' });
    }

    await prisma.intervention.delete({
      where: { id }
    });

    res.json({ message: 'Intervention deleted' });
  } catch (error) {
    console.error('Error deleting intervention:', error);
    res.status(500).json({ error: 'Failed to delete intervention' });
  }
});

module.exports = router;
