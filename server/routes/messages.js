const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

// 1. Send a new message
router.post('/', authenticate, authorize(['parent', 'teacher']), async (req, res) => {
  try {
    const { receiverId, studentId, subject, message, messageType, parentMessageId } = req.body;

    // Validate required fields
    if (!receiverId || !studentId || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Authorization checks
    if (req.user.role === 'parent') {
      // Verify parent owns the student
      const parent = await prisma.parent.findFirst({
        where: {
          userId: req.user.id,
          schoolId: req.schoolId
        },
        include: { students: { where: { schoolId: req.schoolId } } }
      });

      if (!parent || !parent.students.some(s => s.id === parseInt(studentId))) {
        return res.status(403).json({ error: 'You can only send messages about your own children' });
      }

      // Verify receiver is the form master of the student's class
      const student = await prisma.student.findFirst({
        where: {
          id: parseInt(studentId),
          schoolId: req.schoolId
        },
        include: { classModel: true }
      });

      if (!student || !student.classModel) {
        return res.status(400).json({ error: 'Student does not have a class assigned' });
      }

      if (student.classModel.formMasterId !== parseInt(receiverId)) {
        return res.status(403).json({ error: 'You can only message the form master of your child\'s class' });
      }
    } else if (req.user.role === 'teacher') {
      // Verify teacher is form master of student's class
      const student = await prisma.student.findFirst({
        where: {
          id: parseInt(studentId),
          schoolId: req.schoolId
        },
        include: { classModel: true }
      });

      if (!student || !student.classModel || student.classModel.formMasterId !== req.user.id) {
        return res.status(403).json({ error: 'You can only message parents of students in your form class' });
      }

      // Verify receiver is the parent of this student
      const studentWithParent = await prisma.student.findFirst({
        where: {
          id: parseInt(studentId),
          schoolId: req.schoolId
        },
        include: { parent: true }
      });

      if (!studentWithParent.parent || studentWithParent.parent.userId !== parseInt(receiverId)) {
        return res.status(403).json({ error: 'Invalid recipient' });
      }
    }

    // Create the message
    const newMessage = await prisma.parentTeacherMessage.create({
      data: {
        schoolId: req.schoolId,
        senderId: req.user.id,
        receiverId: parseInt(receiverId),
        senderRole: req.user.role,
        studentId: parseInt(studentId),
        subject,
        message,
        messageType: messageType || 'general',
        parentMessageId: parentMessageId ? parseInt(parentMessageId) : null
      }
    });

    res.status(201).json(newMessage);

    // Log message sending
    logAction({
      schoolId: req.schoolId,
      userId: req.user.id,
      action: 'SEND_MESSAGE',
      resource: 'PARENT_TEACHER_MESSAGE',
      details: {
        messageId: newMessage.id,
        receiverId: parseInt(receiverId),
        studentId: parseInt(studentId),
        subject
      },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// 2. Get all messages for current user
router.get('/', authenticate, authorize(['parent', 'teacher']), async (req, res) => {
  try {
    const { studentId } = req.query;

    const where = {
      OR: [
        { senderId: req.user.id },
        { receiverId: req.user.id }
      ]
    };

    // Filter by student if provided
    if (studentId) {
      where.studentId = parseInt(studentId);
    }

    const messages = await prisma.parentTeacherMessage.findMany({
      where: {
        ...where,
        schoolId: req.schoolId
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get user details and student info for each message
    const messagesWithDetails = await Promise.all(
      messages.map(async (msg) => {
        const sender = await prisma.user.findFirst({
          where: {
            id: msg.senderId,
            schoolId: req.schoolId
          },
          select: { firstName: true, lastName: true, role: true }
        });

        const receiver = await prisma.user.findFirst({
          where: {
            id: msg.receiverId,
            schoolId: req.schoolId
          },
          select: { firstName: true, lastName: true, role: true }
        });

        const student = await prisma.student.findFirst({
          where: {
            id: msg.studentId,
            schoolId: req.schoolId
          },
          include: {
            user: { select: { firstName: true, lastName: true } },
            classModel: { select: { name: true, arm: true } }
          }
        });

        return {
          ...msg,
          sender,
          receiver,
          student
        };
      })
    );

    res.json(messagesWithDetails);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// 3. Get message thread (message and all its replies)
router.get('/thread/:id', authenticate, authorize(['parent', 'teacher']), async (req, res) => {
  try {
    const { id } = req.params;

    // Get the main message
    const mainMessage = await prisma.parentTeacherMessage.findFirst({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      }
    });

    if (!mainMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Verify user is sender or receiver
    if (mainMessage.senderId !== req.user.id && mainMessage.receiverId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get all replies
    const replies = await prisma.parentTeacherMessage.findMany({
      where: {
        parentMessageId: parseInt(id),
        schoolId: req.schoolId
      },
      orderBy: { createdAt: 'asc' }
    });

    // Get user details for all messages
    const thread = [mainMessage, ...replies];
    const threadWithDetails = await Promise.all(
      thread.map(async (msg) => {
        const sender = await prisma.user.findFirst({
          where: {
            id: msg.senderId,
            schoolId: req.schoolId
          },
          select: { firstName: true, lastName: true, role: true }
        });

        return { ...msg, sender };
      })
    );

    res.json(threadWithDetails);
  } catch (error) {
    console.error('Get thread error:', error);
    res.status(500).json({ error: 'Failed to fetch message thread' });
  }
});

// 4. Mark message as read
router.put('/:id/read', authenticate, authorize(['parent', 'teacher']), async (req, res) => {
  try {
    const { id } = req.params;

    const message = await prisma.parentTeacherMessage.findFirst({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only receiver can mark as read
    if (message.receiverId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await prisma.parentTeacherMessage.update({
      where: {
        id: parseInt(id),
        schoolId: req.schoolId
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// 5. Get unread message count
router.get('/unread-count', authenticate, authorize(['parent', 'teacher']), async (req, res) => {
  try {
    const count = await prisma.parentTeacherMessage.count({
      where: {
        receiverId: req.user.id,
        isRead: false,
        schoolId: req.schoolId
      }
    });

    res.json({ count });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// 6. Get form master for a student (helper endpoint)
router.get('/form-master/:studentId', authenticate, authorize(['parent']), async (req, res) => {
  try {
    const { studentId } = req.params;

    // Verify parent owns student
    const parent = await prisma.parent.findFirst({
      where: {
        userId: req.user.id,
        schoolId: req.schoolId
      },
      include: { students: { where: { schoolId: req.schoolId } } }
    });

    if (!parent || !parent.students.some(s => s.id === parseInt(studentId))) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const student = await prisma.student.findFirst({
      where: {
        id: parseInt(studentId),
        schoolId: req.schoolId
      },
      include: {
        classModel: {
          include: {
            formMaster: {
              select: {
                id: true,
                userId: true,
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    schoolId: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!student || !student.classModel || !student.classModel.formMaster) {
      return res.status(404).json({ error: 'Form master not found for this student' });
    }

    res.json({
      formMaster: student.classModel.formMaster,
      class: {
        name: student.classModel.name,
        arm: student.classModel.arm
      }
    });
  } catch (error) {
    console.error('Get form master error:', error);
    res.status(500).json({ error: 'Failed to get form master' });
  }
});

module.exports = router;
