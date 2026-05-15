const webpush = require('web-push');
const prisma = require('../db');

// Initialize with VAPID keys
// In production, these should be in .env
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BOft6sVhMwJJi6Rc53G4Sr1QawL_ys_F3br2NtIJTSukYtmUrgUnECi8JepVUS4km4IGWwLYXS9qoku17iu6WJ8';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'B17kJfvtuPooppzfOQxuuQ829bQzI0yVGDsrPzjFcs8';

webpush.setVapidDetails(
  'mailto:support@your-school-app.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

/**
 * Send a push notification to a specific user
 */
const sendNotification = async (userId, schoolId, { title, body, icon, url }) => {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: parseInt(userId), schoolId: parseInt(schoolId) }
    });

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/logo192.png',
      url: url || '/'
    });

    const results = await Promise.allSettled(
      subscriptions.map(sub => {
        const pushConfig = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth,
            p256dh: sub.p256dh
          }
        };
        return webpush.sendNotification(pushConfig, payload);
      })
    );

    // Clean up expired subscriptions
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected' && (results[i].reason.statusCode === 410 || results[i].reason.statusCode === 404)) {
        await prisma.pushSubscription.delete({
          where: { id: subscriptions[i].id }
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Push notification error:', error);
    return null;
  }
};

/**
 * Send notification to all users of a specific role in a school
 */
const sendToRole = async (schoolId, role, notification) => {
    const users = await prisma.user.findMany({
        where: { schoolId: parseInt(schoolId), role },
        select: { id: true }
    });
    
    return Promise.all(users.map(u => sendNotification(u.id, schoolId, notification)));
};

module.exports = {
  sendNotification,
  sendToRole,
  VAPID_PUBLIC_KEY
};
