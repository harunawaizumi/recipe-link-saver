// Authentication middleware for Google OAuth
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { executeQuery } = require('../config/database');
const { AppError } = require('./errorHandler');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verify Google ID token and extract user information
 * @param {string} idToken - Google ID token
 * @returns {Object} - User information from Google
 */
async function verifyGoogleToken(idToken) {
    try {
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        return {
            googleId: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            emailVerified: payload.email_verified
        };
    } catch (error) {
        throw new AppError('Invalid Google token', 401);
    }
}

/**
 * Create or update user in database
 * @param {Object} googleUser - User information from Google
 * @returns {Object} - User record from database
 */
async function createOrUpdateUser(googleUser) {
    try {
        // Check if user already exists
        const existingUser = await executeQuery(
            'SELECT * FROM users WHERE google_id = ? OR email = ?',
            [googleUser.googleId, googleUser.email]
        );

        if (existingUser.length > 0) {
            // Update existing user
            const userId = existingUser[0].id;
            await executeQuery(
                `UPDATE users SET 
                 name = ?, 
                 picture = ?, 
                 email_verified = ?, 
                 last_login = NOW(), 
                 updated_at = NOW() 
                 WHERE id = ?`,
                [googleUser.name, googleUser.picture, googleUser.emailVerified, userId]
            );

            // Return updated user
            const updatedUser = await executeQuery(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );
            return updatedUser[0];
        } else {
            // Create new user
            const { v4: uuidv4 } = require('uuid');
            const userId = uuidv4();

            await executeQuery(
                `INSERT INTO users (id, google_id, email, name, picture, email_verified, last_login, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
                [userId, googleUser.googleId, googleUser.email, googleUser.name, googleUser.picture, googleUser.emailVerified]
            );

            // Return new user
            const newUser = await executeQuery(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );
            return newUser[0];
        }
    } catch (error) {
        console.error('Error creating/updating user:', error);
        throw new AppError('Failed to create or update user', 500);
    }
}

/**
 * Generate JWT token for user
 * @param {Object} user - User object
 * @returns {string} - JWT token
 */
function generateJWT(user) {
    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
            name: user.name
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

/**
 * Middleware to authenticate JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return next(new AppError('Access token required', 401));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database to ensure they still exist
        const user = await executeQuery(
            'SELECT * FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (user.length === 0) {
            return next(new AppError('User not found', 401));
        }

        req.user = user[0];
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new AppError('Invalid token', 401));
        } else if (error.name === 'TokenExpiredError') {
            return next(new AppError('Token expired', 401));
        } else {
            return next(error);
        }
    }
}

/**
 * Middleware to optionally authenticate token (for endpoints that work with or without auth)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await executeQuery(
                'SELECT * FROM users WHERE id = ?',
                [decoded.userId]
            );

            if (user.length > 0) {
                req.user = user[0];
            }
        }

        next();
    } catch (error) {
        // For optional auth, we don't throw errors, just continue without user
        next();
    }
}

module.exports = {
    verifyGoogleToken,
    createOrUpdateUser,
    generateJWT,
    authenticateToken,
    optionalAuth
};