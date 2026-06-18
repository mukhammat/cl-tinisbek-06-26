import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Set up server-side database path
const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

// Ensure db.json exists with blank schema
function initDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], orders: [] }, null, 2));
  }
}
initDb();

function readDb() {
  try {
    initDb();
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading DB:', error);
    return { users: [], orders: [] };
  }
}

function writeDb(data: any) {
  try {
    initDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing DB:', error);
  }
}

// Unified REST API Routes
// 1. Auth: Register
app.post('/api/auth/register', (req, res) => {
  const { email, password, fullName, phone, address } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Missing required registration info' });
  }

  const db = readDb();
  const existing = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  const newUser = {
    email: email.toLowerCase(),
    password, 
    fullName,
    phone: phone || '',
    address: address || '',
  };

  db.users.push(newUser);
  writeDb(db);

  res.json({
    email: newUser.email,
    fullName: newUser.fullName,
    phone: newUser.phone,
    address: newUser.address,
    isAuthenticated: true,
  });
});

// 2. Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password credentials' });
  }

  const db = readDb();
  const user = db.users.find(
    (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );

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
});

// 3. Update Profile Data
app.post('/api/profile', (req, res) => {
  const { email, fullName, phone, address } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email parameter is required' });
  }

  const db = readDb();
  const userIdx = db.users.findIndex((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (userIdx === -1) {
    return res.status(404).json({ error: 'User profile not found' });
  }

  db.users[userIdx] = {
    ...db.users[userIdx],
    fullName: fullName || db.users[userIdx].fullName,
    phone: phone || db.users[userIdx].phone,
    address: address || db.users[userIdx].address,
  };

  writeDb(db);

  res.json({
    email: db.users[userIdx].email,
    fullName: db.users[userIdx].fullName,
    phone: db.users[userIdx].phone,
    address: db.users[userIdx].address,
    isAuthenticated: true,
  });
});

// 4. Place New Order
app.post('/api/orders', (req, res) => {
  const { email, items, totalPrice, address, paymentMethod } = req.body;
  if (!items || !totalPrice || !address) {
    return res.status(400).json({ error: 'Invalid cart or address details' });
  }

  const db = readDb();
  const trackingNumber = 'PP-' + Math.floor(100000 + Math.random() * 900000);
  const newOrder = {
    id: trackingNumber,
    date: new Date().toLocaleDateString('ru-RU'),
    userEmail: email ? email.toLowerCase() : 'guest',
    items,
    totalPrice,
    address,
    paymentMethod,
    status: 'pending',
  };

  db.orders.unshift(newOrder);
  writeDb(db);

  res.json(newOrder);
});

// 5. Get User Orders
app.get('/api/orders/:email', (req, res) => {
  const email = req.params.email;
  if (!email) {
    return res.status(400).json({ error: 'User email is required' });
  }

  const db = readDb();
  const userOrders = db.orders.filter(
    (o: any) => o.userEmail.toLowerCase() === email.toLowerCase()
  );

  res.json(userOrders);
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
