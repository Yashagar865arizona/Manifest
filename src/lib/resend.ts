import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Radar <noreply@usemanifest.app>";
const WAITLIST_FROM_EMAIL = process.env.WAITLIST_FROM_EMAIL ?? FROM_EMAIL;
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
    <span style="font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Radar</span>
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
    subject: `${params.inviterName} invited you to ${params.workspaceName} on Radar`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #fff; color: #111;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Radar</span>
  </div>

  <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">You've been invited to join ${params.workspaceName}</h1>
  <p style="font-size: 15px; color: #555; margin: 0 0 32px; line-height: 1.5;">
    <strong>${params.inviterName}</strong> has invited you to join their team on Radar — a lightweight daily check-in tool. You'll get a quick daily prompt, and your manager gets an AI-synthesized summary.
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

function unsubscribeFooter(unsubscribeUrl: string): string {
  return `<p style="margin: 40px 0 0; font-size: 12px; color: #bbb; line-height: 1.5;">
    You're receiving this because you signed up for Radar.
    <a href="${unsubscribeUrl}" style="color: #bbb; text-decoration: underline;">Unsubscribe</a>
  </p>`;
}

export async function sendWaitlistConfirmationEmail(params: {
  to: string;
  unsubscribeToken: string;
}) {
  const unsubscribeUrl = `${APP_URL}/api/waitlist/unsubscribe?token=${params.unsubscribeToken}`;

  await getResend().emails.send({
    from: WAITLIST_FROM_EMAIL,
    to: params.to,
    subject: "You're on the list",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #fff; color: #111;">
  <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px;">You're on the list.</p>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 16px;">
    We're building Radar — a tool that watches the signals your team already creates (Slack activity, GitHub commits, calendar load) and tells you only what needs your attention. No surveys. No dashboards to check. Just a quiet alert when someone is burning out or a project is stalling.
  </p>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 24px;">
    We're onboarding design partners soon. If you want early access to shape the product, reply to this email and tell me what you're managing right now.
  </p>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0;">— Yash</p>
  ${unsubscribeFooter(unsubscribeUrl)}
</body>
</html>`,
  });
}

export async function sendWaitlistEmail2(params: {
  to: string;
  unsubscribeToken: string;
}) {
  const unsubscribeUrl = `${APP_URL}/api/waitlist/unsubscribe?token=${params.unsubscribeToken}`;

  await getResend().emails.send({
    from: WAITLIST_FROM_EMAIL,
    to: params.to,
    subject: "The problem with how leadership teams operate today",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #fff; color: #111;">
  <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px;">A director I talked to last month found out one of his best engineers was job hunting. Not because the engineer told him. Because the engineer had quietly stopped opening Slack on weekends. His PR reviews dried up. His GitHub went dark.</p>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 16px;">By the time the director noticed, the engineer had already signed an offer.</p>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 16px;">This happens constantly. A team burns out quietly. A project stalls. Someone feels blocked but doesn't escalate. And the manager only finds out after the damage is done — in a 1:1, in a resignation letter, in a missed launch.</p>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 16px;">The tools we give managers today were not built for this. Stand-ups tell you what people did. Jira tells you ticket status. Slack tells you nothing at all, unless you're reading every message.</p>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 24px;">Leadership is still mostly reactive. You learn about problems when they're already problems.</p>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 24px;">Does this resonate? Hit reply — I'd genuinely like to hear what version of this you've experienced.</p>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0;">— Yash</p>
  ${unsubscribeFooter(unsubscribeUrl)}
</body>
</html>`,
  });
}

