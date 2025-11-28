# referral_sys

## Email Notifications Setup

This project uses `nodemailer` with Gmail/Google Workspace SMTP to send email notifications to admins when new estimates are requested.

### Configuration

1.  Create a `.env` file in the `server` directory if it doesn't exist.
2.  Add the following variables:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
```

**Note:** Do not use your regular Gmail password. You must generate an **App Password**:
1.  Go to your Google Account settings.
2.  Navigate to Security > 2-Step Verification.
3.  Scroll to the bottom and select "App passwords".
4.  Create a new app password (e.g., named "Referral System").
5.  Use that 16-character code as your `EMAIL_PASS`.
