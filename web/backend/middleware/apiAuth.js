/**
 * middleware/apiAuth.js
 * Validates X-API-Key header for public /api/v1/* routes.
 * Checks key validity, plan limits, and increments usage.
 */

const { validateApiKey } = require('../lib/db');

async function apiAuth(req, res, next) {
    constrawKey = req.headers['x-api-key'] || req.query.api_key;

    if (!rawKey) {
        return res.status(401).json({
            error: 'API key required',
            hint: 'Pass your key via X-API-Key header or ?api_key= query parameter',
            docs: 'https://shadowguard.io/docs/api'
        });
    }

    try {
        const result = await validateApiKey(rawKey);

        if (!result.valid) {
            const status = result.error.includes('limit') ? 429 : 401;
            return res.status(status).json({ error: result.error });
        }

        // Attach key info to request for downstream handlers
        req.apiKey = result.keyRow;
        req.apiPlan = result.plan;

        // Add rate limit headers
        const limit = result.plan.limit === Infinity ? 'Unlimited' : result.plan.limit;
        const remaining = result.plan.limit === Infinity ? 'Unlimited' : Math.max(0, result.plan.limit - result.keyRow.usage_count - 1);

        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-Plan', result.plan.label);

        next();
    } catch (e) {
        console.error('[API Auth] Error:', e);
        res.status(500).json({ error: 'Internal API error' });
    }
}

module.exports = apiAuth;
