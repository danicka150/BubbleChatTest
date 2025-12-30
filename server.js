const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const multer = require("multer");
const session = require("express-session");
const path = require("path");

const app = express();
const db = new sqlite3.Database("./db.sqlite");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));
app.use(express.static("public"));

app.use(session({
  secret: "bubblechat_secret",
  resave: false,
  saveUninitialized: false
}));

// ===== БАЗА =====
db.run(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  avatar TEXT
)`);

db.run(`
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user TEXT,
  to_user TEXT,
  text TEXT,
  time INTEGER
)`);

// ===== АВАТАРКИ =====
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ===== РЕГИСТРАЦИЯ =====
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, hash],
    err => {
      if (err) return res.json({ error: "Ник занят" });
      res.json({ ok: true });
    }
  );
});

// ===== ЛОГИН =====
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (!user) return res.json({ error: "Нет такого пользователя" });

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.json({ error: "Неверный пароль" });

      req.session.user = user.username;
      res.json({ ok: true });
    }
  );
});

// ===== ПРОФИЛЬ =====
app.get("/me", (req, res) => {
  if (!req.session.user) return res.json(null);
  db.get(
    "SELECT username, avatar FROM users WHERE username = ?",
    [req.session.user],
    (e, u) => res.json(u)
  );
});

// ===== ЗАГРУЗКА АВЫ =====
app.post("/avatar", upload.single("avatar"), (req, res) => {
  if (!req.session.user) return res.sendStatus(403);
  db.run(
    "UPDATE users SET avatar = ? WHERE username = ?",
    [req.file.filename, req.session.user],
    () => res.redirect("/chat.html")
  );
});

// ===== ПОИСК =====
app.get("/search", (req, res) => {
  const q = `%${req.query.q}%`;
  db.all(
    "SELECT username, avatar FROM users WHERE username LIKE ?",
    [q],
    (e, rows) => res.json(rows)
  );
});

// ===== СООБЩЕНИЯ =====
app.get("/messages", (req, res) => {
  const { withUser } = req.query;
  const me = req.session.user;

  db.all(
    `SELECT * FROM messages
     WHERE (from_user=? AND to_user=?)
     OR (from_user=? AND to_user=?)
     ORDER BY time`,
    [me, withUser, withUser, me],
    (e, rows) => res.json(rows)
  );
});

app.post("/send", (req, res) => {
  const me = req.session.user;
  const { to, text } = req.body;

  db.run(
    "INSERT INTO messages (from_user, to_user, text, time) VALUES (?,?,?,?)",
    [me, to, text, Date.now()],
    () => res.json({ ok: true })
  );
});

app.listen(process.env.PORT || 3000, () =>
  console.log("BubbleChat запущен")
);
