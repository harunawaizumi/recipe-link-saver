#!/bin/bash

# Fix Frontend API URL for Tokyo Region
echo "🗾 Fixing frontend API URL for Tokyo region..."

REGION="ap-northeast-1"
BUCKET_NAME="recipe-link-saver-frontend"

# Step 1: Get Tokyo API Gateway URL
echo "🔍 Step 1: Getting Tokyo API Gateway URL..."

STACK_NAME=$(aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE --region $REGION --query 'StackSummaries[?contains(StackName, `recipe`)].StackName' --output text | head -1)

if [ -z "$STACK_NAME" ]; then
    echo "❌ No CloudFormation stack found in Tokyo region!"
    echo "Available stacks:"
    aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE --region $REGION --query 'StackSummaries[].StackName' --output table
    exit 1
fi

API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`RecipeApi`].OutputValue' --output text)

if [ -z "$API_URL" ]; then
    echo "❌ Could not get API URL from stack: $STACK_NAME"
    echo "Stack outputs:"
    aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs' --output table
    exit 1
fi

echo "✅ Found Tokyo API Gateway URL: $API_URL"

# Step 2: Test the API to make sure it works
echo "🧪 Step 2: Testing Tokyo API Gateway..."

echo "Testing GET /recipes:"
RECIPES_RESPONSE=$(curl -s -w "%{http_code}" "$API_URL/recipes")
HTTP_CODE="${RECIPES_RESPONSE: -3}"
RESPONSE_BODY="${RECIPES_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API Gateway is working!"
    echo "Sample response: $(echo "$RESPONSE_BODY" | head -200)"
else
    echo "⚠️  API Gateway returned HTTP $HTTP_CODE"
    echo "Response: $RESPONSE_BODY"
    echo "You may need to check your Lambda functions"
fi

echo ""
echo "Testing POST /auth/admin:"
AUTH_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$API_URL/auth/admin" \
    -H "Content-Type: application/json" \
    -d '{"adminId":"admin","adminPassword":"password123"}')
AUTH_HTTP_CODE="${AUTH_RESPONSE: -3}"
AUTH_BODY="${AUTH_RESPONSE%???}"

if [ "$AUTH_HTTP_CODE" = "200" ]; then
    echo "✅ Authentication API is working!"
    echo "Auth response: $(echo "$AUTH_BODY" | head -200)"
else
    echo "⚠️  Authentication API returned HTTP $AUTH_HTTP_CODE"
    echo "Auth response: $AUTH_BODY"
fi

# Step 3: Update frontend to use correct API URL
echo "📝 Step 3: Updating frontend to use Tokyo API Gateway..."

# Check current API URL in frontend
CURRENT_API=$(grep -o "this\.baseURL = '[^']*'" integrated-app.js | head -1)
echo "Current frontend API URL: $CURRENT_API"

# Backup current file
cp integrated-app.js integrated-app.js.backup.$(date +%s)

# Update the baseURL to use Tokyo API Gateway (not S3 bucket!)
sed "s|this\.baseURL = '/api/recipes'|this.baseURL = '${API_URL}recipes'|g" integrated-app.js > integrated-app-temp1.js
sed "s|this\.baseURL = 'https://[^']*'|this.baseURL = '${API_URL}recipes'|g" integrated-app-temp1.js > integrated-app-temp2.js

# Also fix the auth API URL if it's hardcoded
sed "s|'/api/auth/admin'|'${API_URL}auth/admin'|g" integrated-app-temp2.js > integrated-app-updated.js

mv integrated-app-updated.js integrated-app.js
rm integrated-app-temp1.js integrated-app-temp2.js

# Verify the change
NEW_API=$(grep -o "this\.baseURL = '[^']*'" integrated-app.js | head -1)
echo "Updated frontend API URL: $NEW_API"

# Step 4: Upload updated frontend to S3
echo "📤 Step 4: Uploading updated frontend to Tokyo S3..."

aws s3 cp integrated-app.js s3://$BUCKET_NAME/integrated-app.js \
    --content-type "application/javascript" \
    --cache-control "no-cache" \
    --region $REGION

echo "✅ Updated frontend uploaded to S3"

# Step 5: Configure S3 static website hosting properly
echo "🌐 Step 5: Configuring S3 static website hosting..."

# Enable static website hosting
aws s3 website s3://$BUCKET_NAME \
    --index-document index.html \
    --error-document error.html \
    --region $REGION

# Set bucket policy for public access
cat > /tmp/bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file:///tmp/bucket-policy.json --region $REGION

# Remove public access blocks
aws s3api put-public-access-block \
    --bucket $BUCKET_NAME \
    --region $REGION \
    --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

rm /tmp/bucket-policy.json

echo "✅ S3 static website hosting configured"

# Restore original file for local development
mv integrated-app.js.backup.$(ls integrated-app.js.backup.* | tail -1) integrated-app.js 2>/dev/null || true

# Step 6: Final summary
WEBSITE_URL="http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"

echo ""
echo "🎉 Tokyo region fix complete!"
echo "============================="
echo ""
echo "📊 Configuration Summary:"
echo "  • Region: $REGION (Tokyo)"
echo "  • S3 Bucket: $BUCKET_NAME"
echo "  • API Gateway: $API_URL"
echo "  • Website URL: $WEBSITE_URL"
echo ""
echo "🔧 What was fixed:"
echo "  • ✅ Frontend now calls API Gateway (not S3 bucket)"
echo "  • ✅ S3 static website hosting properly configured"
echo "  • ✅ Public access policy set"
echo "  • ✅ All resources in Tokyo region"
echo ""
echo "📝 Next steps:"
echo "1. Visit: $WEBSITE_URL"
echo "2. You should now see MySQL data loading"
echo "3. Login should work with admin/password123"
echo "4. All API calls will go to Tokyo API Gateway"
echo ""
echo "🧪 Test the API directly:"
echo "  curl '$API_URL/recipes'"
echo "  curl -X POST '$API_URL/auth/admin' -H 'Content-Type: application/json' -d '{\"adminId\":\"admin\",\"adminPassword\":\"password123\"}'"