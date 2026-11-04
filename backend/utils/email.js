const WEB_BASE_URL = process.env.WEB_BASE_URL || 'http://localhost:3000';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Literacy Gardeners <onboarding@resend.dev>';

async function sendEmail({ to, subject, text, html }) {
  if (!RESEND_API_KEY) {
    console.log('--- [email:console fallback — set RESEND_API_KEY + EMAIL_FROM] ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text);
    console.log('----------------------------------------------------------------');
    return { delivered: false, simulated: true };
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      text,
      html: html || undefined,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    console.error(`[email] send failed (${resp.status}): ${body}`);
    const err = new Error('Failed to send email');
    err.status = 502;
    throw err;
  }
  return { delivered: true };
}

async function sendPasswordReset(email, token) {
  const url = `${WEB_BASE_URL}/reset-password?token=${token}`;
  const text = [
    'Literacy Gardeners — Password Reset',
    '',
    'Use the link below within 30 minutes to set a new password:',
    url,
    '',
    'If you did not request this, you can safely ignore this email.',
  ].join('\n');
  const html = `
    <p>Literacy Gardeners — Password Reset</p>
    <p>Use the link below within 30 minutes to set a new password:</p>
    <p><a href="${url}">Reset your password</a></p>
    <p>If you did not request this, you can safely ignore this email.</p>
  `;
  return sendEmail({
    to: email,
    subject: 'Reset your Literacy Gardeners password',
    text,
    html,
  });
}

module.exports = { sendEmail, sendPasswordReset };
