// Enhanced error handling middleware for Recipe Link Saver API

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Async error wrapper to catch async errors
const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

// Database error handler
const handleDatabaseError = (error) => {
    let message = 'Database operation failed';
    let statusCode = 500;

    switch (error.code) {
        case 'ER_DUP_ENTRY':
            message = 'Duplicate entry. This record already exists.';
            statusCode = 409;
            break;
        case 'ER_NO_SUCH_TABLE':
            message = 'Database table not found. Please check database setup.';
            statusCode = 500;
            break;
        case 'ER_BAD_FIELD_ERROR':
            message = 'Invalid field in database query.';
            statusCode = 400;
            break;
        case 'ECONNREFUSED':
            message = 'Unable to connect to database server.';
            statusCode = 503;
            break;
        case 'ER_ACCESS_DENIED_ERROR':
            message = 'Database access denied. Check credentials.';
            statusCode = 503;
            break;
        case 'PROTOCOL_CONNECTION_LOST':
            message = 'Database connection lost. Please try again.';
            statusCode = 503;
            break;
        default:
            message = error.message || 'Database operation failed';
    }

    return new AppError(message, statusCode);
};

// Global error handling middleware
const globalErrorHandler = (error, req, res, next) => {
    let err = { ...error };
    err.message = error.message;

    // Log error details
    console.error('Error Details:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query,
        timestamp: new Date().toISOString()
    });

    // Handle specific error types
    if (error.code && error.code.startsWith('ER_')) {
        err = handleDatabaseError(error);
    }

    // JSON parsing errors
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        err = new AppError('Invalid JSON in request body', 400);
    }

    // Validation errors
    if (error.name === 'ValidationError') {
        err = new AppError(error.message, 400);
    }

    // Rate limit errors
    if (error.status === 429) {
        err = new AppError('Too many requests. Please try again later.', 429);
    }

    // Send error response
    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';

    res.status(statusCode).json({
        status,
        error: err.message || 'Something went wrong',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV !== 'production' && {
            stack: error.stack,
            details: error
        })
    });
};

module.exports = {
    AppError,
    catchAsync,
    globalErrorHandler,
    handleDatabaseError
};