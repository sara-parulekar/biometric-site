const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Database ────────────────────────────────────────────────────────────────
const db = new sqlite3.Database(path.join(__dirname, "biometric.db"));

db.run(`
  CREATE TABLE IF NOT EXISTS submissions (
    id         TEXT PRIMARY KEY,
    png        TEXT NOT NULL,
    tags       TEXT NOT NULL DEFAULT '[]',
    truth      TEXT NOT NULL DEFAULT '',
    x          REAL NOT NULL,
    y          REAL NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  )
`);

// ── Middleware ───────────────────────────────────────────────────────────────
// Enable CORS for all routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: "5mb" }));    // png is a base64 data URL
app.use(express.static(__dirname));         // serves biometric.html

// ── API ──────────────────────────────────────────────────────────────────────

// POST /api/submissions — store a new biometric entry
app.post("/api/submissions", (req, res) => {
  const { id, png, tags, truth, x, y } = req.body;

  if (!id || !png || x == null || y == null) {
    return res.status(400).json({ error: "id, png, x, and y are required" });
  }
  if (typeof x !== "number" || typeof y !== "number" || x < 0 || x > 100 || y < 0 || y > 100) {
    return res.status(400).json({ error: "x and y must be numbers between 0 and 100" });
  }

  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
  const safetruth = typeof truth === "string" ? truth.slice(0, 500) : "";

  db.run(
    `INSERT INTO submissions (id, png, tags, truth, x, y)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, png, tagsJson, safetruth, x, y],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(409).json({ error: "id already exists" });
        }
        console.error(err);
        return res.status(500).json({ error: "database error" });
      }
      res.status(201).json({ ok: true, id });
    }
  );
});

// GET /api/submissions — return all submissions (newest first)
app.get("/api/submissions", (req, res) => {
  db.all(
    `SELECT id, png, tags, truth, x, y, created_at
     FROM submissions
     ORDER BY created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "database error" });
      }
      const submissions = rows.map(row => ({
        id: row.id,
        png: row.png,
        tags: JSON.parse(row.tags),
        truth: row.truth,
        x: row.x,
        y: row.y,
      }));
      res.json(submissions);
    }
  );
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`biometric server running at http://localhost:${PORT}`);
});
