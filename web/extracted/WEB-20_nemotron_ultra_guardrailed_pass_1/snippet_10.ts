// Server-side usage (API routes, server actions, etc.)
import { NotificationService } from '@/lib/email/notification-service';
import { getUserProfile } from '@/lib/db/user';

const emailSender = createEmailSender(); // Your provider
const notifications = new NotificationService(emailSender);

// Send welcome email
const user = await getUserProfile(userId);
await notifications.sendTemplatedEmail('welcome', user);

// Send password reset
await notifications.sendTemplatedEmail('passwordReset', user, {
  resetUrl: `https://app.com/reset?token=${generateSecureToken()}`,
});

// Send custom notification
await notifications.sendTemplatedEmail('notification', user, {
  notificationTitle: 'New feature available',
  notificationMessage: 'Check out our new dashboard!',
});