import express from 'express';
import path from 'path';
import fs from 'fs';

const PORT = 3000;

// Determine writable DB path depending on environment (like Vercel serverless)
const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'db.json')
  : path.join(process.cwd(), 'data', 'db.json');

// Ensure database directory exists
try {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
} catch (err) {
  console.warn('Failed to ensure database directory exists:', err);
}

// Interfaces
interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  subscriptionStatus: 'active' | 'inactive';
  subscriptionTier: 'free' | 'pro';
  createdAt: string;
}

interface LogRecord {
  id: string;
  userId: string | null;
  ipAddress: string;
  tool: string;
  fileName: string;
  fileSize: string;
  status: 'success' | 'failed';
  createdAt: string;
}

interface UsageRecord {
  count: number;
  lastResetDate: string;
}

interface PaymentRequest {
  id: string;
  userId: string;
  userEmail: string;
  upiTxnId: string;
  payerName: string;
  payerPhone: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
}

interface CeoConfig {
  photo: string;
  avatarBg: string;
  avatarGlasses: string;
  avatarBorder: string;
  photoZoom?: number;
  photoPosX?: number;
  photoPosY?: number;
  photoRotate?: number;
  photoFit?: string;
}

interface DbSchema {
  users: UserRecord[];
  logs: LogRecord[];
  usage: Record<string, UsageRecord>; // keyed by email or IP
  paymentRequests: PaymentRequest[];
  ceo?: CeoConfig;
}

// Initial DB Seed Helper
function getInitialDb(): DbSchema {
  const now = new Date().toISOString();
  return {
    users: [
      {
        id: 'admin-1',
        email: 'saikrishnakondamudhi@gmail.com',
        passwordHash: 'Saikrishna@99511', // Required administrator password
        role: 'admin',
        subscriptionStatus: 'active',
        subscriptionTier: 'pro',
        createdAt: now,
      }
    ],
    logs: [],
    usage: {},
    paymentRequests: [],
  };
}

// In-memory cache fallback to support completely stateless environments like Vercel serverless
let memoryDbCache: DbSchema | null = null;

// Read database
function readDb(): DbSchema {
  if (memoryDbCache) {
    return memoryDbCache;
  }
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Seed with workspace data/db.json if it exists (very common for deployments)
      const seedPath = path.join(process.cwd(), 'data', 'db.json');
      let initial: DbSchema;
      if (fs.existsSync(seedPath)) {
        try {
          initial = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
        } catch (parseErr) {
          console.warn('Failed to parse workspace db.json:', parseErr);
          initial = getInitialDb();
        }
      } else {
        initial = getInitialDb();
      }

      try {
        fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
      } catch (writeErr) {
        console.warn('Failed to write initial DB file, using memory only:', writeErr);
      }
      memoryDbCache = initial;
      return initial;
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    const db = JSON.parse(data);
    if (!db.paymentRequests) {
      db.paymentRequests = [];
    }
    
    // Auto-repair/update Admin credentials to the required 'Saikrishna@99511' on startup
    let updated = false;
    const admin = db.users.find(u => u.email.toLowerCase() === 'saikrishnakondamudhi@gmail.com');
    if (admin) {
       if (admin.passwordHash !== 'Saikrishna@99511') {
        admin.passwordHash = 'Saikrishna@99511';
        updated = true;
      }
      if (admin.role !== 'admin') {
        admin.role = 'admin';
        updated = true;
      }
    } else {
      db.users.push({
        id: 'admin-1',
        email: 'saikrishnakondamudhi@gmail.com',
        passwordHash: 'Saikrishna@99511',
        role: 'admin',
        subscriptionStatus: 'active',
        subscriptionTier: 'pro',
        createdAt: new Date().toISOString(),
      });
      updated = true;
    }

    if (updated) {
      try {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
      } catch (writeErr) {
        console.warn('Failed to write updated DB file, using memory only:', writeErr);
      }
    }
    memoryDbCache = db;
    return db;
  } catch (error) {
    console.error('Error reading DB:', error);
    const initial = getInitialDb();
    memoryDbCache = initial;
    return initial;
  }
}

// Write database
function writeDb(db: DbSchema) {
  memoryDbCache = db;
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error writing DB:', error);
  }
}

