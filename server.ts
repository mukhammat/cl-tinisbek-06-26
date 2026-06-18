import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Set up server-side SQLite database
const SQLITE_DB_PATH = path.join(process.cwd(), 'data', 'pharmacy.db');

function initDb() {
  const dir = path.dirname(SQLITE_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const dbConnection = new Database(SQLITE_DB_PATH);
  dbConnection.pragma('journal_mode = WAL');
  
  dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY COLLATE NOCASE,
      password TEXT NOT NULL,
      fullName TEXT NOT NULL,
      phone TEXT,
      address TEXT
    );
    
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      userEmail TEXT NOT NULL,
      items TEXT NOT NULL,
      totalPrice REAL NOT NULL,
      address TEXT NOT NULL,
      paymentMethod TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
    );
  `);
  
  return dbConnection;
}

const db = initDb();

// Run seamless migration from old json db if detected
function migrateJsonToSqlite() {
  const jsonPath = path.join(process.cwd(), 'data', 'db.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (data.users && Array.isArray(data.users)) {
        const insertUser = db.prepare(`
          INSERT OR IGNORE INTO users (email, password, fullName, phone, address)
          VALUES (?, ?, ?, ?, ?)
        `);
        for (const u of data.users) {
          insertUser.run(u.email.toLowerCase(), u.password, u.fullName, u.phone || '', u.address || '');
        }
      }
      if (data.orders && Array.isArray(data.orders)) {
        const insertOrder = db.prepare(`
          INSERT OR IGNORE INTO orders (id, date, userEmail, items, totalPrice, address, paymentMethod, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const o of data.orders) {
          const itemsStr = typeof o.items === 'string' ? o.items : JSON.stringify(o.items);
          const addrStr = typeof o.address === 'string' ? o.address : JSON.stringify(o.address);
          insertOrder.run(o.id, o.date, o.userEmail.toLowerCase(), itemsStr, o.totalPrice, addrStr, o.paymentMethod, o.status || 'pending');
        }
      }
      fs.renameSync(jsonPath, jsonPath + '.migrated');
      console.log('Successfully migrated json database to SQLite!');
    } catch (e) {
      console.error('Error migrating JSON db to SQLite:', e);
    }
  }
}
migrateJsonToSqlite();

