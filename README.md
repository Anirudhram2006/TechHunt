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

## Setup
1. Install dependencies
   ```bash
   npm install
   ```
2. Configure env
   ```bash
   cp .env.example .env
   ```
3. Start MongoDB and run
   ```bash
   npm start
   ```

Default admin and demo test are seeded on first boot.
