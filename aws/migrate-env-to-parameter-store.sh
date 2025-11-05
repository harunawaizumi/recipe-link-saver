#!/bin/bash

# Migrate .env variables to AWS Systems Manager Parameter Store
# This script securely stores sensitive data in AWS Parameter Store

echo "🔐 Migrating .env variables to AWS Parameter Store..."

# Read .env file and upload to Parameter Store
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Function to create secure parameter
create_secure_parameter() {
    local name=$1
    local value=$2
    local description=$3
    
    aws ssm put-parameter \
        --name "/recipe-link-saver/$name" \
        --value "$value" \
        --type "SecureString" \
        --description "$description" \
        --overwrite \
        --tier "Standard"
    
    echo "✅ Created parameter: /recipe-link-saver/$name"
}

# Read .env file and process each line
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ $key =~ ^#.*$ ]] || [[ -z "$key" ]]; then
        continue
    fi
    
    # Remove quotes from value
    value=$(echo "$value" | sed 's/^["'\'']//' | sed 's/["'\'']$//')
    
    case $key in
        "DB_PASSWORD")
            create_secure_parameter "db-password" "$value" "Database password for RDS MySQL"
            ;;
        "JWT_SECRET")
            create_secure_parameter "jwt-secret" "$value" "JWT secret for authentication"
            ;;
        "ADMIN_PASSWORD")
            create_secure_parameter "admin-password" "$value" "Admin login password"
            ;;
        "DB_HOST")
            create_secure_parameter "db-host" "$value" "Database host endpoint"
            ;;
        "DB_USER")
            create_secure_parameter "db-user" "$value" "Database username"
            ;;
        "DB_NAME")
            create_secure_parameter "db-name" "$value" "Database name"
            ;;
        *)
            echo "ℹ️  Skipping non-sensitive parameter: $key"
            ;;
    esac
done < .env

echo ""
echo "🎉 Migration to Parameter Store complete!"
echo ""
echo "📋 Created parameters:"
aws ssm describe-parameters --parameter-filters "Key=Name,Option=BeginsWith,Values=/recipe-link-saver/" --query 'Parameters[].{Name:Name,Type:Type}' --output table

echo ""
echo "🔧 Next steps:"
echo "1. Update your Lambda functions to use Parameter Store"
echo "2. Add IAM permissions for Parameter Store access"
echo "3. Remove .env file from production"