# EngagePro - Email Marketing & Prospect Outreach Platform

A complete, production-ready email marketing and prospect outreach platform built with modern technologies. Features lead management, campaign automation, email tracking, and comprehensive analytics.

## 🚀 Features

- **Lead Management**: Import leads from Google Places, manual entry, and automated enrichment
- **Campaign Builder**: Multi-step email sequences with conditional follow-ups
- **Email Tracking**: Open tracking, link tracking, and bounce detection
- **Analytics Dashboard**: Comprehensive metrics and reporting
- **Gmail Integration**: Send emails via Gmail API with OAuth authentication
- **Background Processing**: BullMQ-powered job queue for reliable email delivery
- **Multi-user Support**: Secure authentication with role-based access

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Queue System**: BullMQ with Redis
- **Authentication**: NextAuth.js with Google OAuth
- **Email**: Gmail API
- **Deployment**: Docker & Docker Compose

## 📋 Prerequisites

- Docker and Docker Compose
- Google Cloud Platform account (for OAuth and Places API)
- Node.js 18+ (for local development)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd EngagePro
cp env.example .env
```

### 2. Google API Setup

#### Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Google+ API
   - Gmail API
   - Google Places API

#### Configure OAuth Consent Screen
1. Go to "OAuth consent screen"
2. Choose "External" user type
3. Fill in required fields:
   - App name: EngagePro
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   - `auth/userinfo.email`
   - `auth/userinfo.profile`
   - `gmail/send`
   - `gmail/readonly`

#### Create OAuth Credentials
1. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
2. Application type: Web application
3. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `http://localhost:3000/api/auth/gmail/callback`
4. Copy Client ID and Client Secret

#### Get Google Places API Key
1. Go to "Credentials" → "Create Credentials" → "API Key"
2. Restrict the key to Google Places API
3. Copy the API key

### 3. Environment Configuration

Edit `.env` file:

```env
# Database
DATABASE_URL="postgresql://engagepro:engagepro_password@localhost:5432/engagepro"

# Redis
REDIS_URL="redis://localhost:6379"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key-here"

# Google OAuth (for user authentication)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Gmail OAuth (for email sending)
GMAIL_OAUTH_REDIRECT="http://localhost:3000/api/auth/gmail/callback"

# JWT Secret for tracking signatures
JWT_SECRET="your-jwt-secret-key-here"

# App Configuration
APP_URL="http://localhost:3000"

# Google Places API (for lead ingestion)
GOOGLE_PLACES_API_KEY="your-google-places-api-key"

# SMTP Configuration (for development - uses MailDev)
SMTP_HOST="localhost"
SMTP_PORT="1025"

# Development flags
NODE_ENV="development"
```

### 4. Start the Application

```bash
# Start all services
docker-compose up --build

# In separate terminals, run:
# Database migrations and seeding
docker-compose exec web npm run db:push
docker-compose exec web npm run db:seed

# Start the worker process
docker-compose exec worker npm run worker
```

### 5. Access the Application

- **Web App**: http://localhost:3000
- **MailDev** (Email Testing): http://localhost:1080
- **Database**: localhost:5432
- **Redis**: localhost:6379

## 📖 Usage Guide

### 1. Authentication
- Visit http://localhost:3000
- Click "Sign In" and authenticate with Google
- You'll be redirected to the dashboard

### 2. Connect Gmail Account
- Go to "Email Accounts" in the sidebar
- Click "Connect Gmail Account"
- Complete OAuth flow to authorize email sending

### 3. Import Leads
- Go to "Leads" → "Import Leads"
- Configure search criteria:
  - Countries: e.g., ["United States", "Canada"]
  - Search queries: e.g., ["restaurants", "coffee shops"]
  - Daily limit: e.g., 100
- Click "Start Import" to queue the job

### 4. Create Campaign
- Go to "Campaigns" → "New Campaign"
- Set up filters to target specific leads
- Add campaign steps with email templates
- Configure follow-up conditions and delays

### 5. Start Campaign
- Go to your campaign and click "Start Campaign"
- Monitor progress in the campaign dashboard
- View analytics and tracking data

