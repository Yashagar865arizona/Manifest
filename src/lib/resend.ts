import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Manifest <noreply@usemanifest.app>";
const APP_URL = process.env.NEXTAUTH_URL ?? "https://usemanifest.app";

export async function sendCheckInEmail(params: {
  to: string;
  memberName: string;
  workspaceName: string;
  checkInToken: string;
  checkInDate: string;
}) {
  const checkInUrl = `${APP_URL}/check-in/${params.checkInToken}`;

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `Daily check-in: ${params.workspaceName} — ${params.checkInDate}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #fff; color: #111;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Manifest</span>
  </div>

  <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 8px; line-height: 1.3;">Hi ${params.memberName} — 60-second check-in</h1>
  <p style="font-size: 15px; color: #555; margin: 0 0 32px; line-height: 1.5;">
    Quick update for <strong>${params.workspaceName}</strong>. Three questions:
  </p>

  <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
    <p style="margin: 0 0 12px; font-size: 14px; color: #333;">✅ What did you complete since yesterday?</p>
    <p style="margin: 0 0 12px; font-size: 14px; color: #333;">🎯 What's your plan for today?</p>
    <p style="margin: 0; font-size: 14px; color: #333;">🚧 Anything blocking you?</p>
  </div>

  <a href="${checkInUrl}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 15px; font-weight: 500; letter-spacing: -0.2px;">
    Submit check-in →
  </a>

  <p style="margin: 32px 0 0; font-size: 13px; color: #999; line-height: 1.5;">
    This link is personal and expires after use. If you didn't expect this email, you can ignore it.
  </p>
</body>
</html>`,
  });
}

export async function sendInviteEmail(params: {
  to: string;
  inviterName: string;
  workspaceName: string;
  inviteToken: string;
}) {
  const inviteUrl = `${APP_URL}/invite/${params.inviteToken}`;

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `${params.inviterName} invited you to ${params.workspaceName} on Manifest`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #fff; color: #111;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Manifest</span>
  </div>

  <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">You've been invited to join ${params.workspaceName}</h1>
  <p style="font-size: 15px; color: #555; margin: 0 0 32px; line-height: 1.5;">
    <strong>${params.inviterName}</strong> has invited you to join their team on Manifest — a lightweight daily check-in tool. You'll get a quick daily prompt, and your manager gets an AI-synthesized summary.
  </p>

  <a href="${inviteUrl}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 15px; font-weight: 500;">
    Accept invitation →
  </a>

  <p style="margin: 32px 0 0; font-size: 13px; color: #999;">
    This invitation expires in 7 days. If you don't want to join, you can ignore this email.
  </p>
</body>
</html>`,
  });
}

export async function sendWeeklyReportEmail(params: {
  to: string;
  managerName: string;
  workspaceName: string;
  weekEnding: string;
  reportText: string;
  reportUrl: string;
}) {
  // Convert markdown to basic HTML (simplified)
  const htmlBody = params.reportText
    .replace(/^## (.+)$/gm, "<h2 style=\"font-size:18px;font-weight:600;margin:24px 0 8px;\">$1</h2>")
    .replace(/^### (.+)$/gm, "<h3 style=\"font-size:16px;font-weight:600;margin:20px 0 8px;\">$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "<li style=\"margin:4px 0;\">$1</li>")
    .replace(/\n\n/g, "</p><p style=\"margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;\">")
    .replace(/\n/g, "<br>");

  await getResend().emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: `Weekly team report — ${params.workspaceName} (week ending ${params.weekEnding})`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #fff; color: #111;">
  <div style="margin-bottom: 24px;">
    <span style="font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Manifest</span>
  </div>

  <p style="font-size: 13px; color: #999; margin: 0 0 24px; text-transform: uppercase; letter-spacing: 0.5px;">Weekly Report · ${params.workspaceName}</p>

  <div style="border-left: 3px solid #111; padding-left: 16px; margin-bottom: 32px;">
    <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #333;">
      ${htmlBody}
    </p>
  </div>

  <a href="${params.reportUrl}" style="display: inline-block; background: #f5f5f5; color: #111; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
    View in dashboard →
  </a>
</body>
</html>`,
  });
}
