#!/usr/bin/env node

// Development startup script for Recipe Link Saver API
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Recipe Link Saver API in development mode...\n');

// Check if .env file exists
const fs = require('fs');
const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
    console.log('⚠️  No .env file found. Creating from .env.example...');
    const examplePath = path.join(__dirname, '..', '.env.example');
    if (fs.existsSync(examplePath)) {
        fs.copyFileSync(examplePath, envPath);
        console.log('✅ Created .env file from .env.example');
        console.log('📝 Please edit .env file with your database credentials\n');
    } else {
        console.log('❌ No .env.example file found');
    }
}

// Start the server with nodemon if available, otherwise use node
const useNodemon = process.argv.includes('--watch') || process.argv.includes('-w');

if (useNodemon) {
    console.log('👀 Starting with nodemon for auto-restart...\n');
    const nodemon = spawn('npx', ['nodemon', 'server.js'], {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
    });

    nodemon.on('close', (code) => {
        console.log(`\n🛑 Server stopped with code ${code}`);
    });
} else {
    console.log('🔧 Starting with node...\n');
    const node = spawn('node', ['server.js'], {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
    });

    node.on('close', (code) => {
        console.log(`\n🛑 Server stopped with code ${code}`);
    });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down development server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down development server...');
    process.exit(0);
});