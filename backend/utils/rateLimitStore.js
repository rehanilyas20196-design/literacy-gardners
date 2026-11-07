const { getDb } = require('../../database/connection');

// In-memory counter used when the rate_limit_hit() RPC is unavailable (SQL not
// applied yet, or Postgres unreachable). Still correct for a single process —
// it just does not span serverless instances.
function makeLocalStore(windowMs) {
  const hits = new Map();
  return {
    increment(key) {
      const now = Date.now();
      const entry = hits.get(key);
      if (!entry || entry.reset <= now) {
        const reset = now + windowMs;
        hits.set(key, { count: 1, reset });
        return { totalHits: 1, resetTime: new Date(reset) };
      }
      entry.count += 1;
      return { totalHits: entry.count, resetTime: new Date(entry.reset) };
    },
    decrement(key) {
      const entry = hits.get(key);
      if (entry && entry.count > 1) entry.count -= 1;
    },
    resetKey(key) {
      hits.delete(key);
    },
    resetAll() {
      hits.clear();
    },
  };
}

// Store that counts in Postgres so the limit holds across serverless instances.
// Vercel runs many parallel copies of this process: an in-memory counter is
// per-instance, so N instances would allow N x the intended attempts.
// Requires the rate_limit_hit() RPC from database/supabase_schema.sql; falls
// back to in-memory counting (and retries every minute) until it exists.
class SharedRateLimitStore {
  constructor({ windowMs, name = 'rl' }) {
    this.windowMs = windowMs;
    this.name = name;
    this.local = makeLocalStore(windowMs);
    this.retryAt = 0;
  }

  init() {}

  async increment(key) {
    if (Date.now() >= this.retryAt) {
      try {
        const { data, error } = await getDb().rpc('rate_limit_hit', {
          p_key: `${this.name}:${key}`.slice(0, 300),
          p_window_seconds: Math.round(this.windowMs / 1000),
        });
        if (error) throw new Error(error.message || 'rpc failed');
        const count = Number(data && data.count);
        if (!Number.isFinite(count)) throw new Error('rate_limit_hit returned no count');
        const resetTime = data.reset_at ? new Date(data.reset_at) : new Date(Date.now() + this.windowMs);
        return { totalHits: count, resetTime };
      } catch (err) {
        this.retryAt = Date.now() + 60 * 1000;
        console.warn(
          `rate-limit store "${this.name}": using in-memory fallback (${err.message}). ` +
            'Run the rate_limits SQL from database/supabase_schema.sql to share counts across instances.'
        );
      }
    }
    return this.local.increment(key);
  }

  async decrement(key) {
    this.local.decrement(key);
  }

  async resetKey(key) {
    this.local.resetKey(key);
  }

  async resetAll() {
    this.local.resetAll();
  }
}

module.exports = { SharedRateLimitStore };
