/**
 * middleware/apiAuth.js
 * Validates X-API-Key header for public /api/v1/* routes.
 * Checks key validity, plan limits, and increments usage.
 */

const { validateApiKey } = require('../lib/db');

function apiAuth(req, res, next) {
    const rawKey = req.headers['x-api-key'] || req.query.api_key;

    if (!rawKey) {
        return res.status(401).json({
            error: 'API key required',
            hint: 'Pass your key via X-API-Key header or ?api_key= query parameter',
            docs: 'https://shadowguard.io/docs/api'
        });
    }

    const result = validateApiKey(rawKey);

    if (!result.valid) {
        const status = result.error.includes('limit') ? 429 : 401;
        return res.status(status).json({ error: result.error });
    }

    // Attach key info to request for downstream handlers
    req.apiKey = result.keyRow;
    req.apiPlan = result.plan;
    next();
}

module.exports = apiAuth;
