# 📧 Email Distribution Guide

## Overview

The project uses **two separate email accounts** for different purposes to ensure better organization, security, and deliverability.

---

## 📨 Email Account #1: OTP & Verification

**Purpose:** User authentication and password recovery

### Configuration
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-main-email@gmail.com
EMAIL_PASS=your-app-password
```

### Functions (from `/lib/utils/email.ts`)

#### 1. `sendVerificationCode()`
- **When:** New user registration
- **Subject:** "Light of Life - Verification Code"
- **Content:** 6-digit verification code
- **Validity:** 10 minutes

#### 2. `sendPasswordResetCode()`
- **When:** User requests password reset
- **Subject:** "Light of Life - Password Reset Code"
- **Content:** 6-digit reset code with security warnings
- **Validity:** 10 minutes

#### 3. `sendLoginVerificationCode()`
- **When:** Login from new device/location (if enabled)
- **Subject:** "Light of Life - Login Verification Code"
- **Content:** 6-digit login verification code
- **Validity:** 10 minutes

#### 4. `generateVerificationCode()`
- **Purpose:** Generate cryptographically secure 6-digit codes
- **Method:** Uses Node.js `crypto.randomInt()`

---

## 🔐 Email Account #2: Security Alerts

**Purpose:** Security notifications and threat alerts

### Configuration
```env
VPN_EMAIL_SERVICE=gmail
VPN_EMAIL_USER=secure.team.lightoflife@gmail.com
VPN_EMAIL_PASS=yrodbbwthpprbhqw
```

### Functions (from `/lib/security-email.ts`)

#### 1. `sendVPNAlert()`
- **When:** VPN/Proxy/Tor detected
- **Subject:** "⚠️ Security Warning - VPN/Proxy Detected"
- **Content:** 
  - Detection details (IP, Location, ISP, Type)
  - Risk score and threat level
  - 4 reasons why VPN is blocked
  - 3 steps to resolve
- **Action:** User must disable VPN to access content

#### 2. `sendAccountLockoutAlert()`
- **When:** Account locked after 5 failed login attempts
- **Subject:** "🔒 Account Locked - Multiple Failed Login Attempts"
- **Content:**
  - Number of failed attempts
  - Lockout duration (30 minutes)
  - 3 steps to resolve
  - Security tips
- **Action:** User must wait or contact support

#### 3. `sendPasswordChangedAlert()`
- **When:** User successfully changes password
- **Subject:** "🔑 Password Changed Successfully"
- **Content:**
  - Change confirmation
  - IP address and location
  - Timestamp
  - Warning if user didn't make the change
- **Action:** Contact support if unauthorized

#### 4. `sendSuspiciousActivityAlert()`
- **When:** Suspicious activity detected
- **Subject:** "🚨 Suspicious Activity Detected"
- **Content:**
  - Activity details
  - IP address and location
  - Timestamp
  - Security recommendations
- **Action:** Review account and change password

---

## 🎨 Email Design

### OTP Emails (Account #1)
- **Colors:** Purple gradient (#667eea → #764ba2)
- **Style:** Friendly and welcoming
- **Logo:** Light of Life dove logo
- **Tone:** Encouraging and spiritual

### Security Emails (Account #2)
- **Colors:** Varies by severity
  - 🔴 Red: Critical (VPN, Account Lockout)
  - 🟢 Green: Informational (Password Changed)
  - 🟡 Yellow: Warning (Suspicious Activity)
- **Style:** Professional and authoritative
- **Logo:** Light of Life dove logo
- **Tone:** Serious and security-focused

---

## 📊 Email Limits

### Gmail Limits
- **Account #1 (OTP):** 500 emails/day
- **Account #2 (Security):** 500 emails/day

### Expected Usage
| Email Type | Estimated Daily Volume |
|-----------|----------------------|
| Verification Codes | 50-100 |
| Password Reset | 10-20 |
| Login Verification | 20-30 |
| VPN Alerts | 5-10 |
| Account Lockout | 2-5 |
| Password Changed | 1-3 |
| Suspicious Activity | 0-2 |

**Total:** ~90-170 emails/day (well within limits)

---

## 🔧 Setup Instructions

### 1. Configure Account #1 (OTP)

1. Go to your Gmail account settings
2. Enable 2-Step Verification
3. Generate App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other"
   - Copy the generated password
4. Add to Vercel Environment Variables:
   ```
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

### 2. Configure Account #2 (Security)

1. Use: `secure.team.lightoflife@gmail.com`
2. App Password: `yrodbbwthpprbhqw` (already configured)
3. Already added to Vercel:
   ```
   VPN_EMAIL_SERVICE=gmail
   VPN_EMAIL_USER=secure.team.lightoflife@gmail.com
   VPN_EMAIL_PASS=yrodbbwthpprbhqw
   ```

---

## ✅ Benefits of Dual Email System

### 1. **Better Organization**
- Separate inboxes for different purposes
- Easier to track and manage emails
- Clear separation of concerns

### 2. **Improved Deliverability**
- Reduces spam risk
- Better sender reputation
- Higher email delivery rates

### 3. **Enhanced Security**
- Security alerts stand out
- Users can easily identify critical emails
- Reduces phishing risk

### 4. **Scalability**
- Can handle more emails
- Distributes load across accounts
- Room for growth

### 5. **Professional Appearance**
- Dedicated security email address
- Builds trust with users
- Shows commitment to security

---

## 🧪 Testing

### Test OTP Emails
```bash
# Register new account
POST /api/auth/register
# Check EMAIL_USER inbox

# Request password reset
POST /api/auth/forgot-password
# Check EMAIL_USER inbox
```

### Test Security Emails
```bash
# Test VPN detection
# 1. Enable VPN
# 2. Login to account
# 3. Check VPN_EMAIL_USER inbox

# Test account lockout
# 1. Try wrong password 5 times
# 2. Check VPN_EMAIL_USER inbox
```

---

## 📝 Migration Status

| Feature | Old System | New System | Status |
|---------|-----------|-----------|--------|
| Verification Codes | ✅ EMAIL_USER | ✅ EMAIL_USER | ✅ No change |
| Password Reset | ✅ EMAIL_USER | ✅ EMAIL_USER | ✅ No change |
| VPN Alerts | ❌ Not implemented | ✅ VPN_EMAIL_USER | ✅ Migrated |
| Account Lockout | ✅ EMAIL_USER | ✅ VPN_EMAIL_USER | ✅ Migrated |
| Password Changed | ❌ Not implemented | ✅ VPN_EMAIL_USER | ✅ Added |
| Suspicious Activity | ❌ Not implemented | ✅ VPN_EMAIL_USER | ✅ Added |

---

## 🎯 Summary

### Account #1 (OTP) - `EMAIL_USER`
**Purpose:** Authentication & Recovery
- ✅ Verification codes
- ✅ Password reset codes
- ✅ Login verification codes

### Account #2 (Security) - `VPN_EMAIL_USER`
**Purpose:** Security & Alerts
- ✅ VPN detection alerts
- ✅ Account lockout notifications
- ✅ Password change confirmations
- ✅ Suspicious activity warnings

**All emails are now properly distributed and working! 🎉**
