# EngagePro - Quick Start Runbook

This is a concise guide to get EngagePro running locally with Docker Compose.

## 🚀 Quick Setup (5 minutes)

### 1. Environment Setup
```bash
# Copy environment template
cp env.example .env

# Edit .env with your Google API credentials
nano .env
```

**Required Environment Variables:**
```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_PLACES_API_KEY="your-google-places-api-key"
NEXTAUTH_SECRET="any-random-string-here"
JWT_SECRET="any-random-string-here"
```

### 2. Start Services
```bash
# Start all services (web, worker, postgres, redis, maildev)
docker-compose up --build

# In separate terminal - setup database
docker-compose exec web npm run db:push
docker-compose exec web npm run db:seed

# In separate terminal - start worker
docker-compose exec worker npm run worker
```

### 3. Access Applications
- **Web App**: http://localhost:3000
- **MailDev**: http://localhost:1080 (for testing emails)

## 📧 Google API Setup (5 minutes)

### Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable APIs:
   - Google+ API
   - Gmail API  
   - Google Places API
3. **OAuth Consent Screen**:
   - External user type
   - Add scopes: `auth/userinfo.email`, `auth/userinfo.profile`, `gmail/send`, `gmail/readonly`
4. **Credentials**:
   - OAuth 2.0 Client ID (Web application)
   - Add redirect URIs: `http://localhost:3000/api/auth/callback/google`, `http://localhost:3000/api/auth/gmail/callback`
   - API Key (for Places API)

## 🎯 Testing Workflow

### 1. Create Campaign
```bash
# 1. Sign in at http://localhost:3000
# 2. Connect Gmail account (Email Accounts → Connect Gmail)
# 3. Create campaign (Campaigns → New Campaign)
# 4. Add email template with {{name}} placeholder
```

### 2. Import Leads
```bash
# 1. Go to Leads → Import Leads
# 2. Configure:
#    - Countries: ["United States"]
#    - Queries: ["restaurants"]
#    - Daily Limit: 10
# 3. Click "Start Import"
```

### 3. Start Campaign
```bash
# 1. Go to your campaign
# 2. Click "Start Campaign"
# 3. Check MailDev at http://localhost:1080 for sent emails
```

### 4. Verify Tracking
```bash
# 1. Open email in MailDev
# 2. Click any link → should redirect and log click
# 3. Open email → should log open event
# 4. Check campaign analytics for tracking data
```

## 🔧 Troubleshooting

### Common Issues
1. **Database connection failed**: Wait for postgres to fully start
2. **Google OAuth error**: Check redirect URIs match exactly
3. **Email not sending**: Verify Gmail OAuth is connected
4. **No leads imported**: Check Google Places API key and quota

### Reset Everything
```bash
# Stop and clean
docker-compose down -v
docker system prune -f

# Restart fresh
docker-compose up --build
docker-compose exec web npm run db:push
docker-compose exec web npm run db:seed
```

### Check Logs
```bash
# Web app logs
docker-compose logs web

# Worker logs  
docker-compose logs worker

# Database logs
docker-compose logs postgres
```

## 📊 Key Endpoints

- `GET /api/health` - System health check
- `POST /api/test/send` - Send test email
- `GET /api/leads` - List leads
- `POST /api/leads/import` - Import leads
- `POST /api/campaigns` - Create campaign
- `POST /api/campaigns/:id/start` - Start campaign

## 🎉 Success Indicators

✅ **System Running**: All services healthy at http://localhost:3000/api/health
✅ **Authentication**: Can sign in with Google
✅ **Email Sending**: Test emails appear in MailDev
✅ **Lead Import**: Google Places import creates leads
✅ **Campaign**: Can start campaign and see emails sent
✅ **Tracking**: Opens and clicks are recorded

## 🚨 Production Notes

⚠️ **Security**: This is development setup. For production:
- Use encrypted OAuth token storage
- Enable database SSL
- Set up proper monitoring
- Use managed services (RDS, ElastiCache)
- Implement rate limiting

---

**Total Setup Time**: ~15 minutes
**Dependencies**: Docker, Google Cloud account
