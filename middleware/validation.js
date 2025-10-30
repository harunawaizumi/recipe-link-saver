// Request validation middleware for Recipe Link Saver API
const { AppError } = require('./errorHandler');

// URL validation utility
const isValidURL = (string) => {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
};

// Extract domain from URL
const extractDomain = (url) => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch (_) {
        return null;
    }
};

// Validate recipe data
const validateRecipeData = (req, res, next) => {
    const { url, title, memo, rating } = req.body;

    // URL is required and must be valid
    if (!url) {
        return next(new AppError('Recipe URL is required', 400));
    }

    if (!isValidURL(url)) {
        return next(new AppError('Invalid URL format. Please provide a valid HTTP or HTTPS URL', 400));
    }

    // URL length check
    if (url.length > 2048) {
        return next(new AppError('URL is too long. Maximum length is 2048 characters', 400));
    }

    // Title validation (optional but if provided, must be reasonable length)
    if (title && title.length > 255) {
        return next(new AppError('Title is too long. Maximum length is 255 characters', 400));
    }

    // Memo validation (optional but if provided, must be reasonable length)
    if (memo && memo.length > 1000) {
        return next(new AppError('Memo is too long. Maximum length is 1000 characters', 400));
    }

    // Rating validation (must be one of the allowed values)
    const allowedRatings = ['未定', '微妙', 'まあまあ', '満足', '絶対リピ！'];
    if (rating && !allowedRatings.includes(rating)) {
        return next(new AppError(`Invalid rating. Must be one of: ${allowedRatings.join(', ')}`, 400));
    }

    // Add extracted domain to request
    req.body.domain = extractDomain(url);

    next();
};

// Validate recipe ID parameter
const validateRecipeId = (req, res, next) => {
    const { id } = req.params;

    if (!id) {
        return next(new AppError('Recipe ID is required', 400));
    }

    // Basic UUID format validation (allowing both UUID and timestamp-based IDs)
    if (id.length < 10 || id.length > 50) {
        return next(new AppError('Invalid recipe ID format', 400));
    }

    next();
};

// Validate update data (partial validation for PUT requests)
const validateUpdateData = (req, res, next) => {
    const { url, title, memo, rating } = req.body;

    // At least one field must be provided for update
    if (!url && !title && !memo && rating === undefined) {
        return next(new AppError('At least one field must be provided for update', 400));
    }

    // If URL is provided, validate it
    if (url) {
        if (!isValidURL(url)) {
            return next(new AppError('Invalid URL format. Please provide a valid HTTP or HTTPS URL', 400));
        }
        if (url.length > 2048) {
            return next(new AppError('URL is too long. Maximum length is 2048 characters', 400));
        }
        req.body.domain = extractDomain(url);
    }

    // If title is provided, validate it
    if (title && title.length > 255) {
        return next(new AppError('Title is too long. Maximum length is 255 characters', 400));
    }

    // If memo is provided, validate it
    if (memo && memo.length > 1000) {
        return next(new AppError('Memo is too long. Maximum length is 1000 characters', 400));
    }

    // If rating is provided, validate it
    if (rating !== undefined) {
        const allowedRatings = ['未定', '微妙', 'まあまあ', '満足', '絶対リピ！'];
        if (!allowedRatings.includes(rating)) {
            return next(new AppError(`Invalid rating. Must be one of: ${allowedRatings.join(', ')}`, 400));
        }
    }

    next();
};

// Sanitize input data
const sanitizeInput = (req, res, next) => {
    if (req.body) {
        // Trim whitespace from string fields
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        });

        // Remove empty strings (convert to null for database)
        Object.keys(req.body).forEach(key => {
            if (req.body[key] === '') {
                req.body[key] = null;
            }
        });
    }

    next();
};

module.exports = {
    validateRecipeData,
    validateRecipeId,
    validateUpdateData,
    sanitizeInput,
    isValidURL,
    extractDomain
};