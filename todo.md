# Project TODO

## Completed Features
- [x] Basic authentication system
- [x] Multi-step registration
- [x] Email verification
- [x] Community page
- [x] Friends system
- [x] Private messaging
- [x] Admin dashboard
- [x] File upload support
- [x] End-to-end encryption
- [x] VPN detection
- [x] Read receipts
- [x] Delete messages

## Current Bugs
- [x] Fix read receipt logic in FriendsMessaging component (line 148)



## New Bugs Reported
- [x] Fix client-side exception in Friends tab when user is logged in (fixed: restructured FriendsMessaging to match API response format)



## Current Issues
- [x] Update lastSeen when user opens Community page to show online status (added auto-update every 30s)


- [x] Auto-refresh friends list to show real-time online status (added 10s interval + lastSeen field in API)




## New Features Requested
- [x] Add Testimonies section to Admin Dashboard (already exists)
- [x] Add Support Requests section to Admin Dashboard (already exists)
- [x] Add User Management section to Admin Dashboard (already exists)
- [x] Add VPN Logs section to Admin Dashboard (already exists)
- [x] Show profile picture in all Community page sections
- [x] Add image upload button in Posts
- [x] Add delete message for both sides in private chat (like Messenger) - long press to delete
- [x] Implement end-to-end encryption for private messages (encrypted in database)
- [x] Add gender field in registration (male/female, non-editable)
- [x] Add country field in registration (non-editable)
- [x] Add statistics in Admin Dashboard: male/female count and country distribution

