import express from "express";
import { createServer as createViteServer } from "vite";
import pkg from "pg";
const { Pool } = pkg;
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PostgreSQL Pool Configuration
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl || dbUrl.includes('YOUR-PASSWORD') || dbUrl === 'base') {
  console.error("❌ CRITICAL: DATABASE_URL is missing or contains placeholders.");
  console.error("👉 Please set a valid Supabase connection string in your environment variables.");
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl?.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

// Test connection on startup
pool.query('SELECT NOW()').then(() => {
  console.log("✅ Database connected successfully");
}).catch(err => {
  console.error("❌ Database connection failed:", err.message);
  if (err.message.includes('getaddrinfo')) {
    console.error("👉 This usually means your DATABASE_URL hostname is incorrect or your internet/DNS is blocking the connection.");
  }
});

// Helper for distance calculation (Haversine formula)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

function generateProductKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "";
  for (let i = 0; i < 17; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  const PORT = 3000;

  // Request logging for API
  app.use("/api/*", (req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
  });

  app.get("/health", (req, res) => res.send("OK"));

  // Auth
  app.post("/api/login", async (req, res) => {
    const { mobile, email, password, productKey } = req.body;
    console.log(`Login attempt: mobile=${mobile}, email=${email}, hasProductKey=${!!productKey}`);
    
    try {
      let user;
      if (productKey) {
        // Owner login with Email + Mobile + Product Key
        const bizRes = await pool.query("SELECT * FROM businesses WHERE email = $1 AND activation_key = $2", [email, productKey]);
        const biz = bizRes.rows[0];
        if (!biz) {
          console.log("Login failed: Business not found for email/key");
          return res.status(404).json({ error: "You are not registered. Please register first." });
        }
        if (biz.status !== 'active') {
          console.log(`Login failed: Business ${biz.id} is ${biz.status}`);
          return res.status(403).json({ error: "Your account is not approved yet. Please wait for admin approval." });
        }
        
        const userRes = await pool.query("SELECT * FROM employees WHERE mobile = $1 AND business_id = $2 AND role = 'owner'", [mobile, biz.id]);
        user = userRes.rows[0];
      } else {
        // Regular login with Mobile or Email
        const userRes = await pool.query("SELECT * FROM employees WHERE (mobile = $1 OR email = $2)", [mobile || email, mobile || email]);
        user = userRes.rows[0];
        
        if (!user) {
          return res.status(404).json({ error: "You are not registered. Please register first." });
        }

        if (user.role !== 'master' && user.business_id) {
          const bizRes = await pool.query("SELECT status FROM businesses WHERE id = $1", [user.business_id]);
          const biz = bizRes.rows[0];
          if (biz && biz.status !== 'active') {
            console.log(`Login failed: Business ${user.business_id} is ${biz.status}`);
            return res.status(403).json({ error: "Your account is not approved yet. Please wait for admin approval." });
          }

          // Check employee approval
          if (user.role === 'employee' && !user.is_approved) {
            return res.status(403).json({ error: "Your account is not approved by employer." });
          }
        }
      }

      if (!user || !bcrypt.compareSync(password, user.password)) {
        console.log(`Login failed: User not found or password mismatch for ${mobile || email}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      console.log(`Login success: ${user.name} (${user.role})`);
      res.json(user);
    } catch (err: any) {
      console.error("Login route error:", err);
      res.status(500).json({ error: "Internal server error during login" });
    }
  });

  app.post("/api/change-password", async (req, res) => {
    const { employee_id, new_password } = req.body;
    const hashedPassword = bcrypt.hashSync(new_password, 10);
    await pool.query("UPDATE employees SET password = $1, is_first_login = 0 WHERE id = $2", [hashedPassword, employee_id]);
    res.json({ success: true });
  });

  // Signup Flow
  app.post("/api/signup", async (req, res) => {
    const { name, business_name, email, mobile, password, plan_name, employee_limit, payment_screenshot } = req.body;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const productKey = generateProductKey();
      const bizRes = await client.query(
        "INSERT INTO businesses (name, email, plan_name, employee_limit, activation_key, status, payment_screenshot) VALUES ($1, $2, $3, $4, $5, 'pending', $6) RETURNING id",
        [business_name, email, plan_name, employee_limit, productKey, payment_screenshot]
      );
      
      const bizId = bizRes.rows[0].id;
      const hashedPassword = bcrypt.hashSync(password, 10);
      const empRes = await client.query(
        "INSERT INTO employees (name, mobile, email, password, role, salary, shift_start, shift_end, business_id, is_first_login, is_approved) VALUES ($1, $2, $3, $4, 'owner', 0, '00:00', '00:00', $5, 0, 1) RETURNING id",
        [name, mobile, email, hashedPassword, bizId]
      );
      
      await client.query("UPDATE businesses SET owner_id = $1 WHERE id = $2", [empRes.rows[0].id, bizId]);
      
      // Simulate Payment Record
      await client.query(
        "INSERT INTO payments (business_id, amount, plan_name, transaction_id, status) VALUES ($1, $2, $3, $4, 'pending')",
        [bizId, plan_name === 'Growth' ? 99 : (plan_name === 'Pro' ? 199 : 0), plan_name, 'TXN' + Date.now()]
      );
      
      await client.query('COMMIT');
      res.json({ success: true, productKey });
    } catch (e: any) {
      await client.query('ROLLBACK');
      console.error("Signup error:", e);
      res.status(400).json({ error: e.message.includes('unique') ? "Email or Mobile already registered" : "Signup failed" });
    } finally {
      client.release();
    }
  });

  // Master Admin Routes
  app.get("/api/master/stats", async (req, res) => {
    const totalBusinesses = (await pool.query("SELECT COUNT(*) as count FROM businesses")).rows[0].count;
    const totalEmployees = (await pool.query("SELECT COUNT(*) as count FROM employees WHERE role != 'master'")).rows[0].count;
    const activeBusinesses = (await pool.query("SELECT COUNT(*) as count FROM businesses WHERE status = 'active'")).rows[0].count;
    const adminCount = (await pool.query("SELECT COUNT(*) as count FROM employees WHERE role = 'owner'")).rows[0].count;
    
    res.json({
      totalBusinesses: parseInt(totalBusinesses),
      totalEmployees: parseInt(totalEmployees),
      activeBusinesses: parseInt(activeBusinesses),
      adminCount: parseInt(adminCount)
    });
  });

  app.get("/api/master/businesses", async (req, res) => {
    const businesses = (await pool.query(`
      SELECT b.*, e.name as owner_name, e.mobile as owner_mobile,
      (SELECT COUNT(*) FROM employees WHERE business_id = b.id) as employee_count
      FROM businesses b
      LEFT JOIN employees e ON b.owner_id = e.id
    `)).rows;
    res.json(businesses);
  });

  app.post("/api/master/regenerate-key", async (req, res) => {
    const { business_id } = req.body;
    const newKey = generateProductKey();
    await pool.query("UPDATE businesses SET activation_key = $1 WHERE id = $2", [newKey, business_id]);
    res.json({ key: newKey });
  });

  app.post("/api/master/approve-business", async (req, res) => {
    const { business_id, status } = req.body;
    await pool.query("UPDATE businesses SET status = $1 WHERE id = $2", [status, business_id]);
    if (status === 'active') {
      await pool.query("UPDATE payments SET status = 'success' WHERE business_id = $1", [business_id]);
    }
    res.json({ success: true });
  });

  app.post("/api/master/add-business", async (req, res) => {
    const { name, email, owner_name, owner_mobile, owner_password, plan_name, employee_limit } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const productKey = generateProductKey();
      const bizRes = await client.query(
        "INSERT INTO businesses (name, email, plan_name, employee_limit, activation_key, status) VALUES ($1, $2, $3, $4, $5, 'active') RETURNING id",
        [name, email, plan_name, employee_limit, productKey]
      );
      
      const bizId = bizRes.rows[0].id;
      const hashedPassword = bcrypt.hashSync(owner_password, 10);
      const empRes = await client.query(
        "INSERT INTO employees (name, mobile, email, password, role, salary, shift_start, shift_end, business_id, is_first_login, is_approved) VALUES ($1, $2, $3, $4, 'owner', 0, '00:00', '00:00', $5, 0, 1) RETURNING id",
        [owner_name, owner_mobile, email, hashedPassword, bizId]
      );
      
      await client.query("UPDATE businesses SET owner_id = $1 WHERE id = $2", [empRes.rows[0].id, bizId]);
      await client.query('COMMIT');
      res.json({ success: true, productKey });
    } catch (e: any) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: "Signup failed: " + e.message });
    } finally {
      client.release();
    }
  });

  // Business Routes
  app.get("/api/business/info/:business_id", async (req, res) => {
    const business = (await pool.query("SELECT * FROM businesses WHERE id = $1", [req.params.business_id])).rows[0];
    res.json(business);
  });

  app.post("/api/business/update-geofence", async (req, res) => {
    const { business_id, lat, lng, radius } = req.body;
    await pool.query("UPDATE businesses SET office_lat = $1, office_lng = $2, geofence_radius = $3 WHERE id = $4", [lat, lng, radius, business_id]);
    res.json({ success: true });
  });

  // Employees
  app.get("/api/employees", async (req, res) => {
    const { business_id } = req.query;
    const employees = (await pool.query("SELECT * FROM employees WHERE business_id = $1 AND role != 'owner'", [business_id])).rows;
    res.json(employees);
  });

  app.post("/api/employees", async (req, res) => {
    const { name, mobile, email, password, role, salary, shift_start, shift_end, business_id } = req.body;
    
    if (!business_id) return res.status(400).json({ error: "Business ID required" });

    const business = (await pool.query("SELECT employee_limit FROM businesses WHERE id = $1", [business_id])).rows[0];
    const count = (await pool.query("SELECT COUNT(*) as count FROM employees WHERE business_id = $1 AND role != 'owner'", [business_id])).rows[0].count;
    
    if (parseInt(count) >= business.employee_limit) {
      return res.status(403).json({ error: `Employee limit (${business.employee_limit}) reached. Please upgrade.` });
    }

    try {
      const hashedPassword = bcrypt.hashSync(password || '123456', 10);
      const resInfo = await pool.query(
        "INSERT INTO employees (name, mobile, email, password, role, salary, shift_start, shift_end, business_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
        [name, mobile, email, hashedPassword, role || 'employee', salary, shift_start, shift_end, business_id]
      );
      res.json({ id: resInfo.rows[0].id });
    } catch (e) {
      res.status(400).json({ error: "Mobile or Email already exists" });
    }
  });

  app.put("/api/employees/:id", async (req, res) => {
    const { name, mobile, email, password, role, salary, shift_start, shift_end } = req.body;
    let query = "UPDATE employees SET name = $1, mobile = $2, email = $3, role = $4, salary = $5, shift_start = $6, shift_end = $7";
    const params = [name, mobile, email, role, salary, shift_start, shift_end];
    
    if (password) {
      query += `, password = $${params.length + 1}`;
      params.push(bcrypt.hashSync(password, 10));
    }
    
    query += ` WHERE id = $${params.length + 1}`;
    params.push(req.params.id);
    
    await pool.query(query, params);
    res.json({ success: true });
  });

  app.post("/api/employees/:id/approve", async (req, res) => {
    const { status } = req.body;
    await pool.query("UPDATE employees SET is_approved = $1 WHERE id = $2", [status ? 1 : 0, req.params.id]);
    res.json({ success: true });
  });

  app.delete("/api/employees/:id", async (req, res) => {
    await pool.query("DELETE FROM employees WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  });

  // Attendance
  app.get("/api/attendance/today", async (req, res) => {
    const { business_id } = req.query;
    const date = new Date().toISOString().split("T")[0];
    const attendance = (await pool.query(`
      SELECT a.*, e.name, e.shift_start 
      FROM attendance a 
      JOIN employees e ON a.employee_id = e.id 
      WHERE a.date = $1 AND a.business_id = $2
    `, [date, business_id])).rows;
    res.json(attendance);
  });

  app.post("/api/attendance/check-in", async (req, res) => {
    const { employee_id, time, is_late, latitude, longitude, selfie_url, date: manualDate, business_id } = req.body;
    const date = manualDate || new Date().toISOString().split("T")[0];
    
    const existing = (await pool.query("SELECT id FROM attendance WHERE employee_id = $1 AND date = $2", [employee_id, date])).rows[0];
    if (existing) return res.status(400).json({ error: "Already checked in" });

    // Geofence Check
    const biz = (await pool.query("SELECT office_lat, office_lng, geofence_radius FROM businesses WHERE id = $1", [business_id])).rows[0];
    let distance = null;
    if (biz && biz.office_lat && biz.office_lng && latitude && longitude) {
      distance = getDistance(latitude, longitude, biz.office_lat, biz.office_lng);
      if (distance > biz.geofence_radius) {
        return res.status(403).json({ error: `Out of office range. Distance: ${Math.round(distance)}m. Limit: ${biz.geofence_radius}m.` });
      }
    }

    await pool.query(
      "INSERT INTO attendance (employee_id, date, check_in, is_late, status, latitude, longitude, selfie_url, distance_from_office, business_id) VALUES ($1, $2, $3, $4, 'present', $5, $6, $7, $8, $9)",
      [employee_id, date, time, is_late ? 1 : 0, latitude, longitude, selfie_url, distance, business_id]
    );
    res.json({ success: true });
  });

  app.post("/api/attendance/check-out", async (req, res) => {
    const { employee_id, time, date: manualDate } = req.body;
    const date = manualDate || new Date().toISOString().split("T")[0];
    await pool.query(
      "UPDATE attendance SET check_out = $1 WHERE employee_id = $2 AND date = $3",
      [time, employee_id, date]
    );
    res.json({ success: true });
  });

  app.put("/api/attendance/:id", async (req, res) => {
    const { check_in, check_out, status, is_late } = req.body;
    await pool.query("UPDATE attendance SET check_in = $1, check_out = $2, status = $3, is_late = $4 WHERE id = $5", [check_in, check_out, status, is_late ? 1 : 0, req.params.id]);
    res.json({ success: true });
  });

  app.get("/api/attendance/report", async (req, res) => {
    const { month, year, employee_id, business_id } = req.query;
    let query = `
      SELECT a.*, e.name, e.salary, e.shift_start, e.shift_end
      FROM attendance a 
      JOIN employees e ON a.employee_id = e.id 
      WHERE a.date LIKE $1 AND a.business_id = $2
    `;
    const params = [`${year}-${month}%`, business_id];
    if (employee_id) {
      query += ` AND a.employee_id = $${params.length + 1}`;
      params.push(employee_id as string);
    }
    const records = (await pool.query(query, params)).rows;
    const processed = records.map((rec: any) => {
      let hours = 0;
      if (rec.check_in && rec.check_out) {
        const [h1, m1] = rec.check_in.split(':').map(Number);
        const [h2, m2] = rec.check_out.split(':').map(Number);
        hours = Math.max(0, (h2 * 60 + m2 - (h1 * 60 + m1)) / 60);
      }
      return { ...rec, hours: parseFloat(hours.toFixed(2)) };
    });
    res.json(processed);
  });

  // Leaves
  app.get("/api/leaves", async (req, res) => {
    const { employee_id, business_id } = req.query;
    let query = `SELECT l.*, e.name FROM leaves l JOIN employees e ON l.employee_id = e.id WHERE l.business_id = $1`;
    const params = [business_id];
    if (employee_id) {
      query += ` AND l.employee_id = $${params.length + 1}`;
      params.push(employee_id);
    }
    res.json((await pool.query(query, params)).rows);
  });

  app.post("/api/leaves", async (req, res) => {
    const { employee_id, start_date, end_date, reason, business_id } = req.body;
    await pool.query("INSERT INTO leaves (employee_id, start_date, end_date, reason, business_id) VALUES ($1, $2, $3, $4, $5)", [employee_id, start_date, end_date, reason, business_id]);
    res.json({ success: true });
  });

  app.put("/api/leaves/:id/status", async (req, res) => {
    await pool.query("UPDATE leaves SET status = $1 WHERE id = $2", [req.body.status, req.params.id]);
    res.json({ success: true });
  });

  // Stats
  app.get("/api/stats", async (req, res) => {
    const { business_id } = req.query;
    const date = new Date().toISOString().split("T")[0];
    const totalEmployees = (await pool.query("SELECT COUNT(*) as count FROM employees WHERE business_id = $1 AND role != 'owner'", [business_id])).rows[0].count;
    const presentToday = (await pool.query("SELECT COUNT(*) as count FROM attendance WHERE date = $1 AND status = 'present' AND business_id = $2", [date, business_id])).rows[0].count;
    const lateToday = (await pool.query("SELECT COUNT(*) as count FROM attendance WHERE date = $1 AND is_late = 1 AND business_id = $2", [date, business_id])).rows[0].count;
    res.json({ 
      totalEmployees: parseInt(totalEmployees), 
      presentToday: parseInt(presentToday), 
      absentToday: Math.max(0, parseInt(totalEmployees) - parseInt(presentToday)), 
      lateToday: parseInt(lateToday) 
    });
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    const settings = (await pool.query("SELECT * FROM settings WHERE business_id = $1", [req.query.business_id])).rows;
    const obj: any = {};
    settings.forEach((s: any) => obj[s.key] = s.value);
    res.json(obj);
  });

  app.post("/api/settings", async (req, res) => {
    const { business_id, ...settings } = req.body;
    for (const key in settings) {
      await pool.query(
        "INSERT INTO settings (business_id, key, value) VALUES ($1, $2, $3) ON CONFLICT (business_id, key) DO UPDATE SET value = EXCLUDED.value",
        [business_id, key, String(settings[key])]
      );
    }
    res.json({ success: true });
  });

  app.get("/api/holidays", async (req, res) => {
    const { business_id } = req.query;
    const holidays = (await pool.query("SELECT * FROM holidays WHERE business_id = $1 ORDER BY date DESC", [business_id])).rows;
    res.json(holidays);
  });

  app.post("/api/holidays", async (req, res) => {
    const { business_id, date, reason } = req.body;
    await pool.query("INSERT INTO holidays (business_id, date, reason) VALUES ($1, $2, $3)", [business_id, date, reason]);
    res.json({ success: true });
  });

  app.delete("/api/holidays/:id", async (req, res) => {
    await pool.query("DELETE FROM holidays WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  });

  // API 404 Handler - MUST be before Vite/Static middleware
  app.use("/api/*", (req, res) => {
    res.status(404).json({ 
      error: "API Route Not Found", 
      method: req.method, 
      path: req.originalUrl 
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
