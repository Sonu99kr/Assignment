## Suffragium – Real-Time Polling App

Live app: [`https://suffragium-frontend.vercel.app`](https://suffragium-frontend.vercel.app)

Suffragium is a real‑time polling application where anyone can quickly create a poll, share a link, and watch votes update live without page refresh. It consists of a React/Vite frontend and a Node.js/Express backend with MongoDB and Socket.io for real‑time updates.

### Features

- **Create time‑boxed polls**
  - Enter a question, add two or more options, and choose an expiry time in minutes.
  - Polls automatically become read‑only once the expiry time is reached.

- **Real‑time voting and live results**
  - Voters see options as buttons before voting.
  - After voting or when the poll ends, results are shown as percentages with animated progress bars.
  - Results update instantly across all connected clients via Socket.io.

- **Winner / tie summary when poll ends**
  - When a poll expires, the UI highlights the **winner** (highest votes).
  - If multiple options share the highest votes, the UI shows a **tie** message.
  - If a poll ends with **zero votes**, the UI shows a clear “no votes” message.

- **Link‑based sharing**
  - Each poll gets a unique URL (e.g. `/poll/:id`).
  - Share via the native Web Share API when available, or automatically copy the link to the clipboard as a fallback.

- **Friendly invalid/expired poll handling**
  - If a user opens a poll link that is missing/invalid/expired, the app shows a dedicated **“Poll Not Found”** screen with a CTA to create a new poll.

- **Client‑side “one vote per device”**
  - Each browser is assigned a random `voterId` stored in `localStorage`.
  - The backend stores `votersIds` per poll and blocks duplicate votes for the same `voterId`.

- **Automatic poll expiry and cleanup**
  - Each poll stores an `expiresAt` timestamp.
  - The API refuses new votes once the poll has expired.
  - MongoDB TTL index is used on `expiresAt` to let the database automatically remove expired polls.

- **Basic rate limiting**
  - Backend rate limiter on the vote endpoint reduces abuse from rapid repeated vote attempts from the same client/IP.

- **SPA routing support for deployment**
  - Includes a Vercel rewrite config (`poll-frontend/vercel.json`) so direct visits to routes like `/poll/:id` work correctly.

### Architecture

- **Frontend (`poll-frontend`)**
  - React 19 with Vite build tooling.
  - React Router for routing between:
    - `/` → `CreatePoll` page.
    - `/poll/:id` → `PollPage` (vote & results).
  - Axios for HTTP calls to the backend (`VITE_API_URL`).
  - Socket.io client for subscribing to real‑time poll updates.
  - Tailwind‑style utility classes for a modern dark theme UI.
  - Vercel SPA rewrite config via `vercel.json`.

- **Backend (`poll-backend`)**
  - Node.js + Express server (`server.js`).
  - MongoDB via Mongoose, with:
    - `poll` model containing `question`, `options[]`, `votersIds[]`, and `expiresAt`.
    - Sub‑schema for poll options consisting of `text` and `votes`.
    - TTL index on `expiresAt` for automatic deletion of expired polls.
  - Socket.io server layered on top of the HTTP server:
    - Clients join a room per poll via `joinPoll`.
    - When votes change, an updated poll is broadcast to that room using `pollUpdated`.
  - REST API routes (`Routes/pollRoute.js`):
    - `POST /api/polls` – create a new poll.
    - `POST /api/polls/:id/vote` – cast a vote.
    - `GET /api/polls/:id` – fetch current poll state.
  - CORS configured to allow the deployed frontend origin and credentials.

- **Data flow**
  - **Create flow**
    - User fills the form on `/` and submits.
    - Frontend posts `{ question, options, expiresIn }` to `POST /api/polls`.
    - Backend validates inputs, computes `expiresAt`, stores the poll, and returns the full poll JSON (including `_id`).
    - Frontend redirects the creator to `/poll/:id`.
  - **Vote flow**
    - Poll page loads via `GET /api/polls/:id`.
    - Client ensures a persistent `voterId` in `localStorage`.
    - User selects an option; frontend posts `{ optionIndex, voterId }` to `POST /api/polls/:id/vote`.
    - Backend validates the vote, updates counts, pushes `voterId`, saves the document, and emits `pollUpdated` to the poll’s Socket.io room.
    - All connected clients subscribed to that poll receive the updated poll in real time.

### Tech Stack

- **Frontend**
  - React 19
  - Vite
  - React Router
  - Axios
  - Socket.io client
  - Tailwind‑style CSS utilities (via Tailwind tooling)

- **Backend**
  - Node.js
  - Express 5
  - Mongoose 9
  - Socket.io 4
  - express-rate-limit
  - dotenv

- **Database**
  - MongoDB with TTL index on `expiresAt`.

### Fairness / Anti‑Abuse Mechanisms

- **1) Device‑level duplicate‑vote protection**
  - Each browser gets a random `voterId` stored in `localStorage`.
  - The `poll` document maintains a `votersIds` array listing who has already voted.
  - When a vote request is received, the backend:
    - Rejects the request if `voterId` is missing.
    - Checks whether `voterId` is already present in `votersIds`.
    - Returns a `400` error with a clear message (`"you have already voted."`) when a repeat is detected.

