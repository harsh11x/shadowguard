/**
 * middleware/firebaseAuth.js  
 * Verifies Firebase ID tokens for the /api/developer/* routes.
 * Users must be authenticated to manage their API keys.
 */

const admin = require('firebase-admin');
const { upsertUser } = require('../lib/db');

let firebaseInitialized = false;

function initFirebase() {
    if (firebaseInitialized) return;

    // Use service account if provided, otherwise use application default
    // For development, we use a permissive mode
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            admin.initializeApp({ credential: admin.credential.applicationDefault() });
        } else {
            // Dev mode: Initialize with project ID only (token verification will fail gracefully)
            const projectId = process.env.FIREBASE_PROJECT_ID || 'shadowguard-demo';
            admin.initializeApp({ projectId });
            console.warn('[firebaseAuth] No service account found — running in dev/demo mode');
        }
        firebaseInitialized = true;
    } catch (e) {
        if (!e.message.includes('already exists')) {
            console.warn('[firebaseAuth] Firebase init warning:', e.message);
            firebaseInitialized = true;
        }
    }
}

initFirebase();

async function firebaseAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Firebase auth token required. Please sign in.' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Dev/demo mode: Parse token without verification (for local development only)
    if (!process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        try {
            // JWT decode without verify for dev
            const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
            const user = upsertUser({
                uid: payload.user_id || payload.sub,
                email: payload.email || 'demo@shadowguard.io',
                name: payload.name || 'Demo User',
            });
            req.user = user;
            return next();
        } catch (e) {
            return res.status(401).json({ error: 'Invalid auth token' });
        }
    }

    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        const user = upsertUser({
            uid: decoded.uid,
            email: decoded.email,
            name: decoded.name || decoded.email,
        });
        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired auth token. Please sign in again.' });
    }
}

module.exports = firebaseAuth;
