// Simple admin authentication routes
const express = require('express');
const jwt = require('jsonwebtoken');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// POST /api/auth/admin - Simple admin login
router.post('/admin', async (req, res, next) => {
    try {
        const { adminId, adminPassword } = req.body;

        if (!adminId || !adminPassword) {
            return next(new AppError('Admin ID and password are required', 400));
        }

        // Check credentials against environment variables
        if (adminId !== process.env.ADMIN_ID || adminPassword !== process.env.ADMIN_PASSWORD) {
            return next(new AppError('Invalid admin credentials', 401));
        }

        // Generate JWT token for admin
        const token = jwt.sign(
            {
                userId: 'admin',
                role: 'admin',
                name: 'Administrator'
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            success: true,
            message: 'Admin authentication successful',
            data: {
                token: token,
                user: {
                    id: 'admin',
                    name: 'Administrator',
                    role: 'admin'
                }
            }
        });

    } catch (error) {
        next(error);
    }
});

// POST /api/auth/verify - Verify JWT token
router.post('/verify', async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return next(new AppError('Access token required', 401));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        res.status(200).json({
            success: true,
            message: 'Token is valid',
            data: {
                user: {
                    id: decoded.userId,
                    name: decoded.name,
                    role: decoded.role
                }
            }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new AppError('Invalid token', 401));
        } else if (error.name === 'TokenExpiredError') {
            return next(new AppError('Token expired', 401));
        } else {
            return next(error);
        }
    }
});

// POST /api/auth/logout - Logout (client-side token removal)
router.post('/logout', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Logout successful'
    });
});

// POST /api/auth/logout - Simple logout
router.post('/logout', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Logout successful'
    });
});

// GET /api/auth/me - Get current user info
router.get('/me', async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return next(new AppError('Access token required', 401));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: decoded.userId,
                    name: decoded.name,
                    role: decoded.role
                }
            }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new AppError('Invalid token', 401));
        } else if (error.name === 'TokenExpiredError') {
            return next(new AppError('Token expired', 401));
        } else {
            return next(error);
        }
    }
});

module.exports = router;