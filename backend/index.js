import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ["GET", "POST"],
  credentials: true,
}));
app.use(express.json());

// Database Connection
const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// --- ROUTES / API ENDPOINTS ---

// 1. REGISTER (Daftar Akun Baru)
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Cek apakah email sudah ada
    const checkUser = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: "Email sudah terdaftar!" });
    }

    // Masukkan ke database (Default role: 'user')
    const newUser = await db.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'user') RETURNING *",
      [name, email, password]
    );
    
    res.json({ message: "Register Berhasil!", user: newUser.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

// 2. LOGIN (Masuk Akun)
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    // Cari user berdasarkan email
    const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);

    if (user.rows.length === 0) {
      return res.status(401).json({ message: "Email tidak ditemukan!" });
    }

    // Cek password (Langsung string comparison utk kecepatan)
    if (password !== user.rows[0].password) {
      return res.status(401).json({ message: "Password salah!" });
    }

    // Login Sukses
    res.json({ 
      message: "Login Berhasil!", 
      user: { 
        id: user.rows[0].id,
        name: user.rows[0].name, 
        email: user.rows[0].email, 
        role: user.rows[0].role 
      } 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server Error" });
  }
});

// 3. GET REVIEWS (Ambil Semua Review)
app.get("/api/reviews", async (req, res) => {
  try {
    // Join tabel reviews dengan users biar dapat nama user-nya
    const allReviews = await db.query(`
      SELECT reviews.*, users.name 
      FROM reviews 
      JOIN users ON reviews.user_id = users.id 
      ORDER BY created_at DESC
    `);
    res.json(allReviews.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Gagal mengambil review" });
  }
});

// 4. POST REVIEW (Kirim Review Baru)
app.post("/api/reviews", async (req, res) => {
  const { user_id, rating, comment } = req.body;
  try {
    const newReview = await db.query(
      "INSERT INTO reviews (user_id, rating, comment) VALUES ($1, $2, $3) RETURNING *",
      [user_id, rating, comment]
    );
    res.json(newReview.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Gagal mengirim review" });
  }
});

// 5. POST SUBSCRIBE (Newsletter)
app.post("/api/subscribe", async (req, res) => {
  const { email } = req.body;
  try {
    // Cek duplikat
    const check = await db.query("SELECT * FROM subscribers WHERE email = $1", [email]);
    if (check.rows.length > 0) {
      return res.status(400).json({ message: "Email sudah terdaftar, Bestie!" });
    }

    await db.query("INSERT INTO subscribers (email) VALUES ($1)", [email]);
    res.json({ message: "Berhasil berlangganan!" });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Gagal subscribe" });
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});