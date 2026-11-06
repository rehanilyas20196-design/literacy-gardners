const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const cors = require('cors');
const express = require('express');

const DEFAULT_WEB_ORIGIN = 'http://localhost:3000';

function splitList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

// Browser origins allowed to call this API. CORS_ORIGIN accepts a comma list.
function configuredOrigins() {
  const origins = [...splitList(process.env.CORS_ORIGIN), ...splitList(process.env.WEB_BASE_URL)];

  // Deployment's own hosts (preview + production) so previews are not locked out
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.VERCEL_BRANCH_URL) origins.push(`https://${process.env.VERCEL_BRANCH_URL}`);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    origins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  if (process.env.NODE_ENV !== 'production') {
    origins.push(DEFAULT_WEB_ORIGIN, 'http://127.0.0.1:3000', 'http://localhost:4000');
  }

  return [...new Set(origins.map((origin) => origin.replace(/\/+$/, '')))];
}

function hostOf(urlLike) {
  try {
    return new URL(urlLike).host.toLowerCase();
  } catch {
    return null;
  }
}

const ALLOWED_HOSTS = new Set(configuredOrigins().map(hostOf).filter(Boolean));
const WEB_BASE = process.env.WEB_BASE_URL || DEFAULT_WEB_ORIGIN;

// ---- HTTPS ----
// Vercel terminates TLS and always reports https; this only catches a plain-HTTP
// request that reached the app through a proxy which forwards the original scheme.
function enforceHttps(req, res, next) {
  const proto = String(req.get('x-forwarded-proto') || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (proto !== 'http') return next();

  const host = String(req.get('host') || '');
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host)) return next();

  if (req.method === 'GET' || req.method === 'HEAD') {
    return res.redirect(308, `https://${host}${req.originalUrl}`);
  }
  return res.status(403).json({ error: 'HTTPS required' });
}

// ---- CSRF ----
// Auth is Bearer-token based, so token theft via CSRF is not possible; this blocks
// cross-site form/fetch submission to state-changing endpoints as defence in depth.
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function csrfProtection(req, res, next) {
  if (!UNSAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin');
  const referer = req.get('referer');
  // Non-browser clients (curl, mobile apps, server-to-server) send neither.
  if (!origin && !referer) return next();

  const sourceHost = hostOf(origin || referer);
  if (!sourceHost) return res.status(403).json({ error: 'Invalid request origin' });

  // Requests proxied through the Next.js frontend carry the original host here.
  const ownHosts = [req.get('host'), req.get('x-forwarded-host')]
    .filter(Boolean)
    .map((host) => String(host).toLowerCase());

  if (ALLOWED_HOSTS.has(sourceHost) || ownHosts.includes(sourceHost)) {
    return next();
  }
  return res.status(403).json({ error: 'Invalid request origin' });
}

// ---- Rate limiters ----
function makeLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });
}

const generalLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  // Reads + anything not in a stricter bucket. 600/15min: the admin dashboard
  // alone pulls ~10 endpoints per view, and whole classrooms can share one NAT
  // address. Writes stay on the tight buckets below.
  limit: 600,
  message: 'Too many requests, please try again later.',
});

// Factory: one limiter INSTANCE per mount. Sharing a single instance across
// /api/auth, /api/leads, /api/newsletter and /api/uploads would put a signup, a
// contact form and a file upload against the same 20/15min budget.
function makeStrictLimiter() {
  const limiter = makeLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    message: 'Too many attempts, please try again later.',
  });
  return (req, res, next) =>
    req.method === 'GET' || req.method === 'HEAD' ? next() : limiter(req, res, next);
}

// Writes that create rows or send email — tighter than reads, looser than auth.
const writeLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: 'Too many submissions, please try again later.',
});

// Login brute-force limiter, keyed by client IP *and* the attempted account.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req.ip || req.socket?.remoteAddress || 'unknown');
    const account = String(req.body?.email || '')
      .trim()
      .toLowerCase()
      .slice(0, 200);
    return `${ip}:${account}`;
  },
});

