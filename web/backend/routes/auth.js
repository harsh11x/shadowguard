/**
 * routes/auth.js
 * Simple email-based auth — no Firebase needed.
 * 
 * POST /api/auth/signup  { email, password, name }
 * POST /api/auth/login   { email, password }
 * GET  /api/auth/me      → current user (requires Bearer token)
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'shadowguard-dev-secret-change-in-prod';
const TOKEN_TTL = '30d';

const { pool, upsertUser, getUser, getUserByEmail } = require('../lib/db');

function hashPw(pw) {
    return crypto.createHash('sha256').update(pw + JWT_SECRET).digest('hex');
}

function signToken(uid) {
    return jwt.sign({ uid }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    try {
        // Check if email exists
        const existing = await getUserByEmail(email.toLowerCase());
        if (existing) return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.' });

        const uid = uuidv4();
        const user = await upsertUser({ uid, email: email.toLowerCase(), name: name || email.split('@')[0] });

        // Insert auth record
        await pool.query('INSERT INTO user_auth (uid, pw_hash) VALUES ($1, $2)', [uid, hashPw(password)]);

        const token = signToken(uid);
        res.json({ token, user: { uid: user.uid, email: user.email, name: user.name } });
    } catch (e) {
        console.error('[Auth] Signup error:', e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    try {
        const resDb = await pool.query('SELECT u.*, a.pw_hash FROM users u JOIN user_auth a ON u.uid = a.uid WHERE u.email = $1', [email.toLowerCase()]);
        const user = resDb.rows[0];

        if (!user) return res.status(401).json({ error: 'No account found with this email. Sign up first.' });
        if (user.pw_hash !== hashPw(password)) return res.status(401).json({ error: 'Incorrect password' });

        const token = signToken(user.uid);
        res.json({ token, user: { uid: user.uid, email: user.email, name: user.name } });
    } catch (e) {
        console.error('[Auth] Login error:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' });
    try {
        const { uid } = jwt.verify(auth.slice(7), JWT_SECRET);
        const user = await getUser(uid);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user: { uid: user.uid, email: user.email, name: user.name } });
    } catch (e) {
        res.status(401).json({ error: 'Invalid or expired token. Please sign in again.' });
    }
});

// Middleware for developer routes
async function jwtAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated. Please sign in.' });
    try {
        const { uid } = jwt.verify(auth.slice(7), JWT_SECRET);
        const user = await getUser(uid);
        if (!user) return res.status(401).json({ error: 'User not found' });
        req.user = user;
        next();
    } catch (e) {
        res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
}

module.exports = { router, jwtAuth };
