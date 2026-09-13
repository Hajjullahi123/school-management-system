const prisma = require('../db');

/**
 * Log an action to the AuditLog table
 * @param {Object} params - Logging parameters
 * @param {number} params.schoolId - The ID of the school
 * @param {number} [params.userId] - The ID of the user performing the action
 * @param {string} params.action - The action performed (e.g., 'CREATE', 'UPDATE', 'DELETE')
 * @param {string} params.resource - The resource acted upon (e.g., 'FEE_RECORD', 'RESULT')
 * @param {Object|string} [params.details] - Additional JSON-serializable details
 * @param {string} [params.ipAddress] - The IP address of the requester
 */
async function logAction({ schoolId, userId, action, resource, details, ipAddress }) {
  try {
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId,
        action,
        resource,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
        ipAddress
      }
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
}

module.exports = {
  logAction
};
