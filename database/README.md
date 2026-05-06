# Biometric Database Backend

This is a simple Node.js + Express + SQLite backend for storing and sharing biometric submissions.

## Endpoints

- `POST /submit` — Store a submission (PNG, tags, truth, x, y)
- `GET /submissions` — Retrieve all submissions

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Start the server:
   ```
   npm start
   ```

The server will run on port 3001 by default.
