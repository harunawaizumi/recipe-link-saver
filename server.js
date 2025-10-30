// Recipe Link Saver - Express.js Backend API
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { testConnection } = require('./config/database');
const { globalErrorHandler } = require('./middleware/errorHandler');
const { sanitizeInput } = require('./middleware/validation');
const apiRoutes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "https://apis.google.com"],
            imgSrc: ["'self'", "data:", "https:", "https://lh3.googleusercontent.com"],
            connectSrc: ["'self'", "https://accounts.google.com"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["https://accounts.google.com"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization middleware
app.use(sanitizeInput);

// Serve static files from the root directory
app.use(express.static('.', {
    index: 'index.html',
    extensions: ['html', 'css', 'js'],
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html');
        } else if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const dbConnected = await testConnection();
        res.status(200).json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: dbConnected ? 'connected' : 'disconnected',
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(503).json({
            status: 'Service Unavailable',
            timestamp: new Date().toISOString(),
            database: 'error',
            error: error.message
        });
    }
});

// API routes
app.use('/api', apiRoutes);

// 404 handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `The requested route ${req.method} ${req.originalUrl} does not exist`,
        timestamp: new Date().toISOString()
    });
});

// Global error handling middleware
app.use(globalErrorHandler);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    const { closeConnection } = require('./config/database');
    await closeConnection();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    const { closeConnection } = require('./config/database');
    await closeConnection();
    process.exit(0);
});

// Start server
const startServer = async () => {
    try {
        // Test database connection on startup
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.warn('⚠️  Server starting without database connection');
        }

        app.listen(PORT, () => {
            console.log(`🚀 Recipe Link Saver API server running on port ${PORT}`);
            console.log(`📊 Health check available at http://localhost:${PORT}/health`);
            console.log(`🔗 API documentation at http://localhost:${PORT}/api`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

// Only start server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = app;