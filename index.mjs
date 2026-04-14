//  CREATE TABLE seats (
//      id SERIAL PRIMARY KEY,
//      name VARCHAR(255),
//      isbooked INT DEFAULT 0
//  );
// INSERT INTO seats (isbooked)
// SELECT 0 FROM generate_series(1, 20);

import express from "express";
import pg from "pg";
import { dirname } from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 8080;

let pool;
if (process.env.DATABASE_URL) {
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    connectionTimeoutMillis: 0,
    idleTimeoutMillis: 0,
  });
} else {
  pool = new pg.Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "sql_class_2_db",
    max: 20,
    connectionTimeoutMillis: 0,
    idleTimeoutMillis: 0,
  });
}

const app = new express();

// Middleware
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "book-my-ticket-secret-key-2024";

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};

// frontend
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// get all seats
app.get("/seats", async (req, res) => {
  try {
    const result = await pool.query("select * from seats"); // equivalent to Seats.find() in mongoose
    res.send(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch seats" });
  }
});

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "Username, email, and password are required." });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters." });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [email, username],
    );

    if (existingUser.rowCount > 0) {
      return res
        .status(409)
        .json({ error: "User with this email or username already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, created_at",
      [username, email, hashedPassword],
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.status(201).json({
      message: "Registration successful.",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const result = await pool.query(
      "SELECT id, username, email, password FROM users WHERE email = $1",
      [email],
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      message: "Login successful.",
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Mocked Movies

const movies = [
  {
    id: 1,
    title: "Dhurandhar The Revenge",
    genre: "Action / Thriller",
    duration: "2h 35m",
    rating: "8.4",
    showtime: "7:00 PM",
    poster: "https://placehold.co/300x450/1e293b/e2e8f0?text=Dhurandhar",
    description:
      "Jassi ko ghar ki yaad kyu nhi aai? Find out in this action-packed blockbuster.",
  },
  {
    id: 2,
    title: "Cyber Heist 2026",
    genre: "Sci-Fi / Crime",
    duration: "2h 10m",
    rating: "7.9",
    showtime: "9:30 PM",
    poster: "https://placehold.co/300x450/1e293b/e2e8f0?text=Cyber+Heist",
    description:
      "A team of hackers plan the ultimate digital heist in a world controlled by AI.",
  },
  {
    id: 3,
    title: "Echoes of Tomorrow",
    genre: "Drama / Romance",
    duration: "1h 55m",
    rating: "8.1",
    showtime: "4:00 PM",
    poster: "https://placehold.co/300x450/1e293b/e2e8f0?text=Echoes",
    description:
      "A love story that transcends time, set against the backdrop of a changing world.",
  },
];

app.get("/api/movies", (req, res) => {
  res.json(movies);
});

// Protected booking
app.put("/book/:seatId", authMiddleware, async (req, res) => {
  const conn = await pool.connect();

  try {
    const seatId = req.params.seatId;
    const { id: userId, username } = req.user;

    await conn.query("BEGIN");

    const sql = "SELECT * FROM seats WHERE id = $1 AND isbooked = 0 FOR UPDATE";
    const result = await conn.query(sql, [seatId]);

    if (result.rowCount === 0) {
      await conn.query("ROLLBACK");
      return res.status(409).json({ error: "Seat already booked." });
    }

    const sqlU =
      "UPDATE seats SET isbooked = 1, name = $2, user_id = $3 WHERE id = $1";
    const updateResult = await conn.query(sqlU, [seatId, username, userId]);

    await conn.query("COMMIT");

    res.json({
      message: "Seat booked successfully!",
      seat: {
        id: parseInt(seatId),
        name: username,
        isbooked: 1,
        user_id: userId,
      },
    });
  } catch (err) {
    await conn.query("ROLLBACK");
    console.error("Booking error:", err);
    res.status(500).json({ error: "Failed to book seat." });
  } finally {
    conn.release();
  }
});

// book a seat give the seatId and your name

app.put("/:id/:name", async (req, res) => {
  try {
    const id = req.params.id;
    const name = req.params.name;
    // payment integration should be here
    // verify payment
    const conn = await pool.connect(); // pick a connection from the pool
    //begin transaction
    // KEEP THE TRANSACTION AS SMALL AS POSSIBLE
    await conn.query("BEGIN");
    //getting the row to make sure it is not booked
    /// $1 is a variable which we are passing in the array as the second parameter of query function,
    // Why do we use $1? -> this is to avoid SQL INJECTION
    // (If you do ${id} directly in the query string,
    // then it can be manipulated by the user to execute malicious SQL code)
    const sql = "SELECT * FROM seats where id = $1 and isbooked = 0 FOR UPDATE";
    const result = await conn.query(sql, [id]);

    //if no rows found then the operation should fail can't book
    // This shows we Do not have the current seat available for booking
    if (result.rowCount === 0) {
      res.send({ error: "Seat already booked" });
      return;
    }
    //if we get the row, we are safe to update
    const sqlU = "update seats set isbooked = 1, name = $2 where id = $1";
    const updateResult = await conn.query(sqlU, [id, name]); // Again to avoid SQL INJECTION we are using $1 and $2 as placeholders

    //end transaction by committing
    await conn.query("COMMIT");
    conn.release(); // release the connection back to the pool (so we do not keep the connection open unnecessarily)
    res.send(updateResult);
  } catch (ex) {
    console.log(ex);
    res.send(500);
  }
});

app.listen(port, () => console.log("Server starting on port: " + port));
