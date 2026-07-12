require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const parent = await prisma.parent.findFirst({
      where: { User: { firstName: 'Bashir' } },
      include: { User: true }
    });
    console.log("Parent to delete:", parent ? parent.id : "Not Found");
    if (!parent) return;

    // Try simulating the delete transaction
    await prisma.$transaction(async (tx) => {
      const parentId = parent.id;
      const userId = parent.userId;

      await tx.student.updateMany({ where: { parentId: parentId }, data: { parentId: null } });
      await tx.whatsAppLog.updateMany({ where: { parentId: parentId }, data: { parentId: null } });

      if (parent.User && parent.User.role === 'parent') {
        await tx.nudge.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } });
        await tx.notice.deleteMany({ where: { authorId: userId } });
        await tx.auditLog.updateMany({ where: { userId: userId }, data: { userId: null } });
        await tx.parentTeacherMessage.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } });
      }

      await tx.parent.delete({ where: { id: parentId } });
      
      if (parent.User && parent.User.role === 'parent') {
        await tx.user.delete({ where: { id: parent.userId } });
      }
      
      throw new Error("ROLLBACK_TEST");
    });
  } catch (e) {
    if (e.message !== "ROLLBACK_TEST") {
      console.error("PRISMA ERROR:", e);
    } else {
      console.log("Transaction would succeed.");
    }
  } finally {
    await prisma.$disconnect();
  }
}
check();
