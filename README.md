# Vex — Mini Social Media Platform

A full-stack social media app built with **Express.js** + **HTML/CSS/JS**.

## Features
- ✅ User registration & login (JWT auth + bcrypt)
- ✅ User profiles with bio, follower/following counts
- ✅ Create, view, and delete posts
- ✅ Like/unlike posts (toggle)
- ✅ Comments on posts
- ✅ Follow/unfollow system
- ✅ Feed (All posts or Following only)
- ✅ Explore page to discover users

## Tech Stack
| Layer    | Technology              |
|----------|-------------------------|
| Backend  | Node.js + Express.js    |
| Auth     | JWT + bcryptjs          |
| Database | In-memory (production: replace with MySQL/PostgreSQL) |
| Frontend | HTML5 + CSS3 + Vanilla JS |

## Project Structure
```
social-app/
├── backend/
│   ├── server.js       ← Express API (all routes)
│   └── package.json
└── frontend/
    └── public/
        └── index.html  ← Single Page App
```

## API Endpoints

### Auth
| Method | Endpoint           | Description        |
|--------|--------------------|--------------------|
| POST   | /api/auth/register | Register new user  |
| POST   | /api/auth/login    | Login              |
| GET    | /api/auth/me       | Get current user   |

### Posts
| Method | Endpoint              | Description          |
|--------|-----------------------|----------------------|
| GET    | /api/posts            | Get all posts        |
| GET    | /api/posts/feed       | Get following feed   |
| POST   | /api/posts            | Create a post        |
| DELETE | /api/posts/:id        | Delete a post        |
| POST   | /api/posts/:id/like   | Like/unlike a post   |
| POST   | /api/posts/:id/comments | Add a comment      |

### Users
| Method | Endpoint              | Description          |
|--------|-----------------------|----------------------|
| GET    | /api/users            | List all users       |
| GET    | /api/users/:username  | Get user profile     |
| POST   | /api/users/:id/follow | Follow/unfollow user |

## How to Run

```bash
cd backend
npm install
node server.js
```

Open http://localhost:3000

**Demo credentials:** `loulou@isgs.tn` / `password123`

## Database Schema (for MySQL/PostgreSQL migration)

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  bio TEXT,
  avatar CHAR(1),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comments (
  id VARCHAR(36) PRIMARY KEY,
  post_id VARCHAR(36) REFERENCES posts(id),
  user_id VARCHAR(36) REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE likes (
  user_id VARCHAR(36) REFERENCES users(id),
  post_id VARCHAR(36) REFERENCES posts(id),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE follows (
  follower_id VARCHAR(36) REFERENCES users(id),
  following_id VARCHAR(36) REFERENCES users(id),
  PRIMARY KEY (follower_id, following_id)
);
```