// Configure Express App at module-level
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Helper to check user limits
  function getUsageKey(req: express.Request, user: UserRecord | null): string {
    if (user) return user.email;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    return String(ip).split(',')[0].trim();
  }

  // Session storage simulation (in-memory mapping token -> user)
  const sessions: Record<string, UserRecord> = {};

  // Authentication Middleware
  const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      (req as any).user = null;
      return next();
    }
    const token = authHeader.substring(7);
    const user = sessions[token];
    if (user) {
      // Reload user from DB to get fresh details
      const db = readDb();
      const freshUser = db.users.find(u => u.id === user.id);
      if (freshUser) {
        (req as any).user = freshUser;
        // Keep in session mapping updated
        sessions[token] = freshUser;
      } else {
        (req as any).user = null;
      }
    } else {
      (req as any).user = null;
    }
    next();
  };

  app.use(authMiddleware);

  // Auth Endpoints
  app.post('/api/auth/register', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    const db = readDb();
    if (db.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const newUser: UserRecord = {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      email: cleanEmail,
      passwordHash: cleanPassword, // simple storage for demo
      role: 'user',
      subscriptionStatus: 'inactive',
      subscriptionTier: 'free',
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    writeDb(db);

    const token = 'tok_' + Math.random().toString(36).substr(2, 15);
    sessions[token] = newUser;

    res.json({ token, user: { id: newUser.id, email: newUser.email, role: newUser.role, subscriptionStatus: newUser.subscriptionStatus, subscriptionTier: newUser.subscriptionTier } });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Guaranteed Admin bypass to ignore any filesystem or seed/persistence limits on external hosts
    if (cleanEmail === 'saikrishnakondamudhi@gmail.com' && (cleanPassword === 'Saikrishna@99511' || cleanPassword === 'saikrishna@99511')) {
      const adminUser: UserRecord = {
        id: 'admin-1',
        email: 'saikrishnakondamudhi@gmail.com',
        passwordHash: 'Saikrishna@99511',
        role: 'admin',
        subscriptionStatus: 'active',
        subscriptionTier: 'pro',
        createdAt: new Date().toISOString()
      };
      const token = 'tok_' + Math.random().toString(36).substr(2, 15);
      sessions[token] = adminUser;
      return res.json({ token, user: { id: adminUser.id, email: adminUser.email, role: adminUser.role, subscriptionStatus: adminUser.subscriptionStatus, subscriptionTier: adminUser.subscriptionTier } });
    }

    const db = readDb();
    // Try both original password and trimmed password for matching robustness
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail && (u.passwordHash === password || u.passwordHash === cleanPassword));
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = 'tok_' + Math.random().toString(36).substr(2, 15);
    sessions[token] = user;

    res.json({ token, user: { id: user.id, email: user.email, role: user.role, subscriptionStatus: user.subscriptionStatus, subscriptionTier: user.subscriptionTier } });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ user: { id: user.id, email: user.email, role: user.role, subscriptionStatus: user.subscriptionStatus, subscriptionTier: user.subscriptionTier } });
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      delete sessions[token];
    }
    res.json({ success: true });
  });

  // Get Usage State
  app.get('/api/usage', (req, res) => {
    const user = (req as any).user;
    const key = getUsageKey(req, user);
    const db = readDb();

    // Check if Pro subscriber - Pro has unlimited access
    if (user && user.subscriptionTier === 'pro' && user.subscriptionStatus === 'active') {
      return res.json({ count: 0, limit: 999999, remaining: 999999, isPro: true });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let usage = db.usage[key];

    if (!usage || usage.lastResetDate !== todayStr) {
      usage = { count: 0, lastResetDate: todayStr };
      db.usage[key] = usage;
      writeDb(db);
    }

    res.json({
      count: usage.count,
      limit: 5,
      remaining: Math.max(0, 5 - usage.count),
      isPro: false,
    });
  });

  // Increment Usage & Log Conversion
  app.post('/api/usage/increment', (req, res) => {
    const user = (req as any).user;
    const { tool, fileName, fileSize } = req.body;
    const key = getUsageKey(req, user);
    const db = readDb();

    const isPro = user && user.subscriptionTier === 'pro' && user.subscriptionStatus === 'active';

    // Log the conversion
    const newLog: LogRecord = {
      id: 'log_' + Math.random().toString(36).substr(2, 9),
      userId: user ? user.id : null,
      ipAddress: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim(),
      tool: tool || 'unknown',
      fileName: fileName || 'Document',
      fileSize: fileSize || 'N/A',
      status: 'success',
      createdAt: new Date().toISOString(),
    };
    db.logs.unshift(newLog);

    if (isPro) {
      writeDb(db);
      return res.json({ count: 0, limit: 999999, remaining: 999999, isPro: true, log: newLog });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let usage = db.usage[key];

    if (!usage || usage.lastResetDate !== todayStr) {
      usage = { count: 0, lastResetDate: todayStr };
    }

    if (usage.count >= 5) {
      // Limit reached, log still stored but failed status
      newLog.status = 'failed';
      writeDb(db);
      return res.status(403).json({ error: 'Daily conversion limit (5 free conversions per day) reached. Please subscribe to Pro for unlimited conversions!' });
    }

    usage.count += 1;
    db.usage[key] = usage;
    writeDb(db);

    res.json({
      count: usage.count,
      limit: 5,
      remaining: Math.max(0, 5 - usage.count),
      isPro: false,
      log: newLog,
    });
  });

  // Get logs for the current user
  app.get('/api/logs', (req, res) => {
    const user = (req as any).user;
    const db = readDb();
    if (user) {
      // Find logs belonging to this user
      const userLogs = db.logs.filter(log => log.userId === user.id);
      res.json({ logs: userLogs });
    } else {
      // Find logs belonging to this IP address
      const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
      const ipLogs = db.logs.filter(log => log.ipAddress === ip && log.userId === null);
      res.json({ logs: ipLogs });
    }
  });

  // Subscribe Simulation
  app.post('/api/subscribe', (req, res) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Please login or register to subscribe.' });
    }

    const db = readDb();
    const userIdx = db.users.findIndex(u => u.id === user.id);
    if (userIdx === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.users[userIdx].subscriptionStatus = 'active';
    db.users[userIdx].subscriptionTier = 'pro';
    writeDb(db);

    res.json({ success: true, user: db.users[userIdx] });
  });

  // Cancel Subscription Simulation
  app.post('/api/unsubscribe', (req, res) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const db = readDb();
    const userIdx = db.users.findIndex(u => u.id === user.id);
    if (userIdx === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.users[userIdx].subscriptionStatus = 'inactive';
    db.users[userIdx].subscriptionTier = 'free';
    writeDb(db);

    res.json({ success: true, user: db.users[userIdx] });
  });

  // Submit payment request (₹10 / mo PhonePe)
  app.post('/api/payments/request', (req, res) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Please login or register to submit a payment request.' });
    }

    const { upiTxnId, payerName, payerPhone, amount } = req.body;
    if (!upiTxnId || !payerName || !payerPhone) {
      return res.status(400).json({ error: 'All details (Transaction ID, Payer Name, and Payer Phone) are required.' });
    }

    const db = readDb();
    
    // Check if txn ID already registered to prevent duplicate submissions
    if (db.paymentRequests.some(pr => pr.upiTxnId === upiTxnId && pr.status === 'pending')) {
      return res.status(400).json({ error: 'A payment request with this UPI Transaction ID is already pending review.' });
    }

    const newRequest: PaymentRequest = {
      id: 'pay_' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      userEmail: user.email,
      upiTxnId,
      payerName,
      payerPhone,
      amount: amount || 49,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    db.paymentRequests.push(newRequest);
    writeDb(db);

    res.json({ success: true, paymentRequest: newRequest });
  });

  // Get current user's payment requests
  app.get('/api/payments/status', (req, res) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const db = readDb();
    const userRequests = db.paymentRequests.filter(pr => pr.userId === user.id);
    res.json({ paymentRequests: userRequests });
  });

  // Admin: Get all payment requests
  app.get('/api/admin/payments', (req, res) => {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const db = readDb();
    res.json({ paymentRequests: db.paymentRequests });
  });

  // Admin: Approve or Reject a payment request
  app.post('/api/admin/payments/:id/action', (req, res) => {
    const adminUser = (req as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject".' });
    }

    const db = readDb();
    const reqIdx = db.paymentRequests.findIndex(pr => pr.id === id);
    if (reqIdx === -1) {
      return res.status(404).json({ error: 'Payment request not found' });
    }

    const paymentRequest = db.paymentRequests[reqIdx];
    paymentRequest.status = action === 'approve' ? 'approved' : 'rejected';
    paymentRequest.reviewedAt = new Date().toISOString();

    if (action === 'approve') {
      // Find the user and set them to Pro
      const userIdx = db.users.findIndex(u => u.id === paymentRequest.userId);
      if (userIdx !== -1) {
        db.users[userIdx].subscriptionTier = 'pro';
        db.users[userIdx].subscriptionStatus = 'active';
      }
    } else {
      // If rejected, keep free
      const userIdx = db.users.findIndex(u => u.id === paymentRequest.userId);
      if (userIdx !== -1) {
        db.users[userIdx].subscriptionTier = 'free';
        db.users[userIdx].subscriptionStatus = 'inactive';
      }
    }

    writeDb(db);
    res.json({ success: true, paymentRequest });
  });

  // Admin: Get Dashboard Stats
  app.get('/api/admin/stats', (req, res) => {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const db = readDb();
    const totalUsers = db.users.length;
    const activeSubscriptions = db.users.filter(u => u.subscriptionStatus === 'active' && u.subscriptionTier === 'pro').length;
    const totalConversions = db.logs.filter(l => l.status === 'success').length;
    
    // Calculate monthly revenue in rupees (INR) from approved payments or active subs at ₹5 per 14-days
    const approvedTotal = db.paymentRequests.filter(pr => pr.status === 'approved').reduce((sum, pr) => sum + pr.amount, 0);
    const monthlyRevenue = approvedTotal || (activeSubscriptions * 5);


    // Conversions by tool
    const conversionsByTool: Record<string, number> = {};
    db.logs.forEach(log => {
      conversionsByTool[log.tool] = (conversionsByTool[log.tool] || 0) + 1;
    });

    // Conversions by day (last 7 days)
    const last7Days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last7Days[dateStr] = 0;
    }

    db.logs.forEach(log => {
      const dateStr = log.createdAt.split('T')[0];
      if (last7Days[dateStr] !== undefined) {
        last7Days[dateStr]++;
      }
    });

    const conversionsByDay = Object.keys(last7Days).map(date => ({
      date,
      count: last7Days[date]
    }));

    res.json({
      totalUsers,
      activeSubscriptions,
      totalConversions,
      monthlyRevenue,
      conversionsByTool,
      conversionsByDay,
      recentLogs: db.logs.slice(0, 10),
    });
  });

  // Admin: List Users
  app.get('/api/admin/users', (req, res) => {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const db = readDb();
    res.json({ users: db.users });
  });

  // Admin: Update User
  app.post('/api/admin/users/:id/update', (req, res) => {
    const adminUser = (req as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { id } = req.params;
    const { role, subscriptionTier, subscriptionStatus } = req.body;

    const db = readDb();
    const userIdx = db.users.findIndex(u => u.id === id);
    if (userIdx === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (role) db.users[userIdx].role = role;
    if (subscriptionTier) db.users[userIdx].subscriptionTier = subscriptionTier;
    if (subscriptionStatus) db.users[userIdx].subscriptionStatus = subscriptionStatus;

    writeDb(db);
    res.json({ success: true, user: db.users[userIdx] });
  });

  // Admin: Reset Limits for a User
  app.post('/api/admin/users/:email/reset-limits', (req, res) => {
    const adminUser = (req as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { email } = req.params;
    const db = readDb();

    if (db.usage[email]) {
      db.usage[email].count = 0;
      db.usage[email].lastResetDate = new Date().toISOString().split('T')[0];
    } else {
      db.usage[email] = { count: 0, lastResetDate: new Date().toISOString().split('T')[0] };
    }

    writeDb(db);
    res.json({ success: true });
  });

  // Admin: Delete User
  app.delete('/api/admin/users/:id', (req, res) => {
    const adminUser = (req as any).user;
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { id } = req.params;
    const db = readDb();
    const userIdx = db.users.findIndex(u => u.id === id);
    if (userIdx === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.users.splice(userIdx, 1);
    writeDb(db);
    res.json({ success: true });
  });

  // GET CEO config (accessible to everyone)
  app.get('/api/ceo-config', (req, res) => {
    const db = readDb();
    const ceo = db.ceo || {
      photo: '',
      avatarBg: 'cosmic',
      avatarGlasses: 'classic',
      avatarBorder: 'neon',
      photoZoom: 1.0,
      photoPosX: 0,
      photoPosY: 0,
      photoRotate: 0,
      photoFit: 'cover'
    };
    res.json({ ceo });
  });

  // POST CEO config (Admin only)
  app.post('/api/ceo-config', (req, res) => {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    const { photo, avatarBg, avatarGlasses, avatarBorder, photoZoom, photoPosX, photoPosY, photoRotate, photoFit } = req.body;
    const db = readDb();
    
    db.ceo = {
      photo: typeof photo === 'string' ? photo : (db.ceo?.photo || ''),
      avatarBg: typeof avatarBg === 'string' ? avatarBg : (db.ceo?.avatarBg || 'cosmic'),
      avatarGlasses: typeof avatarGlasses === 'string' ? avatarGlasses : (db.ceo?.avatarGlasses || 'classic'),
      avatarBorder: typeof avatarBorder === 'string' ? avatarBorder : (db.ceo?.avatarBorder || 'neon'),
      photoZoom: typeof photoZoom === 'number' ? photoZoom : (db.ceo?.photoZoom ?? 1.0),
      photoPosX: typeof photoPosX === 'number' ? photoPosX : (db.ceo?.photoPosX ?? 0),
      photoPosY: typeof photoPosY === 'number' ? photoPosY : (db.ceo?.photoPosY ?? 0),
      photoRotate: typeof photoRotate === 'number' ? photoRotate : (db.ceo?.photoRotate ?? 0),
      photoFit: typeof photoFit === 'string' ? photoFit : (db.ceo?.photoFit || 'cover')
    };

    writeDb(db);
    res.json({ success: true, ceo: db.ceo });
  });

  // Vite Integration & Listening
  async function setupViteAndListen() {
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
      try {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'spa',
        });
        app.use(vite.middlewares);
      } catch (err) {
        console.error('Failed to load Vite middleware:', err);
      }
    } else if (!process.env.VERCEL) {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    if (!process.env.VERCEL) {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
      });
    }
  }

  setupViteAndListen();

// Export the configured express app
export default app;
