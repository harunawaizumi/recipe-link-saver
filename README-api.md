# Recipe Link Saver API

Backend API for the Recipe Link Saver application built with Express.js and AWS RDS MySQL.

## Features

- ✅ Express.js server with security middleware
- ✅ MySQL database connection pool
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ Input validation and sanitization
- ✅ Comprehensive error handling
- ✅ Health check endpoint
- ✅ Request logging
- ✅ Graceful shutdown handling

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
nano .env
```

### 3. Start Development Server
```bash
# Start with auto-restart
npm run dev

# Or start normally
npm start

# Or use the development script
node scripts/start-dev.js --watch
```

### 4. Test the API
```bash
# Run tests
npm test

# Test specific file
npm test -- --testPathPattern=server.test.js

# Health check
curl http://localhost:3000/health

# API info
curl http://localhost:3000/api
```

## API Endpoints

### Health Check
- **GET** `/health` - Server and database status

### API Information
- **GET** `/api` - API information and available endpoints

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `3306` |
| `DB_USER` | Database username | `root` |
| `DB_PASSWORD` | Database password | `` |
| `DB_NAME` | Database name | `recipe_link_saver` |
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `CORS_ORIGIN` | CORS origin | `http://localhost:3000` |

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Sanitization**: Automatic input cleaning
- **Error Handling**: Secure error responses

## Database Connection

The API uses MySQL2 with connection pooling for optimal performance:

- Connection pool with 10 connections
- Automatic reconnection
- SSL support for production (AWS RDS)
- Comprehensive error handling

## Testing

The API includes comprehensive tests covering:

- Health check endpoint
- API information endpoint
- Error handling (404, invalid JSON)
- Security headers
- CORS functionality

## Development

### Project Structure
```
├── server.js              # Main server file
├── config/
│   └── database.js         # Database configuration
├── middleware/
│   ├── errorHandler.js     # Error handling middleware
│   └── validation.js       # Input validation middleware
├── routes/
│   └── index.js           # API routes
├── scripts/
│   ├── start-dev.js       # Development startup script
│   └── init-database.js   # Database initialization
└── tests/
    └── server.test.js     # Server tests
```

### Next Steps

This foundation is ready for implementing the recipe CRUD endpoints in the next task:

- POST `/api/recipes` - Create recipe
- GET `/api/recipes` - Get all recipes  
- PUT `/api/recipes/:id` - Update recipe
- DELETE `/api/recipes/:id` - Delete recipe

## Troubleshooting

### Database Connection Issues
1. Check your `.env` file has correct database credentials
2. Ensure MySQL server is running
3. Verify database exists and user has proper permissions

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### SSL Certificate Issues (AWS RDS)
Set `NODE_ENV=production` in your `.env` file to enable SSL for AWS RDS connections.