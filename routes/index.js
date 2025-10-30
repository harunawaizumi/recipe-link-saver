// Main routes index for Recipe Link Saver API
const express = require('express');
const router = express.Router();

// Import routes
const recipeRoutes = require('./recipes');
const authRoutes = require('./auth');

// API information endpoint
router.get('/', (req, res) => {
    res.json({
        message: 'Recipe Link Saver API',
        version: '1.0.0',
        description: 'Backend API for managing recipe links with AWS RDS MySQL',
        endpoints: {
            health: '/health',
            api_info: '/api',
            auth: {
                googleLogin: 'POST /api/auth/google',
                verify: 'POST /api/auth/verify',
                logout: 'POST /api/auth/logout',
                me: 'GET /api/auth/me'
            },
            recipes: {
                create: 'POST /api/recipes (requires auth)',
                getAll: 'GET /api/recipes (requires auth)',
                update: 'PUT /api/recipes/:id (requires auth)',
                delete: 'DELETE /api/recipes/:id (requires auth)',
                extractMeta: 'GET /api/recipes/extract-meta?url={url}'
            }
        },
        documentation: {
            github: 'https://github.com/your-repo/recipe-link-saver',
            postman: 'Coming soon'
        },
        timestamp: new Date().toISOString()
    });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/recipes', recipeRoutes);

module.exports = router;