// ═══ SECURITY MIDDLEWARE — Echo Worlds Sprint 8 ═══

// Rate limiter (in-memory, per-IP)
class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.hits = new Map();
    // Clean up every minute
    setInterval(() => this._cleanup(), 60000);
  }

  _cleanup() {
    const now = Date.now();
    for (const [key, data] of this.hits) {
      if (now - data.windowStart > this.windowMs * 2) this.hits.delete(key);
    }
  }

  check(key) {
    const now = Date.now();
    let data = this.hits.get(key);
    if (!data || now - data.windowStart > this.windowMs) {
      data = { windowStart: now, count: 0 };
      this.hits.set(key, data);
    }
    data.count++;
    return data.count <= this.maxRequests;
  }

  middleware(keyFn) {
    return (req, res, next) => {
      const key = keyFn ? keyFn(req) : req.ip;
      if (!this.check(key)) {
        return res.status(429).json({ error: 'Too many requests', retryAfter: Math.ceil(this.windowMs / 1000) });
      }
      next();
    };
  }
}

// Input sanitization
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim()
    .slice(0, 5000); // hard max
}

function sanitizeObj(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') result[key] = sanitize(val);
    else if (typeof val === 'object' && val !== null) result[key] = sanitizeObj(val);
    else result[key] = val;
  }
  return result;
}

// Security headers middleware
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  // CSP — allow inline scripts/styles for single-file game, Socket.IO, and WebRTC
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' ws: wss:",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self'",
  ].join('; '));
  next();
}

// CORS for API routes
function cors(allowedOrigins = ['*']) {
  return (req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '86400');
    }
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  };
}

// Simple token auth middleware (for admin/mod endpoints)
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  // In production: validate JWT or session token against DB
  // For now: check against env var
  if (token !== process.env.ADMIN_TOKEN && process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Invalid token' });
  }
  next();
}

// Socket.IO rate limiter
class SocketRateLimiter {
  constructor(eventsPerMinute = 120) {
    this.limit = eventsPerMinute;
    this.counts = new Map();
    setInterval(() => this.counts.clear(), 60000);
  }

  check(socketId) {
    const count = (this.counts.get(socketId) || 0) + 1;
    this.counts.set(socketId, count);
    return count <= this.limit;
  }
}

module.exports = {
  RateLimiter,
  SocketRateLimiter,
  sanitize,
  sanitizeObj,
  securityHeaders,
  cors,
  requireAuth,
};
