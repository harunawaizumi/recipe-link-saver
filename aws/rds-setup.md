# AWS RDS MySQL Setup Guide

## Prerequisites
- AWS CLI installed and configured
- AWS account with appropriate permissions
- VPC and security groups configured

## Step 1: Create RDS MySQL Instance

### Using AWS CLI
```bash
# Create DB subnet group
aws rds create-db-subnet-group \
    --db-subnet-group-name recipe-db-subnet-group \
    --db-subnet-group-description "Subnet group for Recipe Link Saver DB" \
    --subnet-ids subnet-12345678 subnet-87654321

# Create RDS MySQL instance
aws rds create-db-instance \
    --db-instance-identifier recipe-link-saver-db \
    --db-instance-class db.t3.micro \
    --engine mysql \
    --engine-version 8.0.35 \
    --master-username admin \
    --master-user-password YourSecurePassword123! \
    --allocated-storage 20 \
    --storage-type gp2 \
    --db-name recipe_link_saver \
    --vpc-security-group-ids sg-12345678 \
    --db-subnet-group-name recipe-db-subnet-group \
    --backup-retention-period 7 \
    --multi-az \
    --storage-encrypted \
    --deletion-protection
```

### Using AWS Console
1. Go to AWS RDS Console
2. Click "Create database"
3. Choose "Standard create"
4. Select "MySQL" engine
5. Choose "Free tier" template (for development)
6. Configure:
   - DB instance identifier: `recipe-link-saver-db`
   - Master username: `admin`
   - Master password: (secure password)
   - DB instance class: `db.t3.micro`
   - Storage: 20 GB GP2
   - VPC: Default or custom VPC
   - Subnet group: Create new or use existing
   - Security group: Allow inbound MySQL (port 3306)

## Step 2: Configure Security Group

```bash
# Create security group for RDS
aws ec2 create-security-group \
    --group-name recipe-db-sg \
    --description "Security group for Recipe Link Saver database"

# Add inbound rule for MySQL (port 3306)
aws ec2 authorize-security-group-ingress \
    --group-name recipe-db-sg \
    --protocol tcp \
    --port 3306 \
    --source-group your-app-security-group-id
```

## Step 3: Environment Variables

After RDS instance is created, update your `.env` file:

```env
DB_HOST=recipe-link-saver-db.cluster-xyz.us-east-1.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=YourSecurePassword123!
DB_NAME=recipe_link_saver
```

## Step 4: Initialize Database

```bash
# Install dependencies
npm install

# Initialize database schema
npm run init-db
```

## Step 5: Test Connection

```bash
# Test database connection
node -e "
const { testConnection } = require('./config/database');
testConnection().then(success => {
    console.log(success ? 'Connection successful!' : 'Connection failed!');
    process.exit(success ? 0 : 1);
});
"
```

## Security Best Practices

1. **Network Security**
   - Place RDS in private subnets
   - Use security groups to restrict access
   - Enable VPC flow logs

2. **Access Control**
   - Use IAM database authentication when possible
   - Rotate passwords regularly
   - Use least privilege principle

3. **Encryption**
   - Enable encryption at rest
   - Use SSL/TLS for connections
   - Encrypt backups

4. **Monitoring**
   - Enable CloudWatch monitoring
   - Set up CloudWatch alarms
   - Enable Performance Insights

## Cost Optimization

1. **Instance Sizing**
   - Start with `db.t3.micro` for development
   - Monitor CPU and memory usage
   - Scale up only when needed

2. **Storage**
   - Use GP2 storage for cost-effectiveness
   - Enable storage autoscaling
   - Monitor storage usage

3. **Backup Strategy**
   - Set appropriate backup retention period
   - Use automated backups
   - Consider cross-region backups for production

## Troubleshooting

### Connection Issues
- Check security group rules
- Verify VPC and subnet configuration
- Ensure RDS instance is in "Available" state
- Check DNS resolution

### Performance Issues
- Monitor CloudWatch metrics
- Check slow query logs
- Optimize database queries
- Consider read replicas for read-heavy workloads