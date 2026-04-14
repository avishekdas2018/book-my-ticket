# Book My Ticket — ChaiCode Cinema 🎬

A simplified movie seat booking platform built with Express.js and PostgreSQL. This project builds upon a starter source code base by adding user authentication (JWT), protected booking endpoints, and a styled frontend UI, all while explicitly preserving the original endpoints and flow.

## Features

- **Starter Foundation Maintained** — The original `GET /seats` and legacy `PUT /:id/:name` endpoints are intact and functional.
- **User Registration & Login** — JWT-based authentication with bcrypt password hashing.
- **Protected Booking** — Verified users can book seats via a protected `PUT /book/:seatId` endpoint.
- **Duplicate Prevention** — Database transactions with row-level locking (`FOR UPDATE`) prevent double-booking.
- **Mocked Movie Data** — Browse current & upcoming showings seamlessly via `/api/movies`.
- **Integrated Architecture** — Everything (db configuration, auth routes, and initial starter logic) runs from a unified `index.mjs` file, precisely adhering to the starter requirements.

## Tech Stack

- **Backend:** Node.js, Express.js 5
- **Database:** PostgreSQL (Designed with support for Neon DB via environment variables)
- **Auth:** JWT (jsonwebtoken) + bcryptjs
- **Frontend:** HTML, Tailwind CSS, Vanilla JS

## Prerequisites

- Node.js (v18+)
- PostgreSQL database (Local or [Neon DB](https://neon.tech))

## Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repo-link>
cd book-my-ticket
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the root of the project using the following template:

```env
# For Neon DB (recommended):
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require

# For local PostgreSQL (fallback):
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=sql_class_2_db

# Security
JWT_SECRET=your_super_secret_key_here

# Server
PORT=8080
```

### 4. Database Initialization 

Run the provided SQL script against your database to set up the necessary tables (`users`, `seats`) and seed initial seat data.

```bash
# Example for local psql:
psql -U postgres -d sql_class_2_db -f db-setup.sql
```
*(If using Neon DB, simply copy-paste the contents of `db-setup.sql` into the Neon SQL Editor and execute it).*

### 5. Start the server

```bash
npm start
```
*The app will be available at [http://localhost:8080](http://localhost:8080)*

---

## API Endpoints

### Original Endpoints (Retained)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Serves the `index.html` frontend |
| `GET` | `/seats` | Get all seats with their booking status |
| `PUT` | `/:id/:name` | Legacy unauthenticated seat booking endpoint |

### Authentication Endpoints
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | `{ username, email, password }` | Register a new user |
| `POST` | `/api/auth/login` | `{ email, password }` | Authenticate user and receive a JWT token |

### Protected Endpoints (Requires `Authorization: Bearer <token>`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `PUT` | `/book/:seatId` | Book a seat using the authenticated user's ID and name |

### Public Auxiliary Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/movies` | Fetch mocked listed movies data for UI rendering |

---

## Application Flow

1. **Initialization:** The server starts, connects to PostgreSQL (Neon DB/Local), and dynamically registers all routes.
2. **Accessing:** A user navigates to `http://localhost:8080` and sees the glassmorphism UI.
3. **Authentication:** 
   - A new user clicks "Sign In" -> "Create Account".
   - The `/api/auth/register` endpoint validates input, hashes the password via `bcrypt`, and generates a secure JWT.
   - The JWT is saved in the browser's `localStorage` for future requests.
4. **Reserving a Seat:**
   - The user clicks an available green seat.
   - The frontend fires a request to `PUT /book/:seatId` with the JWT in the `Authorization` header.
   - The `authMiddleware` inside `index.mjs` decrypts the token to verify identity.
   - A PostgreSQL transaction (`BEGIN`) locks the specific seat row (`FOR UPDATE`). 
   - If available, it marks it booked `isbooked = 1`, assigns the associated `user_id` and name, and `COMMIT`s.
5. **Real-time verification:** The UI visually transitions the seat to Amber, signaling ownership.

## Security Considerations
- Included protection against **SQL Injection** (`$1`, `$2` parameterization).
- **Concurrency control:** Database transaction row-locking to avert race conditions on seating choices.
- Secure **JWT access mechanism** preventing unauthorized bookings on the new routes.
