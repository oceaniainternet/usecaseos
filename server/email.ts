import ElasticEmail from '@elasticemail/elasticemail-client';

const defaultClient = ElasticEmail.ApiClient.instance;
const apikey = defaultClient.authentications['apikey'];
apikey.apiKey = process.env.ELASTIC_EMAIL_API_KEY || '';

const emailsApi = new ElasticEmail.EmailsApi();

const FROM_EMAIL = 'hello@solvity.ai';
const FROM_NAME = 'Solvity.ai';

interface SendEmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export async function sendEmail({ to, subject, htmlBody, textBody }: SendEmailOptions): Promise<boolean> {
  if (!process.env.ELASTIC_EMAIL_API_KEY) {
    console.warn('ELASTIC_EMAIL_API_KEY not set, skipping email send');
    return false;
  }

  try {
    const emailMessageData = ElasticEmail.EmailMessageData.constructFromObject({
      Recipients: [
        new ElasticEmail.EmailRecipient(to)
      ],
      Content: {
        Body: [
          ElasticEmail.BodyPart.constructFromObject({
            ContentType: "HTML",
            Content: htmlBody
          }),
          ...(textBody ? [ElasticEmail.BodyPart.constructFromObject({
            ContentType: "PlainText",
            Content: textBody
          })] : [])
        ],
        From: FROM_EMAIL,
        FromName: FROM_NAME,
        Subject: subject
      }
    });

    return new Promise((resolve, reject) => {
      emailsApi.emailsPost(emailMessageData, (error: any, data: any) => {
        if (error) {
          console.error('Error sending email:', error);
          reject(error);
        } else {
          console.log('Email sent successfully to:', to);
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export function generateInvitationEmail(clientName: string, inviteLink: string): { subject: string; htmlBody: string; textBody: string } {
  const subject = `You've been invited to join ${clientName} on Solvity.ai`;
  
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #10b981; margin: 0;">Solvity.ai</h1>
  </div>
  
  <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="margin-top: 0; color: #111827;">You're Invited!</h2>
    <p>You've been invited to join <strong>${clientName}</strong> on Solvity.ai to view and track use case story cards.</p>
    <p>Click the button below to create your account and get started:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteLink}" style="display: inline-block; background-color: #10b981; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600;">
        Accept Invitation
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280;">This invitation will expire in 7 days. If you didn't expect this email, you can safely ignore it.</p>
  </div>
  
  <div style="text-align: center; font-size: 12px; color: #9ca3af;">
    <p>&copy; ${new Date().getFullYear()} Solvity.ai. All rights reserved.</p>
  </div>
</body>
</html>
`;

  const textBody = `
You've been invited to join ${clientName} on Solvity.ai!

Click the link below to create your account and get started:
${inviteLink}

This invitation will expire in 7 days.

If you didn't expect this email, you can safely ignore it.

© ${new Date().getFullYear()} Solvity.ai. All rights reserved.
`;

  return { subject, htmlBody, textBody };
}

export function generateApprovalEmail(
  useCaseTitle: string,
  clientName: string,
  approvalStatus: string,
  approverName: string,
  approverEmail: string
): { subject: string; htmlBody: string; textBody: string } {
  const statusEmoji = approvalStatus === "Approved" ? "✅" : 
                      approvalStatus === "Needs Discussion" ? "💬" : "⏸️";
  const statusColor = approvalStatus === "Approved" ? "#10b981" : 
                      approvalStatus === "Needs Discussion" ? "#f59e0b" : "#6b7280";
  
  const subject = `${statusEmoji} Client Approval: "${useCaseTitle}" - ${approvalStatus}`;
  
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #10b981; margin: 0;">Solvity.ai</h1>
  </div>
  
  <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="margin-top: 0; color: #111827;">Client Approval Update</h2>
    
    <div style="background-color: white; border-radius: 6px; padding: 20px; margin-bottom: 20px; border-left: 4px solid ${statusColor};">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">Use Case</p>
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">${useCaseTitle}</p>
    </div>
    
    <div style="display: grid; gap: 15px;">
      <div>
        <p style="margin: 0 0 5px 0; font-size: 14px; color: #6b7280;">Client</p>
        <p style="margin: 0; font-weight: 500;">${clientName}</p>
      </div>
      <div>
        <p style="margin: 0 0 5px 0; font-size: 14px; color: #6b7280;">Status</p>
        <p style="margin: 0; font-weight: 600; color: ${statusColor};">${statusEmoji} ${approvalStatus}</p>
      </div>
      <div>
        <p style="margin: 0 0 5px 0; font-size: 14px; color: #6b7280;">Submitted By</p>
        <p style="margin: 0; font-weight: 500;">${approverName} (${approverEmail})</p>
      </div>
      <div>
        <p style="margin: 0 0 5px 0; font-size: 14px; color: #6b7280;">Date</p>
        <p style="margin: 0;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
      </div>
    </div>
  </div>
  
  <div style="text-align: center; font-size: 12px; color: #9ca3af;">
    <p>&copy; ${new Date().getFullYear()} Solvity.ai. All rights reserved.</p>
  </div>
</body>
</html>
`;

  const textBody = `
Client Approval Update - Solvity.ai

Use Case: ${useCaseTitle}
Client: ${clientName}
Status: ${approvalStatus}
Submitted By: ${approverName} (${approverEmail})
Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}

© ${new Date().getFullYear()} Solvity.ai. All rights reserved.
`;

  return { subject, htmlBody, textBody };
}

export function generatePasswordResetEmail(
  resetLink: string
): { subject: string; htmlBody: string; textBody: string } {
  const subject = "Reset your Solvity.ai password";
  
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #10b981; margin: 0;">Solvity.ai</h1>
  </div>
  
  <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="margin-top: 0; color: #111827;">Reset Your Password</h2>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="display: inline-block; background-color: #10b981; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600;">
        Reset Password
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
  </div>
  
  <div style="text-align: center; font-size: 12px; color: #9ca3af;">
    <p>&copy; ${new Date().getFullYear()} Solvity.ai. All rights reserved.</p>
  </div>
</body>
</html>
`;

  const textBody = `
Reset Your Password - Solvity.ai

We received a request to reset your password. Click the link below to create a new password:

${resetLink}

This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.

© ${new Date().getFullYear()} Solvity.ai. All rights reserved.
`;

  return { subject, htmlBody, textBody };
}