// ---- Input sanitization ----
// Active-content tags are stripped so stored values stay plain text. React escapes
// output on render; this protects non-React consumers (admin emails, exports).
const ACTIVE_TAG = /<\s*\/?\s*(script|style|iframe|object|embed|svg|math|form|input|button|link|meta|base|img|video|audio|source|track)[^>]*>/gi;
const DANGEROUS_SCHEME = /^\s*(javascript|vbscript|data\s*:\s*text\/html)\s*:/i;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_STRING_LENGTH = 20000;
const MAX_DEPTH = 8;
const MAX_ARRAY_LENGTH = 500;

function sanitizeString(value) {
  return value
    .replace(/\0/g, '')
    .replace(CONTROL_CHARS, '')
    .replace(ACTIVE_TAG, '')
    .replace(DANGEROUS_SCHEME, '')
    .trim()
    .slice(0, MAX_STRING_LENGTH);
}

function sanitizeObject(value, depth = 0) {
  if (typeof value === 'string') return sanitizeString(value);
  if (Array.isArray(value)) {
    if (depth >= MAX_DEPTH) return [];
    return value.slice(0, MAX_ARRAY_LENGTH).map((entry) => sanitizeObject(entry, depth + 1));
  }
  if (value !== null && typeof value === 'object') {
    if (depth >= MAX_DEPTH) return {};
    const cleaned = {};
    for (const [key, entry] of Object.entries(value)) {
      // Never let a body redefine the prototype chain
      if (BLOCKED_KEYS.has(key)) continue;
      cleaned[key] = sanitizeObject(entry, depth + 1);
    }
    return cleaned;
  }
  return value;
}

function securityMiddleware(app) {
  // Don't advertise the framework
  app.disable('x-powered-by');

  app.use(enforceHttps);

  // Security headers via helmet
  app.use(helmet());
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'http://localhost:4000',
          'ws://localhost:4000',
          WEB_BASE,
          WEB_BASE.replace('https://', 'wss://').replace('http://', 'ws://'),
        ],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    })
  );
  app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));
  app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
  app.use(helmet.xssFilter());
  app.use(helmet.noSniff());
  app.use(helmet.frameguard({ action: 'deny' }));

  // CORS — restrict to configured origin, not '*'. No cookies are used, so
  // credentialed cross-origin requests are disabled.
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = configuredOrigins();
        if (allowed.includes('*') || allowed.includes(origin.replace(/\/+$/, ''))) {
          return callback(null, true);
        }
        // Blocked origin: respond without CORS headers instead of erroring (500)
        return callback(null, false);
      },
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    })
  );

  // Body parsing must come first: the login rate limiter keys on the attempted
  // account (req.body.email) and the sanitizer rewrites req.body.
  app.use(express.json({ limit: '100kb' }));

  // Sanitize request bodies — strip control characters, active markup and
  // prototype-polluting keys, then trim
  app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    next();
  });

  app.use(csrfProtection);

  // General rate limiter — every /api request, before the stricter buckets
  app.use('/api/', generalLimiter);

  // Strict limiters for auth and public write endpoints — one instance per
  // mount so unrelated endpoints don't share a budget. Only state-changing
  // methods count: GET /team, GET /competitions and GET /auth/me are plain
  // reads and fall through to the general limiter.
  app.use('/api/auth', makeStrictLimiter());
  app.use('/api/team', makeStrictLimiter());
  app.use('/api/leads', makeStrictLimiter());
  app.use('/api/newsletter', makeStrictLimiter());
  app.use('/api/uploads', makeStrictLimiter());
  app.use('/api/quotes', writeLimiter);

  // Brute-force protection keyed by IP *and* the account being attempted, so one
  // attacker cannot lock every account out of a shared IP (and vice versa).
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth/register', loginLimiter);
}

module.exports = {
  securityMiddleware,
  generalLimiter,
  makeStrictLimiter,
  writeLimiter,
  loginLimiter,
  csrfProtection,
  enforceHttps,
  sanitizeString,
  sanitizeObject,
};
