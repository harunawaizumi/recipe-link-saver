# Recipe Link Saver

Web application for saving and organizing recipe links with automatic metadata extraction.

## Overview

Save recipe URLs from any website with automatic title and image extraction. Features search, rating system, and memo functionality.

**Live App**: http://www.recipe-link-saver.harunawaizumi.space/

## Features

- Automatic recipe title and image extraction
- Real-time URL preview before saving
- Search and sort recipes by title, domain, rating
- 5-star rating system with Japanese labels
- Personal memos for each recipe
- Responsive design for all devices

## AWS Architecture

```
Frontend (S3) → API Gateway → Lambda Functions → RDS MySQL
```

### AWS Services Used

- **Amazon S3** - Static website hosting
- **API Gateway** - REST API management  
- **AWS Lambda** - Serverless backend functions
- **RDS MySQL** - Recipe database storage
- **Parameter Store** - Secure configuration storage
- **CloudFormation** - Infrastructure as Code

### Lambda Functions

- `GetRecipesFunction` - Retrieve recipes (public)
- `CreateRecipeFunction` - Add recipes (auth required)
- `UpdateRecipeFunction` - Edit recipes (auth required) 
- `DeleteRecipeFunction` - Remove recipes (auth required)
- `AdminAuthFunction` - JWT authentication
- `ExtractMetaFunction` - URL metadata extraction

## Tech Stack

**Frontend**: Vanilla JavaScript, CSS3, HTML5  
**Backend**: Node.js 18.x, Express.js, MySQL  
**Security**: JWT authentication, input validation  
**Deployment**: AWS SAM, CloudFormation

## Database Schema

```sql
CREATE TABLE recipes (
    id VARCHAR(36) PRIMARY KEY,
    url TEXT NOT NULL,
    title VARCHAR(500),
    domain VARCHAR(255),
    memo TEXT,
    rating ENUM('未定', '微妙', 'まあまあ', '満足', '絶対リピ！'),
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Deployment

**Region**: ap-northeast-1 (Tokyo)  
**API**: https://p89aqlqn01.execute-api.ap-northeast-1.amazonaws.com/prod/  
**Stack**: recipe-link-saver-api-1762051957