### 6. Monitor Results
- Check the dashboard for overall metrics
- View detailed analytics for each campaign
- Monitor email delivery and engagement rates

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test Email Sending
1. Ensure MailDev is running (http://localhost:1080)
2. Use the test email endpoint:
```bash
curl -X POST http://localhost:3000/api/test/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "body": "<h1>Hello World!</h1>"
  }'
```

### Simulate Bounces
1. Send emails to invalid addresses (e.g., `invalid@nonexistentdomain.com`)
2. Check MailDev for bounce messages
3. Verify bounce detection in the dashboard

## 📊 Database Schema

### Key Models
- **User**: Authentication and user data
- **Lead**: Prospect information with enrichment data
- **Campaign**: Email campaign configuration
- **CampaignStep**: Individual email steps in sequences
- **Activity**: Email events (sent, opened, clicked, bounced)
- **TrackingClick/Open**: Detailed tracking data
- **EmailAccount**: Connected Gmail accounts

### Relationships
- Users have many Leads, Campaigns, and EmailAccounts
- Campaigns have many Steps and Runs
- Leads have many Activities and tracking events
- Activities link Leads to Campaigns and Steps

## 🔧 API Endpoints

### Authentication
- `GET /api/auth/[...nextauth]` - NextAuth endpoints

### Leads
- `GET /api/leads` - List leads with filtering
- `POST /api/leads` - Create new lead
- `GET /api/leads/[id]` - Get lead details
- `PUT /api/leads/[id]` - Update lead
- `DELETE /api/leads/[id]` - Delete lead
- `POST /api/leads/import` - Start lead import job
- `POST /api/leads/[id]/enrich` - Trigger lead enrichment

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/[id]` - Get campaign details
- `PUT /api/campaigns/[id]` - Update campaign
- `DELETE /api/campaigns/[id]` - Delete campaign
- `POST /api/campaigns/[id]/start` - Start campaign
- `POST /api/campaigns/[id]/stop` - Stop campaign
- `GET /api/campaigns/[id]/analytics` - Campaign analytics

### Email Accounts
- `GET /api/email-accounts` - List connected accounts
- `POST /api/email-accounts/connect` - Connect Gmail account
- `DELETE /api/email-accounts` - Disconnect account

### Tracking
- `GET /api/track/open?id=<id>&sig=<signature>` - Email open tracking
- `GET /r/[hash]` - Link click tracking and redirect

### Utilities
- `POST /api/test/send` - Send test email
- `GET /api/health` - Health check

## 🔄 Background Jobs

### Job Types
- **Email Sending**: Process queued emails with tracking
- **Lead Enrichment**: Find missing email addresses
- **Google Places Import**: Fetch leads from Google Places
- **Campaign Follow-ups**: Send follow-up emails based on conditions
- **Bounce Detection**: Check for bounced emails

### Job Scheduling
- Daily Google Places import at 2 AM
- Hourly bounce detection
- Random delays for email sending (configurable per campaign step)

## 🔒 Security Features

### Authentication & Authorization
- Google OAuth for user authentication
- JWT tokens for API authentication
- User-scoped data access (users only see their own data)

### Email Security
- HMAC signatures for tracking endpoints
- Secure OAuth token storage
- Rate limiting on external API calls

### Data Protection
- Input validation and sanitization
- SQL injection prevention via Prisma
- XSS protection in email templates

## 🚀 Production Deployment

### Environment Variables
Update `.env` for production:
```env
NEXTAUTH_URL="https://yourdomain.com"
DATABASE_URL="your-production-database-url"
REDIS_URL="your-production-redis-url"
# ... other production values
```

### Security Considerations
1. **OAuth Tokens**: Use encrypted storage (AWS KMS, Azure Key Vault)
2. **Database**: Enable SSL and use strong credentials
3. **Rate Limiting**: Implement API rate limiting
4. **Monitoring**: Set up logging and monitoring
5. **Backup**: Regular database backups

### Scaling
- Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
- Use managed Redis (AWS ElastiCache, Google Memorystore)
- Consider horizontal scaling with multiple worker instances
- Use CDN for static assets

## 🛠️ Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start worker (in separate terminal)
npm run worker

# Run tests
npm test

# Database operations
npm run db:push    # Push schema changes
npm run db:migrate # Create migration
npm run db:seed    # Seed database
npm run db:studio  # Open Prisma Studio
```

### Project Structure
```
src/
├── app/                 # Next.js app router
│   ├── api/            # API routes
│   ├── auth/           # Authentication pages
│   └── dashboard/      # Dashboard pages
├── components/         # React components
├── lib/               # Utility libraries
├── worker/            # Background job workers
├── types/             # TypeScript type definitions
└── __tests__/         # Test files
```

## 📈 Monitoring & Analytics

### Built-in Analytics
- Campaign performance metrics
- Email delivery rates
- Open and click tracking
- Lead engagement history

### Key Metrics
- **Open Rate**: Unique opens / emails sent
- **Click Rate**: Clicks / opens
- **Bounce Rate**: Bounced emails / emails sent
- **Delivery Rate**: Delivered emails / emails sent

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the documentation above
2. Review the test files for usage examples
3. Open an issue on GitHub

## 🔮 Future Enhancements

- Advanced segmentation and personalization
- A/B testing for email campaigns
- Integration with CRM systems
- Advanced analytics and reporting
- Mobile app for campaign management
- Webhook support for real-time updates
- Advanced email templates with drag-and-drop builder
- Integration with social media platforms
- Advanced lead scoring and qualification

---

**⚠️ Important Notes:**

1. **Development Only**: OAuth tokens are stored in plaintext for development. Use encrypted storage in production.

2. **Rate Limits**: Google Places API has usage limits and billing. Monitor your usage.

3. **Email Deliverability**: Follow email best practices to maintain good deliverability rates.

4. **Legal Compliance**: Ensure compliance with GDPR, CAN-SPAM, and other email marketing regulations.

5. **Testing**: Always test email campaigns with small batches before large sends.