- **2) Rate limiting on vote endpoint**
  - The `/api/polls/:id/vote` route is wrapped in an `express-rate-limit` middleware (`voteLimiter`).
  - Configuration:
    - 60‑second sliding window.
    - Maximum 10 requests per window.
    - Excess requests receive a structured JSON message: `"Too many vote attempts. Please try again later."`
  - This helps reduce brute‑force or spammy voting attempts from a single client/IP.

### Edge Cases Handled

- **Poll creation validation**
  - Rejects polls without a question or with fewer than two options.
  - Rejects polls with missing or non‑positive expiry duration (`expiresIn`).

- **Vote validation**
  - Rejects votes for:
    - Non‑existent poll IDs (`404`).
    - Polls that have already expired (based on `expiresAt` and current time).
    - Missing `voterId`.
    - Invalid `optionIndex` (undefined, negative, or out of range).
  - Returns clear JSON error messages for all of the above.

- **Expired/invalid poll links**
  - If fetching a poll returns “not found” (e.g. invalid ID or TTL‑deleted poll), the UI shows a dedicated “Poll Not Found” page instead of a broken screen.

- **Poll expiry behavior**
  - When the countdown reaches zero on the client, the UI:
    - Marks the poll as ended.
    - Disables further voting interactions.
  - Backend also checks `expiresAt` to prevent late votes even if the client is outdated or manipulated.

- **Winner/tie/no‑votes outcomes**
  - Winner and tie detection is handled on the client after expiry.
  - If a poll ends with zero votes, the UI explicitly calls that out.

- **Resilience of real‑time updates**
  - On initial load, the poll is fetched via HTTP (so the page still works if the WebSocket is briefly unavailable).
  - Subsequent updates come via the `pollUpdated` Socket.io event, keeping the UI in sync across clients.

- **Share and clipboard fallbacks**
  - Uses the Web Share API when available.
  - Falls back to copying the link to clipboard and showing a user‑friendly alert otherwise.

### Known Limitations / Future Improvements

- **Device‑based identity is weak**
  - Current “one vote per user” relies on `localStorage` and can be bypassed by clearing storage, using incognito windows, or changing devices.
  - **Potential improvement**: add stronger identity or session mechanisms (e.g. login, magic links, or signed tokens) and/or IP + fingerprint‑based heuristics.

- **Rate limiting is coarse**
  - Rate limiting is applied per IP/window and does not distinguish between legitimate high‑traffic scenarios and abuse.
  - **Potential improvement**: dynamic or user‑level rate limits, anomaly detection, and better feedback/observability around abuse.

- **No admin/creator view**
  - The creator has no special controls such as manually ending a poll, editing options, or viewing detailed analytics.
  - **Potential improvement**: add a creator dashboard with advanced controls and statistics.

- **Limited error and state handling on the client**
  - Errors from the API are shown mostly via `alert()` and the UI does not distinguish between network failures, server errors, or validation issues beyond a simple message.
  - **Potential improvement**: add richer toasts, loading states, and dedicated error views.

- **Security hardening**
  - The backend trusts the `origin` configured in CORS and relies on environment variables for the MongoDB connection string and port.
  - **Potential improvement**: add input sanitization, improved logging/monitoring, and stricter CORS/helmet configuration.

### Local Development

- **Backend**
  - Install dependencies: `cd poll-backend && npm install`.
  - Create a `.env` file with at least:
    - `MONGODB_URI=<your-mongodb-uri>`
    - `PORT=4000` (or your preferred port)
  - Run: `npm start`.

- **Frontend**
  - Install dependencies: `cd poll-frontend && npm install`.
  - Create a `.env` file with:
    - `VITE_API_URL=http://localhost:4000` (or your backend URL)
  - Run the dev server: `npm run dev`.

Then open the printed Vite URL in your browser, create a poll, and share the generated `/poll/:id` link to start collecting live votes.
