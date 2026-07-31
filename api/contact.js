/* ============================================================
   CONTACT FORM — Vercel Serverless Function
   POST /api/contact
   
   Handles form submissions, validates input, checks honeypot,
   rate-limits by IP, and sends email via Resend.
   ============================================================ */

const { Resend } = require('resend');

// ── Simple in-memory rate limiter ────────────────────────────
// Note: In serverless, each cold start resets this map.
// For a portfolio site this provides reasonable protection;
// for heavy traffic, use Vercel's Edge Config or Upstash Redis.
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5; // max requests per window per IP

function isRateLimited(ip) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitMap.set(ip, { windowStart: now, count: 1 });
        return false;
    }

    entry.count++;
    if (entry.count > RATE_LIMIT_MAX) {
        return true;
    }

    return false;
}

// ── Validation helpers ───────────────────────────────────────
function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str
        .trim()
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateFields({ name, email, message }) {
    const errors = [];

    if (!name || name.length < 2) {
        errors.push({ field: 'name', message: 'Name must be at least 2 characters.' });
    }
    if (name && name.length > 100) {
        errors.push({ field: 'name', message: 'Name must be under 100 characters.' });
    }

    if (!email) {
        errors.push({ field: 'email', message: 'Email is required.' });
    } else if (!isValidEmail(email)) {
        errors.push({ field: 'email', message: 'Please provide a valid email address.' });
    }

    if (!message || message.length < 10) {
        errors.push({ field: 'message', message: 'Message must be at least 10 characters.' });
    }
    if (message && message.length > 5000) {
        errors.push({ field: 'message', message: 'Message must be under 5000 characters.' });
    }

    return errors;
}

// ── Build email HTML ─────────────────────────────────────────
function buildEmailHTML({ name, email, phone, company, subject, message, timestamp, ip, userAgent }) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#7c3aed 0%,#a855f7 100%);border-radius:16px 16px 0 0;padding:32px 28px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                ✉️ New Contact Form Submission
            </h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                From your portfolio website
            </p>
        </div>

        <!-- Body -->
        <div style="background:#141420;border:1px solid rgba(124,58,237,0.2);border-top:none;border-radius:0 0 16px 16px;padding:32px 28px;">
            
            <!-- Name -->
            <div style="margin-bottom:20px;">
                <div style="font-size:11px;font-weight:600;color:#a855f7;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Name</div>
                <div style="font-size:16px;color:#f0f0ff;font-weight:600;">${name}</div>
            </div>

            <!-- Email -->
            <div style="margin-bottom:20px;">
                <div style="font-size:11px;font-weight:600;color:#a855f7;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Email</div>
                <div style="font-size:15px;color:#f0f0ff;">
                    <a href="mailto:${email}" style="color:#06b6d4;text-decoration:none;">${email}</a>
                </div>
            </div>

            ${phone ? `
            <!-- Phone -->
            <div style="margin-bottom:20px;">
                <div style="font-size:11px;font-weight:600;color:#a855f7;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Phone</div>
                <div style="font-size:15px;color:#f0f0ff;">${phone}</div>
            </div>
            ` : ''}

            ${company ? `
            <!-- Company -->
            <div style="margin-bottom:20px;">
                <div style="font-size:11px;font-weight:600;color:#a855f7;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Company</div>
                <div style="font-size:15px;color:#f0f0ff;">${company}</div>
            </div>
            ` : ''}

            ${subject ? `
            <!-- Subject -->
            <div style="margin-bottom:20px;">
                <div style="font-size:11px;font-weight:600;color:#a855f7;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Subject</div>
                <div style="font-size:15px;color:#f0f0ff;">${subject}</div>
            </div>
            ` : ''}

            <!-- Divider -->
            <hr style="border:none;border-top:1px solid rgba(124,58,237,0.2);margin:24px 0;">

            <!-- Message -->
            <div style="margin-bottom:24px;">
                <div style="font-size:11px;font-weight:600;color:#a855f7;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Message</div>
                <div style="font-size:15px;color:#f0f0ff;line-height:1.7;background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.12);border-radius:12px;padding:20px;white-space:pre-wrap;">${message}</div>
            </div>

            <!-- Divider -->
            <hr style="border:none;border-top:1px solid rgba(124,58,237,0.2);margin:24px 0;">

            <!-- Meta -->
            <div style="font-size:12px;color:#6b7280;line-height:1.8;">
                <div><strong style="color:#9ca3c8;">Submitted on:</strong> ${timestamp}</div>
                ${ip ? `<div><strong style="color:#9ca3c8;">IP Address:</strong> ${ip}</div>` : ''}
                ${userAgent ? `<div><strong style="color:#9ca3c8;">User Agent:</strong> ${userAgent}</div>` : ''}
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align:center;padding:24px 0 0;font-size:12px;color:#6b7280;">
            Sent from <a href="https://amankumarsingh.dev" style="color:#a855f7;text-decoration:none;">amankumarsingh.dev</a>
        </div>
    </div>
