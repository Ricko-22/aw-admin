import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import pg from "pg";

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 5000;

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USER = {
  username: process.env.ADMIN_USERNAME,
  password: process.env.ADMIN_PASSWORD
};

app.use(cors());
app.use(express.json());

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL tidak ditemukan di file .env");
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET tidak ditemukan di file .env");
  process.exit(1);
}

if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
  console.error("❌ ADMIN_USERNAME atau ADMIN_PASSWORD tidak ditemukan di file .env");
  process.exit(1);
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
pool.on("error", (err) => console.error("❌ PostgreSQL Error:", err));

app.get("/", (req, res) => res.json({ success: true, message: "AW Laundry API berjalan" }));
app.get("/test", (req, res) => res.json({ success: true, message: "Server OK" }));

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pesanan (
        id SERIAL PRIMARY KEY,
        nota VARCHAR(20) UNIQUE NOT NULL,
        nama VARCHAR(100) NOT NULL,
        hp VARCHAR(20) NOT NULL,
        alamat TEXT,
        layanan VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Menunggu Penjemputan',
        tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Tabel pesanan siap");
  } catch (err) {
    console.error("❌ Gagal init DB:", err);
  }
};
initDB();

const verifyToken = (req, res, next) => {
  console.log("=== VERIFY TOKEN ===");

  const authHeader = req.headers.authorization;
  console.log("Authorization:", authHeader);

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Token tidak ditemukan",
    });
  }

  const token = authHeader.split(" ")[1];
  console.log("Token:", token);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    console.log("Verify Error:", err);
    console.log("User:", user);

    if (err) {
      return res.status(403).json({
        success: false,
        message: "Token tidak valid",
      });
    }

    req.user = user;
    next();
  });
};

/* ========================= LOGIN ========================= */
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN_USER.username || password !== ADMIN_USER.password)
    return res.status(401).json({ success: false, message: "Username atau password salah" });
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "8h" });
  res.json({ success: true, message: "Login berhasil", token });
});

/* ========================= TAMBAH PESANAN ========================= */
app.post("/pesanan", async (req, res) => {
  try {
    const { nota, nama, hp, alamat, layanan, status } = req.body;
    const result = await pool.query(
      `INSERT INTO pesanan (nota, nama, hp, alamat, layanan, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nota, nama, hp, alamat || "", layanan, status || "Menunggu Penjemputan"]
    );
    res.json({ success: true, message: "Pesanan berhasil disimpan", data: result.rows[0] });
  } catch (err) {
    console.error("❌ Gagal tambah pesanan:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ========================= AMBIL SEMUA PESANAN (admin) ========================= */
app.get("/pesanan", verifyToken, async (req, res) => {
  console.log("=== GET /pesanan dipanggil ===");

  try {
    const result = await pool.query(
      "SELECT * FROM pesanan ORDER BY tanggal DESC"
    );

    console.log("Jumlah data:", result.rows.length);

    res.json({
      success: true,
      data: result.rows,
    });

  } catch (err) {
    console.error("❌ ERROR GET /pesanan", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
/* ========================= TRACKING BY HP ========================= */
app.get("/tracking/hp/:hp", async (req, res) => {
  try {
    const hp = req.params.hp.trim();
    const result = await pool.query(
      `SELECT * FROM pesanan WHERE hp = $1 ORDER BY tanggal DESC`, [hp]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "Data tidak ditemukan untuk nomor HP ini" });
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("❌ Gagal tracking by HP:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ========================= TRACKING BY ID ========================= */
app.get("/tracking/id/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: "ID tidak valid" });
    const result = await pool.query(`SELECT * FROM pesanan WHERE id = $1`, [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "Data tidak ditemukan untuk ID ini" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("❌ Gagal tracking by ID:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ========================= TRACKING BY NOTA ========================= */
app.get("/tracking/nota/:kode", async (req, res) => {
  try {
    const kode = req.params.kode.toUpperCase();
    const result = await pool.query(
      `SELECT * FROM pesanan WHERE UPPER(nota) = $1`, [kode]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "Data tidak ditemukan" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("❌ Gagal tracking:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ========================= UPDATE STATUS (admin) ========================= */
app.put("/pesanan/:nota", verifyToken, async (req, res) => {
  try {
    const { nota } = req.params;
    const { status } = req.body;
    const result = await pool.query(
      `UPDATE pesanan SET status = $1 WHERE nota = $2 RETURNING *`, [status, nota]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    res.json({ success: true, message: "Status berhasil diperbarui", data: result.rows[0] });
  } catch (err) {
    console.error("❌ Gagal update status:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ========================= HAPUS PESANAN (admin) ========================= */
app.delete("/pesanan/:nota", verifyToken, async (req, res) => {
  try {
    const { nota } = req.params;
    const result = await pool.query(
      `DELETE FROM pesanan WHERE nota = $1 RETURNING *`, [nota]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    res.json({ success: true, message: "Pesanan berhasil dihapus" });
  } catch (err) {
    console.error("❌ Gagal hapus pesanan:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ========================= SERVER ========================= */
app.listen(PORT, () => {
  console.log(`\n🚀 Server jalan di http://localhost:${PORT}\n`);
  console.log("POST   /login");
  console.log("POST   /pesanan");
  console.log("GET    /pesanan              (JWT)");
  console.log("GET    /tracking/hp/:hp");
  console.log("GET    /tracking/id/:id");
  console.log("GET    /tracking/nota/:kode");
  console.log("PUT    /pesanan/:nota        (JWT)");
  console.log("DELETE /pesanan/:nota        (JWT)");
  console.log("");
});
