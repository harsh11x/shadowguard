/**
 * middleware/adminAuth.js
 * Protects routes that require admin privileges.
 */

const { jwtAuth } = require('../routes/auth');

// Composition: First check JWT, then check role
const adminAuth = [
    jwtAuth,
    (req, res, next) => {
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ error: 'Access denied: Admins only' });
        }
    }
];

module.exports = adminAuth;
