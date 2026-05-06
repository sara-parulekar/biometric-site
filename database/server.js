const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');

const app = express();
const db = new sqlite3.Database('./submissions.db');

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Create table if not exists
const initSql = `CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  png TEXT NOT NULL,
  tags TEXT NOT NULL,
  truth TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;
db.run(initSql);

// POST /submit
app.post('/submit', (req, res) => {
  const { png, tags, truth, x, y } = req.body;
  if (!png || !tags || typeof truth !== 'string' || typeof x !== 'number' || typeof y !== 'number') {
    return res.status(400).json({ error: 'Invalid submission' });
  }
  db.run(
    'INSERT INTO submissions (png, tags, truth, x, y) VALUES (?, ?, ?, ?, ?)',
    [png, JSON.stringify(tags), truth, x, y],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// GET /submissions
app.get('/submissions', (req, res) => {
  db.all('SELECT * FROM submissions ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // Parse tags JSON
    rows.forEach(row => { row.tags = JSON.parse(row.tags); });
    res.json(rows);
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
