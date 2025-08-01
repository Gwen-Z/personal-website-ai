import express from 'express';
import cors from 'cors';
import { initDB } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

let db;

app.post('/api/record', async (req, res) => {
  const { type, value, note = '', date } = req.body;
  if (!type || value === undefined || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  await db.run('INSERT INTO records (type, value, note, date) VALUES (?, ?, ?, ?)', [type, value, note, date]);
  res.status(201).json({ message: 'Record added successfully' });
});

app.get('/api/records', async (req, res) => {
  const rows = await db.all('SELECT * FROM records ORDER BY date DESC');
  res.json(rows);
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  db = await initDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer(); 