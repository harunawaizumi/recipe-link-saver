// Basic server tests for Recipe Link Saver API
const request = require('supertest');
const app = require('../server');

describe('Recipe Link Saver API Server', () => {
    describe('Health Check', () => {
        test('GET /health should return server status', async () => {
            const response = await request(app)
                .get('/health')
                .expect('Content-Type', /json/);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('database');
            expect(response.body).toHaveProperty('environment');
        });
    });

    describe('API Info', () => {
        test('GET /api should return API information', async () => {
            const response = await request(app)
                .get('/api')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message', 'Recipe Link Saver API');
            expect(response.body).toHaveProperty('version', '1.0.0');
            expect(response.body).toHaveProperty('endpoints');
            expect(response.body).toHaveProperty('timestamp');
        });
    });

    describe('Error Handling', () => {
        test('GET /nonexistent should return 404', async () => {
            const response = await request(app)
                .get('/nonexistent')
                .expect('Content-Type', /json/)
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Route not found');
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('timestamp');
        });

        test('POST /api with invalid JSON should return 400', async () => {
            const response = await request(app)
                .post('/api')
                .set('Content-Type', 'application/json')
                .send('{"invalid": json}')
                .expect('Content-Type', /json/);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('status', 'fail');
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Security Headers', () => {
        test('Should include security headers', async () => {
            const response = await request(app)
                .get('/health');

            // Check for Helmet security headers
            expect(response.headers).toHaveProperty('x-content-type-options');
            expect(response.headers).toHaveProperty('x-frame-options');
            expect(response.headers).toHaveProperty('x-xss-protection');
        });
    });

    describe('CORS', () => {
        test('Should handle CORS preflight requests', async () => {
            const response = await request(app)
                .options('/api')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'GET');

            expect(response.headers).toHaveProperty('access-control-allow-origin');
        });
    });

    describe('Metadata Extraction API', () => {
        test('GET /api/recipes/extract-meta should require URL parameter', async () => {
            const response = await request(app)
                .get('/api/recipes/extract-meta')
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('status', 'fail');
            expect(response.body).toHaveProperty('error', 'URL parameter is required');
        });

        test('GET /api/recipes/extract-meta should validate URL format', async () => {
            const response = await request(app)
                .get('/api/recipes/extract-meta?url=invalid-url')
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body).toHaveProperty('status', 'fail');
            expect(response.body).toHaveProperty('error', 'Invalid URL format');
        });

        test('GET /api/recipes/extract-meta should extract metadata from valid URL', async () => {
            const response = await request(app)
                .get('/api/recipes/extract-meta?url=https://example.com')
                .expect('Content-Type', /json/);

            // Should succeed or fail gracefully (network dependent)
            if (response.status === 200) {
                expect(response.body).toHaveProperty('success', true);
                expect(response.body).toHaveProperty('message', 'Metadata extracted successfully');
                expect(response.body).toHaveProperty('data');
                expect(response.body.data).toHaveProperty('url', 'https://example.com');
                expect(response.body.data).toHaveProperty('metadata');
                expect(response.body.data.metadata).toHaveProperty('domain', 'example.com');
            } else {
                // Network error or timeout - should still return proper error format
                expect(response.body).toHaveProperty('status', 'fail');
                expect(response.body).toHaveProperty('error');
            }
        });
    });
});