# TechHunt - Secure Online MCQ Examination Platform

Secure web-based MCQ exam system for college tests, hackathon screening, and internal assessments with strict role separation and anti-cheating controls.

## Stack
- Frontend: HTML/CSS/JavaScript
- Backend: Node.js + Express
- Database: MongoDB + Mongoose

## Role Isolation
- **Participant UI**: `/` (registration), `/test/:testId` (exam), `/result/:testId` (result)
- **Admin UI (hidden)**: `/admin-login`, `/admin-dashboard`
- Participant interface does not expose admin routes.
- Admin routes are protected with JWT RBAC middleware, and unauthorized access shows `Unauthorized Access`.

## Admin Features
- Create / Edit / Delete tests
- Configure duration, question count, review settings, randomization settings
- Add MCQ questions with 4 options and correct answer index
- View participants and scores
- Leaderboard endpoint (top results)
- Download results as CSV

## Participant Features
- Register with name and email
- Single-attempt enforcement (email + testId)
- Full-screen exam start
- One question per view with:
  - Next/Previous
  - Question navigation panel
  - Progress bar
  - Countdown timer
- Manual submit with confirmation dialog
- Auto-submit on timer end

## Anti-Cheating
- Disable right-click, selection, Ctrl+C/V/X/A/U/R, Ctrl+Shift+I, F12
- Detect tab switching / window blur
- Detect fullscreen exit
- Detect back navigation and refresh/close attempts
- Violation handling:
  - Violation 1: warning
  - Violation 2: warning
  - Violation 3: auto-submit + block

## Data Stored
- Admins
- Tests (questions + rules)
- Participants (attempt, answers, score, percentage, violations)
- Responses
- Results
- ViolationLogs

## Setup (Windows / Local)
1. Install dependencies
   ```bash
   npm install
   ```
2. Configure env
   ```bash
   copy .env.example .env
   ```
3. Choose one database mode in `.env`:
   - `DB_MODE=mongo` + set `MONGO_URI` if you have MongoDB
   - `DB_MODE=memory` if you **do not have MongoDB** (dev/demo mode using mongodb-memory-server)
4. Start app
   ```bash
   npm start
   ```

## If you don't have MongoDB
Set:
```env
DB_MODE=memory
```
This starts an in-memory MongoDB automatically. No MongoDB installation required, but data is temporary and resets when the app restarts.

## Hosting (quick)
- Render / Railway / Azure App Service supported.
- For production, use `DB_MODE=mongo` with MongoDB Atlas.
- Keep strong `JWT_SECRET` and secure environment variables.

Default admin and demo test are seeded on first boot.
