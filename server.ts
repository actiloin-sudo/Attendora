import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import * as bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any;

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
  try {
    db = new Database("attendance.db");

    // Initialize Database
    db.exec(`
      CREATE TABLE IF NOT EXISTS businesses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        owner_id INTEGER,
        plan_name TEXT DEFAULT 'Starter',
        employee_limit INTEGER DEFAULT 3,
        activation_key TEXT UNIQUE,
        status TEXT DEFAULT 'pending', -- pending, active, inactive
        payment_screenshot TEXT,
        office_lat REAL,
        office_lng REAL,
        geofence_radius INTEGER DEFAULT 100, -- in metres
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER,
        name TEXT NOT NULL,
        mobile TEXT NOT NULL UNIQUE,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'employee', -- master, owner, sub-admin, employee
        salary REAL NOT NULL,
        shift_start TEXT NOT NULL,
        shift_end TEXT NOT NULL,
        is_first_login INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER,
        employee_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        check_in TEXT,
        check_out TEXT,
        is_late INTEGER DEFAULT 0,
        status TEXT DEFAULT 'present', -- present, absent, leave
        latitude REAL,
        longitude REAL,
        selfie_url TEXT,
        distance_from_office REAL,
        FOREIGN KEY (employee_id) REFERENCES employees(id),
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      );

      CREATE TABLE IF NOT EXISTS leaves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER,
        employee_id INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'pending', -- pending, approved, rejected
        FOREIGN KEY (employee_id) REFERENCES employees(id),
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        business_id INTEGER,
        key TEXT,
        value TEXT,
        PRIMARY KEY (business_id, key),
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      );

      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER,
        amount REAL,
        plan_name TEXT,
        transaction_id TEXT,
        status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id)
      );

      -- Insert Master Admin (hashed password: masteradmin)
    `);

    // Migration: Add columns if they don't exist
    const businessCols = db.prepare("PRAGMA table_info(businesses)").all();
    if (!businessCols.find((c: any) => c.name === 'email')) {
      db.exec("ALTER TABLE businesses ADD COLUMN email TEXT UNIQUE");
    }
    if (!businessCols.find((c: any) => c.name === 'office_lat')) {
      db.exec("ALTER TABLE businesses ADD COLUMN office_lat REAL");
      db.exec("ALTER TABLE businesses ADD COLUMN office_lng REAL");
      db.exec("ALTER TABLE businesses ADD COLUMN geofence_radius INTEGER DEFAULT 100");
    }

    const employeeCols = db.prepare("PRAGMA table_info(employees)").all();
    if (!employeeCols.find((c: any) => c.name === 'email')) {
      db.exec("ALTER TABLE employees ADD COLUMN email TEXT UNIQUE");
    }
    if (!employeeCols.find((c: any) => c.name === 'is_first_login')) {
      db.exec("ALTER TABLE employees ADD COLUMN is_first_login INTEGER DEFAULT 1");
    }

    const attendanceCols = db.prepare("PRAGMA table_info(attendance)").all();
    if (!attendanceCols.find((c: any) => c.name === 'distance_from_office')) {
      db.exec("ALTER TABLE attendance ADD COLUMN distance_from_office REAL");
    }

    if (!businessCols.find((c: any) => c.name === 'payment_screenshot')) {
      db.exec("ALTER TABLE businesses ADD COLUMN payment_screenshot TEXT");
    }
    // Ensure status defaults to pending if we want to enforce approval
    // But existing ones should stay active if they were active.

    // Default Master Admin
    const masterExists = db.prepare("SELECT * FROM employees WHERE role = 'master'").get();
    if (!masterExists) {
      const hashedPassword = bcrypt.hashSync('masteradmin', 10);
      db.prepare("INSERT INTO employees (name, mobile, email, password, role, salary, shift_start, shift_end, is_first_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run('Master Admin', '9999999999', 'admin@attendora.com', hashedPassword, 'master', 0, '00:00', '00:00', 0);
    }

    // Default Business 1
    const biz1 = db.prepare("SELECT * FROM businesses WHERE id = 1").get();
    if (!biz1) {
      const key = generateProductKey();
      db.prepare("INSERT INTO businesses (id, name, email, plan_name, employee_limit, activation_key) VALUES (1, 'Attendora', 'owner@attendora.com', 'Pro', 20, ?)")
        .run(key);
      
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.prepare("INSERT INTO employees (name, mobile, email, password, role, salary, shift_start, shift_end, business_id, is_first_login) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run('Admin Owner', '0000000000', 'owner@attendora.com', hashedPassword, 'owner', 0, '00:00', '00:00', 1, 0);
      
      db.prepare("UPDATE businesses SET owner_id = (SELECT id FROM employees WHERE mobile = '0000000000') WHERE id = 1").run();
    }

  } catch (dbErr) {
    console.error("Database failed to initialize:", dbErr);
    throw dbErr;
  }

  const app = express();
  app.use(express.json());
  const PORT = 3000;

  app.get("/health", (req, res) => res.send("OK"));

  // Auth
  app.post("/api/login", (req, res) => {
    const { mobile, email, password, productKey } = req.body;
    
    let user;
    if (productKey) {
      // Owner login with Email + Mobile + Product Key
      const biz = db.prepare("SELECT * FROM businesses WHERE email = ? AND activation_key = ?").get(email, productKey);
      if (!biz) return res.status(401).json({ error: "Invalid business credentials or product key" });
      if (biz.status !== 'active') return res.status(403).json({ error: "Business account is pending approval or inactive" });
      
      user = db.prepare("SELECT * FROM employees WHERE mobile = ? AND business_id = ? AND role = 'owner'").get(mobile, biz.id);
    } else {
      // Regular login with Mobile or Email
      user = db.prepare("SELECT * FROM employees WHERE (mobile = ? OR email = ?)").get(mobile || email, mobile || email);
      if (user && user.role !== 'master' && user.business_id) {
        const biz = db.prepare("SELECT status FROM businesses WHERE id = ?").get(user.business_id);
        if (biz && biz.status !== 'active') return res.status(403).json({ error: "Business account is pending approval or inactive" });
      }
    }

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json(user);
  });

  app.post("/api/change-password", (req, res) => {
    const { employee_id, new_password } = req.body;
    const hashedPassword = bcrypt.hashSync(new_password, 10);
    db.prepare("UPDATE employees SET password = ?, is_first_login = 0 WHERE id = ?").run(hashedPassword, employee_id);
    res.json({ success: true });
  });

  // Signup Flow
  app.post("/api/signup", (req, res) => {
    const { name, business_name, email, mobile, password, plan_name, employee_limit, payment_screenshot } = req.body;
    
    try {
      db.transaction(() => {
        const productKey = generateProductKey();
        const bizInfo = db.prepare("INSERT INTO businesses (name, email, plan_name, employee_limit, activation_key, status, payment_screenshot) VALUES (?, ?, ?, ?, ?, 'pending', ?)")
          .run(business_name, email, plan_name, employee_limit, productKey, payment_screenshot);
        
        const bizId = bizInfo.lastInsertRowid;
        const hashedPassword = bcrypt.hashSync(password, 10);
        const empInfo = db.prepare("INSERT INTO employees (name, mobile, email, password, role, salary, shift_start, shift_end, business_id, is_first_login) VALUES (?, ?, ?, ?, 'owner', 0, '00:00', '00:00', ?, 0)")
          .run(name, mobile, email, hashedPassword, bizId);
        
        db.prepare("UPDATE businesses SET owner_id = ? WHERE id = ?").run(empInfo.lastInsertRowid, bizId);
        
        // Simulate Payment Record
        db.prepare("INSERT INTO payments (business_id, amount, plan_name, transaction_id, status) VALUES (?, ?, ?, ?, 'pending')")
          .run(bizId, plan_name === 'Growth' ? 99 : (plan_name === 'Pro' ? 199 : 0), plan_name, 'TXN' + Date.now(), 'pending');
        
        res.json({ success: true, productKey });
      })();
    } catch (e: any) {
      console.error("Signup error:", e);
      res.status(400).json({ error: e.message.includes('UNIQUE') ? "Email or Mobile already registered" : "Signup failed" });
    }
  });

  // Master Admin Routes
  app.get("/api/master/stats", (req, res) => {
    const totalBusinesses = db.prepare("SELECT COUNT(*) as count FROM businesses").get().count;
    const totalEmployees = db.prepare("SELECT COUNT(*) as count FROM employees WHERE role != 'master'").get().count;
    const activeBusinesses = db.prepare("SELECT COUNT(*) as count FROM businesses WHERE status = 'active'").get().count;
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM employees WHERE role = 'owner'").get().count;
    
    res.json({
      totalBusinesses,
      totalEmployees,
      activeBusinesses,
      adminCount
    });
  });

  app.get("/api/master/businesses", (req, res) => {
    const businesses = db.prepare(`
      SELECT b.*, e.name as owner_name, e.mobile as owner_mobile,
      (SELECT COUNT(*) FROM employees WHERE business_id = b.id) as employee_count
      FROM businesses b
      LEFT JOIN employees e ON b.owner_id = e.id
    `).all();
    res.json(businesses);
  });

  app.post("/api/master/regenerate-key", (req, res) => {
    const { business_id } = req.body;
    const newKey = generateProductKey();
    db.prepare("UPDATE businesses SET activation_key = ? WHERE id = ?").run(newKey, business_id);
    res.json({ key: newKey });
  });

  app.post("/api/master/approve-business", (req, res) => {
    const { business_id, status } = req.body;
    db.prepare("UPDATE businesses SET status = ? WHERE id = ?").run(status, business_id);
    if (status === 'active') {
      db.prepare("UPDATE payments SET status = 'success' WHERE business_id = ?").run(business_id);
    }
    res.json({ success: true });
  });

  app.post("/api/master/add-business", (req, res) => {
    const { name, email, owner_name, owner_mobile, owner_password, plan_name, employee_limit } = req.body;
    try {
      db.transaction(() => {
        const productKey = generateProductKey();
        const bizInfo = db.prepare("INSERT INTO businesses (name, email, plan_name, employee_limit, activation_key, status) VALUES (?, ?, ?, ?, ?, 'active')")
          .run(name, email, plan_name, employee_limit, productKey);
        
        const bizId = bizInfo.lastInsertRowid;
        const hashedPassword = bcrypt.hashSync(owner_password, 10);
        const empInfo = db.prepare("INSERT INTO employees (name, mobile, email, password, role, salary, shift_start, shift_end, business_id, is_first_login) VALUES (?, ?, ?, ?, 'owner', 0, '00:00', '00:00', ?, 0)")
          .run(owner_name, owner_mobile, email, hashedPassword, bizId);
        
        db.prepare("UPDATE businesses SET owner_id = ? WHERE id = ?").run(empInfo.lastInsertRowid, bizId);
        res.json({ success: true, productKey });
      })();
    } catch (e: any) {
      res.status(400).json({ error: "Signup failed: " + e.message });
    }
  });

  // Business Routes
  app.get("/api/business/info/:business_id", (req, res) => {
    const business = db.prepare("SELECT * FROM businesses WHERE id = ?").get(req.params.business_id);
    res.json(business);
  });

  app.post("/api/business/update-geofence", (req, res) => {
    const { business_id, lat, lng, radius } = req.body;
    db.prepare("UPDATE businesses SET office_lat = ?, office_lng = ?, geofence_radius = ? WHERE id = ?")
      .run(lat, lng, radius, business_id);
    res.json({ success: true });
  });

  // Employees
  app.get("/api/employees", (req, res) => {
    const { business_id } = req.query;
    const employees = db.prepare("SELECT * FROM employees WHERE business_id = ? AND role != 'owner'").all(business_id);
    res.json(employees);
  });

  app.post("/api/employees", (req, res) => {
    const { name, mobile, email, password, role, salary, shift_start, shift_end, business_id } = req.body;
    
    if (!business_id) return res.status(400).json({ error: "Business ID required" });

    const business = db.prepare("SELECT employee_limit FROM businesses WHERE id = ?").get(business_id);
    const count = db.prepare("SELECT COUNT(*) as count FROM employees WHERE business_id = ? AND role != 'owner'").get(business_id).count;
    
    if (count >= business.employee_limit) {
      return res.status(403).json({ error: `Employee limit (${business.employee_limit}) reached. Please upgrade.` });
    }

    try {
      const hashedPassword = bcrypt.hashSync(password || '123456', 10);
      const info = db.prepare(
        "INSERT INTO employees (name, mobile, email, password, role, salary, shift_start, shift_end, business_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(name, mobile, email, hashedPassword, role || 'employee', salary, shift_start, shift_end, business_id);
      res.json({ id: info.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Mobile or Email already exists" });
    }
  });

  app.put("/api/employees/:id", (req, res) => {
    const { name, mobile, email, password, role, salary, shift_start, shift_end } = req.body;
    let query = "UPDATE employees SET name = ?, mobile = ?, email = ?, role = ?, salary = ?, shift_start = ?, shift_end = ?";
    const params = [name, mobile, email, role, salary, shift_start, shift_end];
    
    if (password) {
      query += ", password = ?";
      params.push(bcrypt.hashSync(password, 10));
    }
    
    query += " WHERE id = ?";
    params.push(req.params.id);
    
    db.prepare(query).run(...params);
    res.json({ success: true });
  });

  app.delete("/api/employees/:id", (req, res) => {
    db.prepare("DELETE FROM employees WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Attendance
  app.get("/api/attendance/today", (req, res) => {
    const { business_id } = req.query;
    const date = new Date().toISOString().split("T")[0];
    const attendance = db.prepare(`
      SELECT a.*, e.name, e.shift_start 
      FROM attendance a 
      JOIN employees e ON a.employee_id = e.id 
      WHERE a.date = ? AND a.business_id = ?
    `).all(date, business_id);
    res.json(attendance);
  });

  app.post("/api/attendance/check-in", (req, res) => {
    const { employee_id, time, is_late, latitude, longitude, selfie_url, date: manualDate, business_id } = req.body;
    const date = manualDate || new Date().toISOString().split("T")[0];
    
    const existing = db.prepare("SELECT id FROM attendance WHERE employee_id = ? AND date = ?").get(employee_id, date);
    if (existing) return res.status(400).json({ error: "Already checked in" });

    // Geofence Check
    const biz = db.prepare("SELECT office_lat, office_lng, geofence_radius FROM businesses WHERE id = ?").get(business_id);
    let distance = null;
    if (biz && biz.office_lat && biz.office_lng && latitude && longitude) {
      distance = getDistance(latitude, longitude, biz.office_lat, biz.office_lng);
      if (distance > biz.geofence_radius) {
        return res.status(403).json({ error: `Out of office range. Distance: ${Math.round(distance)}m. Limit: ${biz.geofence_radius}m.` });
      }
    }

    db.prepare(
      "INSERT INTO attendance (employee_id, date, check_in, is_late, status, latitude, longitude, selfie_url, distance_from_office, business_id) VALUES (?, ?, ?, ?, 'present', ?, ?, ?, ?, ?)"
    ).run(employee_id, date, time, is_late ? 1 : 0, latitude, longitude, selfie_url, distance, business_id);
    res.json({ success: true });
  });

  app.post("/api/attendance/check-out", (req, res) => {
    const { employee_id, time, date: manualDate } = req.body;
    const date = manualDate || new Date().toISOString().split("T")[0];
    db.prepare(
      "UPDATE attendance SET check_out = ? WHERE employee_id = ? AND date = ?"
    ).run(time, employee_id, date);
    res.json({ success: true });
  });

  app.put("/api/attendance/:id", (req, res) => {
    const { check_in, check_out, status, is_late } = req.body;
    db.prepare("UPDATE attendance SET check_in = ?, check_out = ?, status = ?, is_late = ? WHERE id = ?")
      .run(check_in, check_out, status, is_late ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/attendance/report", (req, res) => {
    const { month, year, employee_id, business_id } = req.query;
    let query = `
      SELECT a.*, e.name, e.salary, e.shift_start, e.shift_end
      FROM attendance a 
      JOIN employees e ON a.employee_id = e.id 
      WHERE a.date LIKE ? AND a.business_id = ?
    `;
    const params = [`${year}-${month}%`, business_id];
    if (employee_id) {
      query += " AND a.employee_id = ?";
      params.push(employee_id as string);
    }
    const records = db.prepare(query).all(...params);
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
  app.get("/api/leaves", (req, res) => {
    const { employee_id, business_id } = req.query;
    let query = `SELECT l.*, e.name FROM leaves l JOIN employees e ON l.employee_id = e.id WHERE l.business_id = ?`;
    const params = [business_id];
    if (employee_id) {
      query += " AND l.employee_id = ?";
      params.push(employee_id);
    }
    res.json(db.prepare(query).all(...params));
  });

  app.post("/api/leaves", (req, res) => {
    const { employee_id, start_date, end_date, reason, business_id } = req.body;
    db.prepare("INSERT INTO leaves (employee_id, start_date, end_date, reason, business_id) VALUES (?, ?, ?, ?, ?)")
      .run(employee_id, start_date, end_date, reason, business_id);
    res.json({ success: true });
  });

  app.put("/api/leaves/:id/status", (req, res) => {
    db.prepare("UPDATE leaves SET status = ? WHERE id = ?").run(req.body.status, req.params.id);
    res.json({ success: true });
  });

  // Stats
  app.get("/api/stats", (req, res) => {
    const { business_id } = req.query;
    const date = new Date().toISOString().split("T")[0];
    const totalEmployees = db.prepare("SELECT COUNT(*) as count FROM employees WHERE business_id = ? AND role != 'owner'").get(business_id).count;
    const presentToday = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = 'present' AND business_id = ?").get(date, business_id).count;
    const lateToday = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE date = ? AND is_late = 1 AND business_id = ?").get(date, business_id).count;
    res.json({ totalEmployees, presentToday, absentToday: Math.max(0, totalEmployees - presentToday), lateToday });
  });

  // Settings
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings WHERE business_id = ?").all(req.query.business_id);
    const obj: any = {};
    settings.forEach((s: any) => obj[s.key] = s.value);
    res.json(obj);
  });

  app.post("/api/settings", (req, res) => {
    const { business_id, ...settings } = req.body;
    for (const key in settings) {
      db.prepare("INSERT OR REPLACE INTO settings (business_id, key, value) VALUES (?, ?, ?)").run(business_id, key, String(settings[key]));
    }
    res.json({ success: true });
  });

  app.get("/api/backup", (req, res) => res.download(path.join(__dirname, "attendance.db")));

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