// Unified REST API Routes
// 1. Auth: Register
app.post('/api/auth/register', (req, res) => {
  const { email, password, fullName, phone, address } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Missing required registration info' });
  }

  try {
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    db.prepare(`
      INSERT INTO users (email, password, fullName, phone, address)
      VALUES (?, ?, ?, ?, ?)
    `).run(email.toLowerCase(), password, fullName, phone || '', address || '');

    res.json({
      email: email.toLowerCase(),
      fullName,
      phone: phone || '',
      address: address || '',
      isAuthenticated: true,
    });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// 2. Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password credentials' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email.toLowerCase(), password) as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      address: user.address,
      isAuthenticated: true,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// 3. Update Profile Data
app.post('/api/profile', (req, res) => {
  const { email, fullName, phone, address } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email parameter is required' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as any;
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const updatedName = fullName || user.fullName;
    const updatedPhone = phone || user.phone;
    const updatedAddress = address || user.address;

    db.prepare(`
      UPDATE users 
      SET fullName = ?, phone = ?, address = ?
      WHERE email = ?
    `).run(updatedName, updatedPhone, updatedAddress, email.toLowerCase());

    res.json({
      email: email.toLowerCase(),
      fullName: updatedName,
      phone: updatedPhone,
      address: updatedAddress,
      isAuthenticated: true,
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// 4. Place New Order
app.post('/api/orders', (req, res) => {
  const { email, items, totalPrice, address, paymentMethod } = req.body;
  if (!items || !totalPrice || !address) {
    return res.status(400).json({ error: 'Invalid cart or address details' });
  }

  try {
    const trackingNumber = 'PP-' + Math.floor(100000 + Math.random() * 900000);
    const dateStr = new Date().toLocaleDateString('ru-RU');
    const userEmailVal = email ? email.toLowerCase() : 'guest';
    const itemsStr = JSON.stringify(items);
    const addressStr = JSON.stringify(address);

    db.prepare(`
      INSERT INTO orders (id, date, userEmail, items, totalPrice, address, paymentMethod, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(trackingNumber, dateStr, userEmailVal, itemsStr, totalPrice, addressStr, paymentMethod);

    res.json({
      id: trackingNumber,
      date: dateStr,
      userEmail: userEmailVal,
      items,
      totalPrice,
      address,
      paymentMethod,
      status: 'pending',
    });
  } catch (err) {
    console.error('Place order error:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// 5. Get User Orders
app.get('/api/orders/:email', (req, res) => {
  const email = req.params.email;
  if (!email) {
    return res.status(400).json({ error: 'User email is required' });
  }

  try {
    const rows = db.prepare('SELECT * FROM orders WHERE userEmail = ? ORDER BY rowid DESC').all(email.toLowerCase()) as any[];
    
    const formattedOrders = rows.map((o) => ({
      id: o.id,
      date: o.date,
      items: JSON.parse(o.items),
      totalPrice: o.totalPrice,
      address: JSON.parse(o.address),
      paymentMethod: o.paymentMethod,
      status: o.status,
    }));

    res.json(formattedOrders);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Database error occurred' });
  }
});

// Initialize server-side Gemini client utility lazily
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: apiKey || 'dummy-key-to-prevent-crash',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// 6. Interactive AI Peptide Advisor
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'User message query is required' });
  }

  try {
    const ai = getGeminiClient();
    
    // System instruction injected with actual database information of the premium peptides
    const systemInstruction = `
You are the official clinical AI Peptide Advisor for the "Peptide Pharma" premium pharmacy.
Your primary role is to consult users on certified peptides, their features, safety precautions, reconstitution (dilution), dosages, and general wellness.

Our Active Peptide Catalog:
- Semaglutide 5mg: GLP-1 receptor agonist for weight loss, appetite regulation, and cardiovascular safety. Starter dose: 0.25mg subcutaneously once weekly. Price: 18,500 ₸.
- Tirzepatide 10mg: Advanced dual GIP/GLP-1 agonist, superior for deep body fat burning and insulin resistance optimization. Starter dose: 2.5mg subcutaneously once weekly. Price: 32,000 ₸.
- BPC-157 5mg: High-speed pentadecapeptide tissue protection and repair compound. Excellent for tendon, joint, gut mucosa, and musculoskeletal healing. Regular dose: 250-500 mcg daily. Price: 15,000 ₸.
- TB-500 5mg: Synthesized fragment of Thymosin Beta-4. Promotes blood vessels, heart tissue, and muscle fiber elasticity. Load phase: 2-5mg twice weekly. Maintenance: 2-4mg every fortnightly. Price: 16,500 ₸.
- Melanotan II 10mg: Advanced tanning peptide assisting deep bronze skin protection while balancing libido and capping appetite. Daily load: 150-300 mcg. Price: 14,000 ₸.
- Ipamorelin 5mg: Rejuvenating growth hormone secretagogue, boosting elasticity, sleep patterns, and clean muscles without retaining water. Dose: 100-200 mcg before bed. Price: 12,500 ₸.

Consultation Principles:
1. Provide accurate, extremely friendly, yet authoritative support. Use clear bullet points and simple instructions.
2. Adapt seamlessly based on customer language (Reply in Russian, English, or Arabic using beautiful grammar).
3. If asked about peptide reconstitution (dilution), explain mathematically: e.g. "If you add 2 ml of sterile water to a 5 mg Semaglutide vial, the concentration becomes 2.5 mg per ml. So drawing 10 units (0.1 ml) on an insulin U100 syringe will yield exactly 0.25 mg or 250 mcg." Keep calculations mathematically precise and easy to understand!
4. Always prefix or finalize with a friendly medical advice reminder: "While I calculate biological values exactly, please crosscheck your therapeutic routine with a licensed healthcare specialist."
`;

    // Map chat history safely to the expected GoogleGenAI format
    const formattedHistory = (history || []).map((chatMsg: any) => ({
      role: chatMsg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: chatMsg.text }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || 'Извините, я не смог обработать ваш запрос в данный момент. Пожалуйста, попробуйте еще раз.';
    res.json({ reply });
  } catch (error: any) {
    console.error('Gemini advisor endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI consultant response', 
      details: error?.message || String(error) 
    });
  }
});

// Vite server middleware or production fallback
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
