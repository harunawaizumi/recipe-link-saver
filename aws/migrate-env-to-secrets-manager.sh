#!/bin/bash

# Migrate .env variables to AWS Secrets Manager
# This script stores highly sensitive data in Secrets Manager

echo "🔐 Migrating sensitive .env variables to AWS Secrets Manager..."

# Read .env file
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Source the .env file
set -a
source .env
set +a

# Create database credentials secret
echo "📝 Creating database credentials secret..."
aws secretsmanager create-secret \
    --name "recipe-link-saver/database" \
    --description "Database credentials for Recipe Link Saver" \
    --secret-string "{
        \"host\":\"$DB_HOST\",
        \"username\":\"$DB_USER\",
        \"password\":\"$DB_PASSWORD\",
        \"database\":\"$DB_NAME\",
        \"port\":3306
    }" \
    --region us-east-1 || \
aws secretsmanager update-secret \
    --secret-id "recipe-link-saver/database" \
    --secret-string "{
        \"host\":\"$DB_HOST\",
        \"username\":\"$DB_USER\",
        \"password\":\"$DB_PASSWORD\",
        \"database\":\"$DB_NAME\",
        \"port\":3306
    }"

# Create JWT secret
echo "📝 Creating JWT secret..."
aws secretsmanager create-secret \
    --name "recipe-link-saver/jwt" \
    --description "JWT secret for Recipe Link Saver authentication" \
    --secret-string "{\"secret\":\"$JWT_SECRET\"}" \
    --region us-east-1 || \
aws secretsmanager update-secret \
    --secret-id "recipe-link-saver/jwt" \
    --secret-string "{\"secret\":\"$JWT_SECRET\"}"

# Create admin credentials
echo "📝 Creating admin credentials secret..."
aws secretsmanager create-secret \
    --name "recipe-link-saver/admin" \
    --description "Admin credentials for Recipe Link Saver" \
    --secret-string "{
        \"username\":\"admin\",
        \"password\":\"${ADMIN_PASSWORD:-password123}\"
    }" \
    --region us-east-1 || \
aws secretsmanager update-secret \
    --secret-id "recipe-link-saver/admin" \
    --secret-string "{
        \"username\":\"admin\",
        \"password\":\"${ADMIN_PASSWORD:-password123}\"
    }"

echo ""
echo "🎉 Migration to Secrets Manager complete!"
echo ""
echo "📋 Created secrets:"
aws secretsmanager list-secrets --query 'SecretList[?contains(Name, `recipe-link-saver`)].{Name:Name,Description:Description}' --output table

echo ""
echo "💰 Cost: ~$0.40/month per secret"
echo "🔧 Next steps:"
echo "1. Update Lambda functions to use Secrets Manager"
echo "2. Add IAM permissions for Secrets Manager access"
echo "3. Remove .env file from production"