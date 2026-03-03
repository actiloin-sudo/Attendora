import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any;

async function startServer() {
  try {
    db = new Database("attendance.db");
    
    // Initialize Database
    db.exec(`
      CREATE TABLE IF NOT EXISTS businesses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        owner_id INTEGER,
        plan_name TEXT DEFAULT 'Starter',
        employee_limit INTEGER DEFAULT 3,
        activation_key TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER,
        name TEXT NOT NULL,
        mobile TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'employee', -- master, owner, sub-admin, employee
        salary REAL NOT NULL,
        shift_start TEXT NOT NULL,
        shift_end TEXT NOT NULL,
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

      -- Insert Master Admin
      INSERT OR IGNORE INTO employees (name, mobile, password, role, salary, shift_start, shift_end)
      VALUES ('Master Admin', '9999999999', 'masteradmin', 'master', 0, '00:00', '00:00');

      -- Default Business for existing owner
      INSERT OR IGNORE INTO businesses (id, name, plan_name, employee_limit) VALUES (1, 'Attendora', 'Pro', 20);
      
      -- Update existing owner if exists
      UPDATE employees SET business_id = 1 WHERE mobile = '0000000000';
      INSERT OR IGNORE INTO employees (name, mobile, password, role, salary, shift_start, shift_end, business_id)
      VALUES ('Admin Owner', '0000000000', 'admin123', 'owner', 0, '00:00', '00:00', 1);
      
      -- Default Settings for Business 1
      INSERT OR IGNORE INTO settings (business_id, key, value) VALUES (1, 'business_name', 'Attendora');
      INSERT OR IGNORE INTO settings (business_id, key, value) VALUES (1, 'employee_limit', '20');
      INSERT OR IGNORE INTO settings (business_id, key, value) VALUES (1, 'salary_rule', 'monthly');
      INSERT OR IGNORE INTO settings (business_id, key, value) VALUES (1, 'late_penalty', '0');
    `);
  } catch (dbErr) {
    console.error("Database failed to initialize:", dbErr);
    throw dbErr;
  }

  const app = express();
  app.use(express.json());
  const PORT = 3000;

  app.get("/health", (req, res) => res.send("OK"));

  // --- API Routes ---

  // Auth
  app.post("/api/login", (req, res) => {
    const { mobile, password } = req.body;
    const user = db.prepare("SELECT * FROM employees WHERE mobile = ? AND password = ?").get(mobile, password);
    if (!user) {
      return res.status(401).json({ error: "Invalid mobile or password" });
    }
    res.json(user);
  });

  // Master Admin Routes
  app.get("/api/master/stats", (req, res) => {
    const totalBusinesses = db.prepare("SELECT COUNT(*) as count FROM businesses").get().count;
    const totalEmployees = db.prepare("SELECT COUNT(*) as count FROM employees WHERE role != 'master'").get().count;
    const activeBusinesses = db.prepare("SELECT COUNT(*) as count FROM businesses WHERE status = 'active'").get().count;
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM employees WHERE role = 'owner'").get().count;
    const subAdminCount = db.prepare("SELECT COUNT(*) as count FROM employees WHERE role = 'sub-admin'").get().count;
    
    res.json({
      totalBusinesses,
      totalEmployees,
      activeBusinesses,
      adminCount,
      subAdminCount
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

  app.post("/api/master/generate-key", (req, res) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let key = "";
    const length = Math.floor(Math.random() * 6) + 15; // 15 to 20
    for (let i = 0; i < length; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    res.json({ key });
  });

  // Business Routes
  app.get("/api/business/info/:business_id", (req, res) => {
    const business = db.prepare("SELECT * FROM businesses WHERE id = ?").get(req.params.business_id);
    res.json(business);
  });

  app.post("/api/business/select-plan", (req, res) => {
    const { business_id, plan_name, employee_limit } = req.body;
    db.prepare("UPDATE businesses SET plan_name = ?, employee_limit = ? WHERE id = ?")
      .run(plan_name, employee_limit, business_id);
    
    // Update settings as well
    db.prepare("INSERT OR REPLACE INTO settings (business_id, key, value) VALUES (?, 'employee_limit', ?)")
      .run(business_id, String(employee_limit));
      
    res.json({ success: true });
  });

  // Employees
  app.get("/api/employees", (req, res) => {
    const { business_id } = req.query;
    const employees = db.prepare("SELECT * FROM employees WHERE business_id = ? AND role != 'owner'").all(business_id);
    res.json(employees);
  });

  app.post("/api/employees", (req, res) => {
    const { name, mobile, password, role, salary, shift_start, shift_end, business_id } = req.body;
    
    if (!business_id) return res.status(400).json({ error: "Business ID required" });

    // Check limit
    const business = db.prepare("SELECT employee_limit FROM businesses WHERE id = ?").get(business_id);
    const count = db.prepare("SELECT COUNT(*) as count FROM employees WHERE business_id = ? AND role != 'owner'").get(business_id).count;
    
    if (count >= business.employee_limit) {
      return res.status(403).json({ error: `Employee limit (${business.employee_limit}) reached for your plan. Please upgrade.` });
    }

    try {
      const info = db.prepare(
        "INSERT INTO employees (name, mobile, password, role, salary, shift_start, shift_end, business_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(name, mobile, password || '123456', role || 'employee', salary, shift_start, shift_end, business_id);
      res.json({ id: info.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: "Mobile number already exists" });
    }
  });

  app.put("/api/employees/:id", (req, res) => {
    const { name, mobile, password, role, salary, shift_start, shift_end } = req.body;
    db.prepare(
      "UPDATE employees SET name = ?, mobile = ?, password = ?, role = ?, salary = ?, shift_start = ?, shift_end = ? WHERE id = ?"
    ).run(name, mobile, password, role, salary, shift_start, shift_end, req.params.id);
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
    
    // Check if already checked in
    const existing = db.prepare("SELECT id FROM attendance WHERE employee_id = ? AND date = ?").get(employee_id, date);
    if (existing) {
      return res.status(400).json({ error: "Already checked in for this date" });
    }

    db.prepare(
      "INSERT INTO attendance (employee_id, date, check_in, is_late, status, latitude, longitude, selfie_url, business_id) VALUES (?, ?, ?, ?, 'present', ?, ?, ?, ?)"
    ).run(employee_id, date, time, is_late ? 1 : 0, latitude, longitude, selfie_url, business_id);
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
    
    // Calculate hours worked
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
    let query = `
      SELECT l.*, e.name 
      FROM leaves l 
      JOIN employees e ON l.employee_id = e.id
      WHERE l.business_id = ?
    `;
    const params = [business_id];
    if (employee_id) {
      query += " AND l.employee_id = ?";
      params.push(employee_id);
    }
    const leaves = db.prepare(query).all(...params);
    res.json(leaves);
  });

  app.post("/api/leaves", (req, res) => {
    const { employee_id, start_date, end_date, reason, business_id } = req.body;
    db.prepare(
      "INSERT INTO leaves (employee_id, start_date, end_date, reason, business_id) VALUES (?, ?, ?, ?, ?)"
    ).run(employee_id, start_date, end_date, reason, business_id);
    res.json({ success: true });
  });

  app.put("/api/leaves/:id/status", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE leaves SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  // Dashboard Stats
  app.get("/api/stats", (req, res) => {
    const { business_id } = req.query;
    const date = new Date().toISOString().split("T")[0];
    
    // Auto-mark absent for yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yDate = yesterday.toISOString().split("T")[0];
    
    const employees = db.prepare("SELECT id FROM employees WHERE business_id = ? AND role != 'owner'").all(business_id);
    for (const emp of employees) {
      const existing = db.prepare("SELECT id FROM attendance WHERE employee_id = ? AND date = ?").get(emp.id, yDate);
      if (!existing) {
        db.prepare("INSERT INTO attendance (employee_id, date, status, business_id) VALUES (?, ?, 'absent', ?)").run(emp.id, yDate, business_id);
      }
    }

    const totalEmployees = db.prepare("SELECT COUNT(*) as count FROM employees WHERE business_id = ?").get(business_id).count;
    const presentToday = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = 'present' AND business_id = ?").get(date, business_id).count;
    const lateToday = db.prepare("SELECT COUNT(*) as count FROM attendance WHERE date = ? AND is_late = 1 AND business_id = ?").get(date, business_id).count;
    
    res.json({
      totalEmployees,
      presentToday,
      absentToday: Math.max(0, totalEmployees - presentToday),
      lateToday
    });
  });

  // Settings
  app.get("/api/settings", (req, res) => {
    const { business_id } = req.query;
    const settings = db.prepare("SELECT * FROM settings WHERE business_id = ?").all(business_id);
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

  // Backup
  app.get("/api/backup", (req, res) => {
    res.download(path.join(__dirname, "attendance.db"));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.error("Vite middleware failed to initialize:", viteErr);
    }
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
