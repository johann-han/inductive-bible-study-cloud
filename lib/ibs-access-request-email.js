'use strict';

const DEFAULT_NOTIFICATION_EMAIL = 'johann@woordvanlewe.co.za';
const DASHBOARD_URL = 'https://study.woordvanlewe.co.za/admin';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

async function sendAccessRequestNotification(request) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = String(process.env.IBS_NOTIFICATION_FROM || '').trim();
  const to = String(process.env.IBS_ACCESS_REQUEST_NOTIFICATION_EMAIL || DEFAULT_NOTIFICATION_EMAIL).trim();
  if (!apiKey || !from || !to) {
    return { ok: false, reason: 'not_configured' };
  }

  const fullName = String(request.fullName || '').slice(0, 120);
  const email = String(request.email || '').slice(0, 254);
  const ministry = String(request.churchOrMinistry || '').slice(0, 160);
  const message = String(request.message || '').slice(0, 600);
  const subject = 'New IBS access request';
  const text = [
    'A new request to access the Inductive Bible Study Workspace has been received.',
    '',
    'Name: ' + fullName,
    'Email: ' + email,
    'Church or ministry: ' + (ministry || 'Not provided'),
    'Reason: ' + (message || 'Not provided'),
    '',
    'Review pending requests: ' + DASHBOARD_URL
  ].join('\n');
  const html = '<h2>New IBS access request</h2>' +
    '<p>A new request to access the Inductive Bible Study Workspace has been received.</p>' +
    '<p><strong>Name:</strong> ' + escapeHtml(fullName) + '<br>' +
    '<strong>Email:</strong> ' + escapeHtml(email) + '<br>' +
    '<strong>Church or ministry:</strong> ' + escapeHtml(ministry || 'Not provided') + '</p>' +
    '<p><strong>Reason:</strong><br>' + escapeHtml(message || 'Not provided').replace(/\n/g, '<br>') + '</p>' +
    '<p><a href="' + DASHBOARD_URL + '">Open the IBS administrator dashboard</a></p>';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.warn('Resend rejected IBS access request notification:', response.status, detail.slice(0, 200));
      return { ok: false, reason: 'provider_rejected' };
    }
    return { ok: true };
  } catch (error) {
    console.warn('IBS access request notification delivery failed:', error && error.message ? error.message : 'unknown error');
    return { ok: false, reason: 'delivery_failed' };
  }
}

module.exports = { sendAccessRequestNotification };
