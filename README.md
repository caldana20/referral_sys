# referral_sys

## Email Notifications Setup

This project uses **SendGrid** for sending transactional emails. SendGrid provides better deliverability, higher sending limits, and detailed analytics compared to SMTP-based solutions.

### SendGrid Setup

1. **Create a SendGrid Account**
   - Go to [sendgrid.com](https://sendgrid.com) and sign up for a free account
   - Free tier includes 100 emails/day (perfect for starting)

2. **Verify Your Sender Email**
   - In SendGrid dashboard, go to **Settings** > **Sender Authentication**
   - Verify your sender email address (e.g., `noreply@yourdomain.com`)
   - This is the email address that will appear as the sender

3. **Generate API Key**
   - Go to **Settings** > **API Keys**
   - Click **Create API Key**
   - Name it (e.g., "Cleaning Angels Production")
   - Select **Full Access** or **Restricted Access** with Mail Send permissions
   - Copy the API key (you'll only see it once!)

4. **Configure Environment Variables**
   - Create a `.env` file in the `server` directory if it doesn't exist
   - Add the following variables:

```env
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

**Note:** 
- `SENDGRID_FROM_EMAIL` must be a verified sender in your SendGrid account
- You can also use `EMAIL_USER` as a fallback for the sender email (for backward compatibility)
- The API key starts with `SG.` - make sure to include the full key
