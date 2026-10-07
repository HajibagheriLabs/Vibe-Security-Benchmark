// app/api/notifications/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NotificationService, SendEmailRequestSchema } from '@/lib/email/notification-service';
import { getUserProfile } from '@/lib/db/user';

// This route demonstrates the server-side proxy pattern:
// authenticate → authorize → validate schema → rate-limit → send email

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 2. Parse and validate request
    const body = await request.json();
    const parsed = SendEmailRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }
    
    const { templateName, userId, additionalVars } = parsed.data;
    
    // 3. Authorize - users can only send to themselves unless admin
    const isAdmin = session.user.role === 'admin';
    if (!isAdmin && userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 }); // 404 not 403
    }
    
    // 4. Get user profile from database (server-side, verified)
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    // 5. Send email via service (includes rate limiting)
    const emailSender = createEmailSender(); // Your email provider implementation
    const notificationService = new NotificationService(emailSender);
    
    const result = await notificationService.sendTemplatedEmail(templateName, userProfile, additionalVars || {});
    
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, messageId: result.messageId });
    
  } catch (error) {
    console.error('[notifications/send] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Example email sender implementation (replace with your provider)
function createEmailSender() {
  return {
    async send(to: string, subject: string, htmlBody: string, textBody: string) {
      // Implementation depends on your provider (SendGrid, Resend, Nodemailer, etc.)
      // Example with Resend:
      // const { data, error } = await resend.emails.send({
      //   from: 'App <noreply@yourapp.com>',
      //   to,
      //   subject,
      //   html: htmlBody,
      //   text: textBody,
      // });
      // return { success: !error, messageId: data?.id, error: error?.message };
      
      // Mock for demonstration
      console.log(`[Email] To: ${to}, Subject: ${subject}`);
      return { success: true, messageId: 'mock-' + Date.now() };
    },
  };
}