# Recipe Link Saver - AWS Migration Guide

## Phase 1: AWS Infrastructure Setup

### 1.1 AWS RDS MySQL Database Setup

1. **Create RDS MySQL Instance**
   ```bash
   # Via AWS CLI (or use AWS Console)
   aws rds create-db-instance \
     --db-instance-identifier recipe-link-saver-db \
     --db-instance-class db.t3.micro \
     --engine mysql \
     --engine-version 8.0.35 \
     --master-username admin \
     --master-user-password YOUR_SECURE_PASSWORD \
     --allocated-storage 20 \
     --storage-type gp2 \
     --vpc-security-group-ids sg-xxxxxxxxx \
     --db-subnet-group-name default \
     --backup-retention-period 7 \
     --storage-encrypted \
     --publicly-accessible
   ```

2. **Configure Security Group**
   - Allow inbound MySQL traffic (port 3306) from your application
   - Restrict access to specific IP ranges or security groups

3. **Get RDS Endpoint**
   - Note the RDS endpoint URL (e.g., `recipe-link-saver-db.xxxxxxxxx.us-east-1.rds.amazonaws.com`)

### 1.2 AWS S3 Bucket Setup

1. **Create S3 Bucket for Static Files**
   ```bash
   aws s3 mb s3://recipe-link-saver-frontend --region us-east-1
   ```

2. **Configure S3 for Static Website Hosting**
   ```bash
   aws s3 website s3://recipe-link-saver-frontend \
     --index-document index.html \
     --error-document error.html
   ```

3. **Set Bucket Policy for Public Read Access**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::recipe-link-saver-frontend/*"
       }
     ]
   }
   ```

### 1.3 AWS EC2 Instance Setup (for Backend API)

1. **Launch EC2 Instance**
   - Instance Type: t3.micro (Free Tier eligible)
   - AMI: Amazon Linux 2
   - Security Group: Allow HTTP (80), HTTPS (443), SSH (22)

2. **Install Node.js and PM2**
   ```bash
   # Connect to EC2 instance
   ssh -i your-key.pem ec2-user@your-ec2-ip

   # Install Node.js
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 18
   nvm use 18

   # Install PM2 globally
   npm install -g pm2
   ```

## Phase 2: Database Migration

### 2.1 Export Current Database
```bash
# Export your current MySQL database
mysqldump -u root -p recipe_link_saver > recipe_backup.sql
```

### 2.2 Import to RDS
```bash
# Import to RDS (replace with your RDS endpoint)
mysql -h recipe-link-saver-db.xxxxxxxxx.us-east-1.rds.amazonaws.com \
      -u admin -p recipe_link_saver < recipe_backup.sql
```

## Phase 3: Application Configuration

### 3.1 Update Environment Variables
Create production environment file for AWS:

```env
# AWS Production Environment
NODE_ENV=production
PORT=3000

# AWS RDS Database
DB_HOST=recipe-link-saver-db.xxxxxxxxx.us-east-1.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=YOUR_SECURE_PASSWORD
DB_NAME=recipe_link_saver

# JWT Secret (generate a strong secret)
JWT_SECRET=your-super-secure-jwt-secret-for-production

# AWS S3 Configuration (if storing images)
AWS_REGION=us-east-1
AWS_S3_BUCKET=recipe-link-saver-assets
```

### 3.2 Deploy Backend to EC2

1. **Upload Application Files**
   ```bash
   # Create deployment package
   tar -czf recipe-app.tar.gz --exclude=node_modules --exclude=.git .
   
   # Upload to EC2
   scp -i your-key.pem recipe-app.tar.gz ec2-user@your-ec2-ip:~/
   ```

2. **Setup Application on EC2**
   ```bash
   # On EC2 instance
   tar -xzf recipe-app.tar.gz
   cd recipe-link-saver
   npm install --production
   
   # Start with PM2
   pm2 start server.js --name "recipe-api"
   pm2 startup
   pm2 save
   ```

### 3.3 Deploy Frontend to S3

1. **Update API URLs in Frontend**
   ```javascript
   // In integrated-app.js, update baseURL
   constructor(authAPI = null) {
       this.baseURL = 'https://your-ec2-ip:3000/api/recipes'; // or use ALB/CloudFront
       // ... rest of constructor
   }
   ```

2. **Upload Frontend Files to S3**
   ```bash
   # Upload static files
   aws s3 sync . s3://recipe-link-saver-frontend \
     --exclude "node_modules/*" \
     --exclude "routes/*" \
     --exclude "middleware/*" \
     --exclude "config/*" \
     --exclude "*.js" \
     --include "integrated-app.js" \
     --include "index.html" \
     --include "styles.css"
   ```

## Phase 4: Production Optimizations

### 4.1 Set up Application Load Balancer (ALB)
- Create ALB to distribute traffic
- Configure SSL certificate
- Point to EC2 instances

### 4.2 Set up CloudFront Distribution
- Create CloudFront distribution for S3 bucket
- Configure custom domain
- Enable HTTPS

### 4.3 Set up Route 53 (Optional)
- Configure custom domain
- Point to CloudFront distribution

## Phase 5: Security & Monitoring

### 5.1 Security Hardening
- Enable AWS WAF
- Configure VPC and subnets properly
- Use IAM roles instead of access keys
- Enable CloudTrail logging

### 5.2 Monitoring Setup
- Configure CloudWatch alarms
- Set up log aggregation
- Monitor RDS performance

## Estimated Costs (Monthly)
- RDS t3.micro: ~$15-20
- EC2 t3.micro: ~$8-10 (Free Tier: $0 for first year)
- S3 Storage: ~$1-3
- CloudFront: ~$1-5
- **Total: ~$25-40/month** (after free tier expires)

## Migration Checklist
- [ ] Create RDS MySQL instance
- [ ] Create S3 bucket for frontend
- [ ] Launch EC2 instance for backend
- [ ] Export and import database
- [ ] Update environment variables
- [ ] Deploy backend to EC2
- [ ] Update frontend API URLs
- [ ] Deploy frontend to S3
- [ ] Test application functionality
- [ ] Set up monitoring and backups
- [ ] Configure custom domain (optional)