</body>
</html>`;
}

// ── Main handler ─────────────────────────────────────────────
module.exports = async function handler(req, res) {
    // ── CORS headers ──
    const allowedOrigin = process.env.CORS_ORIGIN || '*';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        console.warn(`[CONTACT] Rejected ${req.method} request`);
        return res.status(405).json({ success: false, message: 'Method not allowed.' });
    }

    try {
        // ── Rate limiting ──
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || req.headers['x-real-ip']
            || req.socket?.remoteAddress
            || 'unknown';

        if (isRateLimited(clientIP)) {
            console.warn(`[CONTACT] Rate limited IP: ${clientIP}`);
            return res.status(429).json({
                success: false,
                message: 'Too many submissions. Please try again in 15 minutes.'
            });
        }

        // ── Parse body ──
        const body = req.body;
        if (!body || typeof body !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid request body.' });
        }

        // ── Honeypot check ──
        // If the hidden "website" field is filled, it's a bot — return 200 silently
        if (body.website) {
            console.log('[CONTACT] Honeypot triggered — bot detected');
            return res.status(200).json({
                success: true,
                message: 'Thank you! Your message has been sent successfully.'
            });
        }

        // ── Sanitize input ──
        const name = sanitize(body.name);
        const email = sanitize(body.email);
        const phone = sanitize(body.phone || '');
        const company = sanitize(body.company || '');
        const subject = sanitize(body.subject || '');
        const message = sanitize(body.message);

        // ── Validate ──
        const errors = validateFields({ name, email, message });
        if (errors.length > 0) {
            console.warn('[CONTACT] Validation failed:', errors.map(e => e.message).join(', '));
            return res.status(400).json({ success: false, message: 'Validation failed.', errors });
        }

        // ── Build email ──
        const timestamp = new Date().toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'full',
            timeStyle: 'long'
        });

        const userAgent = req.headers['user-agent'] || '';

        const emailSubject = `New Contact Form Submission — ${name}`;
        const emailHTML = buildEmailHTML({
            name, email, phone, company, subject, message,
            timestamp, ip: clientIP, userAgent
        });

        // ── Send email via Resend ──
        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
            console.error('[CONTACT] RESEND_API_KEY is not configured');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error. Please try again later.'
            });
        }

        const resend = new Resend(resendApiKey);

        const emailTo = process.env.EMAIL_TO || 'contact.amankumarsingh@gmail.com';
        const emailFrom = process.env.EMAIL_FROM || 'Portfolio Contact <onboarding@resend.dev>';

        const { data, error } = await resend.emails.send({
            from: emailFrom,
            to: [emailTo],
            replyTo: email,
            subject: emailSubject,
            html: emailHTML
        });

        if (error) {
            console.error('[CONTACT] Resend error:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Failed to send your message. Please try again later.'
            });
        }

        console.log(`[CONTACT] ✓ Email sent successfully | ID: ${data.id} | From: ${name} <${email}>`);

        return res.status(200).json({
            success: true,
            message: 'Thank you! Your message has been sent successfully. We\'ll get back to you soon.'
        });

    } catch (err) {
        console.error('[CONTACT] Unexpected error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Sorry, something went wrong. Please try again later.'
        });
    }
};
