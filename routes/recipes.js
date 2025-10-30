// Recipe CRUD API routes
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const cheerio = require('cheerio');
const { executeQuery } = require('../config/database');
const { validateRecipeData, validateRecipeId, validateUpdateData } = require('../middleware/validation');
const { AppError } = require('../middleware/errorHandler');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Simple admin authentication middleware
const authenticateAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return next(new AppError('Access token required', 401));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'admin') {
            return next(new AppError('Admin access required', 403));
        }

        req.user = decoded;
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
};

// POST /api/recipes - Create a new recipe (admin only)
router.post('/', authenticateAdmin, validateRecipeData, async (req, res, next) => {
    try {
        const { url, title, memo, rating, domain, image_url } = req.body;

        // Generate unique ID
        const id = uuidv4();

        // Set default values
        const recipeTitle = title || null;
        const recipeMemo = memo || null;
        const recipeRating = rating || '未定';
        const recipeImageUrl = image_url || null;

        // Check if URL already exists
        const existingRecipe = await executeQuery(
            'SELECT id FROM recipes WHERE url = ?',
            [url]
        );

        if (existingRecipe.length > 0) {
            return next(new AppError('Recipe with this URL already exists', 409));
        }

        // Insert new recipe (user_id can be null for now)
        const insertQuery = `
            INSERT INTO recipes (id, url, title, domain, memo, rating, image_url, date_added, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
        `;

        await executeQuery(insertQuery, [
            id,
            url,
            recipeTitle,
            domain,
            recipeMemo,
            recipeRating,
            recipeImageUrl
        ]);

        // Fetch the created recipe to return complete data
        const createdRecipe = await executeQuery(
            'SELECT * FROM recipes WHERE id = ?',
            [id]
        );

        res.status(201).json({
            success: true,
            message: 'Recipe created successfully',
            data: createdRecipe[0]
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/recipes - Get all recipes
router.get('/', async (req, res, next) => {
    try {
        // Get all recipes ordered by date_added (newest first)
        const recipes = await executeQuery(
            'SELECT * FROM recipes ORDER BY date_added DESC'
        );

        res.status(200).json({
            success: true,
            message: 'Recipes retrieved successfully',
            count: recipes.length,
            data: recipes
        });

    } catch (error) {
        next(error);
    }
});

// PUT /api/recipes/:id - Update a recipe (admin only)
router.put('/:id', authenticateAdmin, validateRecipeId, validateUpdateData, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { url, title, memo, rating, domain } = req.body;

        // Check if recipe exists
        const existingRecipe = await executeQuery(
            'SELECT * FROM recipes WHERE id = ?',
            [id]
        );

        if (existingRecipe.length === 0) {
            return next(new AppError('Recipe not found', 404));
        }

        // If URL is being updated, check for duplicates (excluding current recipe)
        if (url) {
            const duplicateRecipe = await executeQuery(
                'SELECT id FROM recipes WHERE url = ? AND id != ?',
                [url, id]
            );

            if (duplicateRecipe.length > 0) {
                return next(new AppError('Recipe with this URL already exists', 409));
            }
        }

        // Build dynamic update query
        const updateFields = [];
        const updateValues = [];

        if (url !== undefined) {
            updateFields.push('url = ?');
            updateValues.push(url);
        }
        if (title !== undefined) {
            updateFields.push('title = ?');
            updateValues.push(title);
        }
        if (domain !== undefined) {
            updateFields.push('domain = ?');
            updateValues.push(domain);
        }
        if (memo !== undefined) {
            updateFields.push('memo = ?');
            updateValues.push(memo);
        }
        if (rating !== undefined) {
            updateFields.push('rating = ?');
            updateValues.push(rating);
        }
        if (req.body.image_url !== undefined) {
            updateFields.push('image_url = ?');
            updateValues.push(req.body.image_url);
        }

        // Always update the updated_at timestamp
        updateFields.push('updated_at = NOW()');
        updateValues.push(id);

        const updateQuery = `
            UPDATE recipes 
            SET ${updateFields.join(', ')} 
            WHERE id = ?
        `;

        await executeQuery(updateQuery, updateValues);

        // Fetch the updated recipe
        const updatedRecipe = await executeQuery(
            'SELECT * FROM recipes WHERE id = ?',
            [id]
        );

        res.status(200).json({
            success: true,
            message: 'Recipe updated successfully',
            data: updatedRecipe[0]
        });

    } catch (error) {
        next(error);
    }
});

// DELETE /api/recipes/:id - Delete a recipe (admin only)
router.delete('/:id', authenticateAdmin, validateRecipeId, async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if recipe exists
        const existingRecipe = await executeQuery(
            'SELECT * FROM recipes WHERE id = ?',
            [id]
        );

        if (existingRecipe.length === 0) {
            return next(new AppError('Recipe not found', 404));
        }

        // Delete the recipe
        await executeQuery(
            'DELETE FROM recipes WHERE id = ?',
            [id]
        );

        res.status(200).json({
            success: true,
            message: 'Recipe deleted successfully',
            data: {
                deletedRecipe: existingRecipe[0]
            }
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/recipes/extract-meta - Extract metadata from URL
router.get('/extract-meta', async (req, res, next) => {
    try {
        const { url } = req.query;

        if (!url) {
            return next(new AppError('URL parameter is required', 400));
        }

        // Validate URL format
        let validUrl;
        try {
            validUrl = new URL(url);
            if (!['http:', 'https:'].includes(validUrl.protocol)) {
                return next(new AppError('Only HTTP and HTTPS URLs are supported', 400));
            }
        } catch (error) {
            return next(new AppError('Invalid URL format', 400));
        }

        // Set up axios with proper headers and timeout
        const axiosConfig = {
            timeout: 10000, // 10 seconds timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            maxRedirects: 5,
            validateStatus: function (status) {
                return status >= 200 && status < 400; // Accept 2xx and 3xx status codes
            }
        };

        // Fetch the webpage
        const response = await axios.get(url, axiosConfig);
        const html = response.data;

        // Parse HTML with cheerio
        const $ = cheerio.load(html);

        // Extract metadata
        const metadata = {
            title: null,
            description: null,
            image: null,
            domain: validUrl.hostname
        };

        // Extract title (priority: og:title > twitter:title > title tag)
        metadata.title =
            $('meta[property="og:title"]').attr('content') ||
            $('meta[name="twitter:title"]').attr('content') ||
            $('title').text().trim() ||
            null;

        // Extract description (priority: og:description > twitter:description > meta description)
        metadata.description =
            $('meta[property="og:description"]').attr('content') ||
            $('meta[name="twitter:description"]').attr('content') ||
            $('meta[name="description"]').attr('content') ||
            null;

        // Extract image URL (priority: og:image > twitter:image > first img tag)
        let imageUrl =
            $('meta[property="og:image"]').attr('content') ||
            $('meta[name="twitter:image"]').attr('content') ||
            $('meta[name="twitter:image:src"]').attr('content') ||
            null;

        // If no meta image found, try to find the first meaningful image
        if (!imageUrl) {
            const firstImg = $('img').first();
            if (firstImg.length > 0) {
                imageUrl = firstImg.attr('src');
            }
        }

        // Convert relative URLs to absolute URLs
        if (imageUrl) {
            try {
                if (imageUrl.startsWith('//')) {
                    // Protocol-relative URL
                    imageUrl = validUrl.protocol + imageUrl;
                } else if (imageUrl.startsWith('/')) {
                    // Absolute path
                    imageUrl = validUrl.origin + imageUrl;
                } else if (!imageUrl.startsWith('http')) {
                    // Relative path
                    imageUrl = new URL(imageUrl, url).href;
                }
                metadata.image = imageUrl;
            } catch (error) {
                // If URL construction fails, set image to null
                metadata.image = null;
            }
        }

        // Clean up title and description
        if (metadata.title) {
            metadata.title = metadata.title.trim().substring(0, 255); // Limit to 255 characters
        }
        if (metadata.description) {
            metadata.description = metadata.description.trim().substring(0, 500); // Limit to 500 characters
        }

        res.status(200).json({
            success: true,
            message: 'Metadata extracted successfully',
            data: {
                url: url,
                metadata: metadata
            }
        });

    } catch (error) {
        // Handle specific axios errors
        if (error.code === 'ENOTFOUND') {
            return next(new AppError('Unable to reach the specified URL', 404));
        } else if (error.code === 'ECONNABORTED') {
            return next(new AppError('Request timeout - the website took too long to respond', 408));
        } else if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            return next(new AppError(`Website returned error: ${error.response.status}`, error.response.status));
        } else if (error.request) {
            // The request was made but no response was received
            return next(new AppError('No response received from the website', 503));
        } else {
            // Something happened in setting up the request that triggered an Error
            next(error);
        }
    }
});

module.exports = router;