export async function sendWaitlistEmail3(params: {
  to: string;
  unsubscribeToken: string;
}) {
  const unsubscribeUrl = `${APP_URL}/api/waitlist/unsubscribe?token=${params.unsubscribeToken}`;

  await getResend().emails.send({
    from: WAITLIST_FROM_EMAIL,
    to: params.to,
    subject: "No surveys. No behavior change. Just signals.",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #fff; color: #111;">
  <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px;">The first question most people ask when I describe Radar is: "do you make employees fill out forms?"</p>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 16px;">No. Your team doesn't do anything differently.</p>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 8px;">Here's how it works:</p>
  <ul style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 16px; padding-left: 20px;">
    <li style="margin-bottom: 8px;"><strong>We connect to the tools your team already uses</strong> — Slack, GitHub, and Google Calendar. Read-only OAuth. Takes 5 minutes to set up.</li>
    <li style="margin-bottom: 8px;"><strong>We watch for signals, not content.</strong> We're not reading messages. We track patterns: message frequency, response latency, commit velocity, meeting load. The kind of data that shows up in spreadsheets if you were doing this manually.</li>
    <li style="margin-bottom: 8px;"><strong>You get a daily brief, not a dashboard.</strong> Most days it says nothing is wrong. When something is off — someone going quiet, calendar overloaded 3 weeks running, a project with no commits in 10 days — you get a short alert. That's it.</li>
  </ul>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 24px;">
    If you want to see a live example, the demo at <a href="${APP_URL}/demo" style="color: #111; text-decoration: underline;">${APP_URL}/demo</a> runs on a synthetic team. No signup required.
  </p>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0;">— Yash</p>
  ${unsubscribeFooter(unsubscribeUrl)}
</body>
</html>`,
  });
}

export async function sendWaitlistEmail4(params: {
  to: string;
  unsubscribeToken: string;
}) {
  const unsubscribeUrl = `${APP_URL}/api/waitlist/unsubscribe?token=${params.unsubscribeToken}`;

  await getResend().emails.send({
    from: WAITLIST_FROM_EMAIL,
    to: params.to,
    subject: "Want to be one of our first design partners?",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #fff; color: #111;">
  <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px;">We're looking for 5 companies to use Radar for free in exchange for a weekly 30-minute call.</p>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 8px;"><strong>What you get:</strong></p>
  <ul style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 16px; padding-left: 20px;">
    <li style="margin-bottom: 6px;">Full access to Radar — connectors, daily briefs, anomaly detection — at no cost</li>
    <li style="margin-bottom: 6px;">Direct line to us. Your feedback shapes the roadmap.</li>
    <li style="margin-bottom: 6px;">We'll reference you as an anonymous case study (only with your approval)</li>
  </ul>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 8px;"><strong>What we need:</strong></p>
  <ul style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 24px; padding-left: 20px;">
    <li style="margin-bottom: 6px;">30 minutes per week on a call with us</li>
    <li style="margin-bottom: 6px;">A team of at least 5 people using Slack and GitHub</li>
    <li style="margin-bottom: 6px;">Honest feedback — the harder the better</li>
  </ul>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 24px;">Reply with "yes" and I'll send over a 20-minute calendar link.</p>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0;">— Yash</p>
  ${unsubscribeFooter(unsubscribeUrl)}
</body>
</html>`,
  });
}

export async function sendWaitlistEmail5(params: {
  to: string;
  unsubscribeToken: string;
}) {
  const unsubscribeUrl = `${APP_URL}/api/waitlist/unsubscribe?token=${params.unsubscribeToken}`;

  await getResend().emails.send({
    from: WAITLIST_FROM_EMAIL,
    to: params.to,
    subject: "One last thing before I stop emailing",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #fff; color: #111;">
  <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px;">We're closing design partner applications this week.</p>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 16px;">If you've been thinking about it — now is the time. Reply and I'll get you set up.</p>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0 0 16px;">If it's not the right time, no problem. We'll move you to a low-frequency update list and reach out when we hit GA.</p>
  <p style="font-size: 15px; line-height: 1.7; color: #333; margin: 0;">— Yash</p>
  ${unsubscribeFooter(unsubscribeUrl)}
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
    <span style="font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Radar</span>
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
