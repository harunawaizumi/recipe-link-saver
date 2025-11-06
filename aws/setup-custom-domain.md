# Custom Domain Setup for Recipe Link Saver

## ✅ S3 Bucket Setup Complete

Your S3 bucket has been created and configured:
- **Bucket Name**: `www.recipe-link-saver.harunawaizumi.space`
- **Region**: `ap-northeast-1` (Tokyo)
- **Website URL**: http://www.recipe-link-saver.harunawaizumi.space.s3-website-ap-northeast-1.amazonaws.com

## 🌐 Next Steps for Custom Domain

To use your custom domain `www.recipe-link-saver.harunawaizumi.space`, you need to:

### 1. DNS Configuration
Add a CNAME record in your DNS provider (where you manage `harunawaizumi.space`):

```
Type: CNAME
Name: www.recipe-link-saver
Value: www.recipe-link-saver.harunawaizumi.space.s3-website-ap-northeast-1.amazonaws.com
TTL: 300 (or your preferred value)
```

### 2. SSL Certificate (Optional but Recommended)
For HTTPS, you'll need to set up CloudFront with an SSL certificate:

1. **Request SSL Certificate** in AWS Certificate Manager (us-east-1 region)
2. **Create CloudFront Distribution** pointing to your S3 bucket
3. **Update DNS** to point to CloudFront instead of S3 directly

### 3. Test Your Setup
After DNS propagation (5-30 minutes), test:
- http://www.recipe-link-saver.harunawaizumi.space
- Your Recipe Link Saver should load with your custom domain!

## 🔧 Current Working URLs

- **S3 Direct**: http://www.recipe-link-saver.harunawaizumi.space.s3-website-ap-northeast-1.amazonaws.com
- **API Gateway**: https://p89aqlqn01.execute-api.ap-northeast-1.amazonaws.com/prod/
- **Login**: admin / password123

## 📝 Notes

- The bucket name MUST match your domain exactly for S3 static website hosting
- All files have been migrated from the old bucket
- The old bucket `recipe-link-saver-frontend` can be deleted once you confirm everything works