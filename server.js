const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Database ────────────────────────────────────────────────────────────────
const db = new Database(path.join(__dirname, "biometric.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id         TEXT PRIMARY KEY,
    png        TEXT NOT NULL,
    tags       TEXT NOT NULL DEFAULT '[]',
    truth      TEXT NOT NULL DEFAULT '',
    x          REAL NOT NULL,
    y          REAL NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`);

// ── Middleware ───────────────────────────────────────────────────────────────
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

  try {
    db.prepare(`
      INSERT INTO submissions (id, png, tags, truth, x, y)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, png, tagsJson, safetruth, x, y);
    res.status(201).json({ ok: true, id });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
      return res.status(409).json({ error: "id already exists" });
    }
    console.error(err);
    res.status(500).json({ error: "database error" });
  }
});

// GET /api/submissions — return all submissions (newest first)
app.get("/api/submissions", (req, res) => {
  const rows = db.prepare(`
    SELECT id, png, tags, truth, x, y, created_at
    FROM submissions
    ORDER BY created_at DESC
  `).all();

  const submissions = rows.map(row => ({
    id: row.id,
    png: row.png,
    tags: JSON.parse(row.tags),
    truth: row.truth,
    x: row.x,
    y: row.y,
  }));

  res.json(submissions);
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`biometric server running at http://localhost:${PORT}`);
});
