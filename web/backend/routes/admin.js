/**
 * routes/admin.js
 * Admin-only endpoints for user management and platform metrics.
 */

const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { getAllUsers, updateUserStatus, getPlatformStats } = require('../lib/db');

// Protect all admin routes
router.use(adminAuth);

// GET /api/admin/users
// List all users with their status and usage metrics
router.get('/users', async (req, res) => {
    try {
        const users = await getAllUsers();
        res.json({ users });
    } catch (e) {
        console.error('[Admin] Get users error:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/admin/users/:uid
// Full user profile: keys, usage history, etc.
const { getUserDetails } = require('../lib/db');
router.get('/users/:uid', async (req, res) => {
    try {
        const data = await getUserDetails(req.params.uid);
        if (!data) return res.status(404).json({ error: 'User not found' });
        res.json(data);
    } catch (e) {
        console.error('[Admin] Get user details error:', e);
        res.status(500).json({ error: e.message });
    }
});

// PATCH /api/admin/users/:uid/status
// Approve, Reject, or Ban a user
// Body: { status: 'active' | 'rejected' | 'banned', banDurationDays: number (optional) }
router.patch('/users/:uid/status', async (req, res) => {
    const { status, banDurationDays } = req.body;
    const { uid } = req.params;

    if (!['active', 'rejected', 'banned'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        let banExpiresAt = null;
        if (status === 'banned' && banDurationDays) {
            const date = new Date();
            date.setDate(date.getDate() + parseInt(banDurationDays));
            banExpiresAt = date.toISOString();
        }

        const user = await updateUserStatus(uid, status, banExpiresAt);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({ message: `User status updated to ${status}`, user });
    } catch (e) {
        console.error('[Admin] Update status error:', e);
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/admin/users/:uid
// Permanently delete a user
const { deleteUser } = require('../lib/db');
router.delete('/users/:uid', async (req, res) => {
    try {
        const success = await deleteUser(req.params.uid);
        if (!success) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (e) {
        console.error('[Admin] Delete user error:', e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/admin/metrics
// Platform-wide statistics
router.get('/metrics', async (req, res) => {
    try {
        const stats = await getPlatformStats();
        res.json({ stats });
    } catch (e) {
        console.error('[Admin] Metrics error:', e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
