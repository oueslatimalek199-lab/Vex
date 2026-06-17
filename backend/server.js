const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'social_app_secret_key_2024';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ─── IN-MEMORY DATABASE ───────────────────────────────────────────────────────
const db = {
  users: [],
  posts: [],
  comments: [],
  likes: [],        // { userId, postId }
  follows: [],      // { followerId, followingId }
};

// Seed with demo users
async function seedDB() {
  const hash1 = await bcrypt.hash('password123', 10);
  const hash2 = await bcrypt.hash('password123', 10);
  const hash3 = await bcrypt.hash('password123', 10);

  db.users.push(
    { id: 'u1', username: 'loulou', email: 'loulou@isgs.tn', password: hash1, bio: 'BI & Data Analytics student 🎓', avatar: 'L', createdAt: new Date().toISOString() },
    { id: 'u2', username: 'alex_dev', email: 'alex@example.com', password: hash2, bio: 'Full Stack Developer | Coffee lover ☕', avatar: 'A', createdAt: new Date().toISOString() },
    { id: 'u3', username: 'sara_design', email: 'sara@example.com', password: hash3, bio: 'UI/UX Designer | Making things beautiful ✨', avatar: 'S', createdAt: new Date().toISOString() }
  );

  db.posts.push(
    { id: 'p1', userId: 'u2', content: 'Just deployed my first Express.js API! 🚀 The feeling is unmatched. #webdev #nodejs', createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'p2', userId: 'u3', content: 'Working on a new dark-mode design system. Consistency is everything in UI. 🎨 #design #ux', createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'p3', userId: 'u1', content: 'Finished my Data Warehouse project using PostgreSQL + pygramETL. Star schema for the win! ⭐ #BI #dataanalytics', createdAt: new Date(Date.now() - 86400000).toISOString() }
  );

  db.comments.push(
    { id: 'c1', postId: 'p1', userId: 'u1', content: 'Congrats! Express is amazing 🔥', createdAt: new Date(Date.now() - 1800000).toISOString() },
    { id: 'c2', postId: 'p1', userId: 'u3', content: 'Love to see it! What did you build?', createdAt: new Date(Date.now() - 900000).toISOString() },
    { id: 'c3', postId: 'p3', userId: 'u2', content: 'Star schema is the classic choice 👌', createdAt: new Date().toISOString() }
  );

  db.likes.push(
    { userId: 'u1', postId: 'p1' },
    { userId: 'u3', postId: 'p1' },
    { userId: 'u2', postId: 'p3' }
  );

  db.follows.push(
    { followerId: 'u1', followingId: 'u2' },
    { followerId: 'u1', followingId: 'u3' },
    { followerId: 'u2', followingId: 'u3' }
  );
}
seedDB();

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function enrichPost(post, currentUserId) {
  const author = db.users.find(u => u.id === post.userId);
  const likes = db.likes.filter(l => l.postId === post.id);
  const comments = db.comments.filter(c => c.postId === post.id).map(c => {
    const commenter = db.users.find(u => u.id === c.userId);
    return { ...c, author: { username: commenter?.username, avatar: commenter?.avatar } };
  });
  return {
    ...post,
    author: { id: author?.id, username: author?.username, avatar: author?.avatar, bio: author?.bio },
    likesCount: likes.length,
    isLiked: currentUserId ? likes.some(l => l.userId === currentUserId) : false,
    comments,
    commentsCount: comments.length
  };
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, bio } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (db.users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already exists' });
  if (db.users.find(u => u.username === username)) return res.status(400).json({ error: 'Username taken' });

  const hashed = await bcrypt.hash(password, 10);
  const user = { id: uuidv4(), username, email, password: hashed, bio: bio || '', avatar: username[0].toUpperCase(), createdAt: new Date().toISOString() };
  db.users.push(user);

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email, bio: user.bio, avatar: user.avatar } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email);
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, bio: user.bio, avatar: user.avatar } });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

// ─── USER ROUTES ──────────────────────────────────────────────────────────────
app.get('/api/users/:username', authMiddleware, (req, res) => {
  const user = db.users.find(u => u.username === req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const followers = db.follows.filter(f => f.followingId === user.id);
  const following = db.follows.filter(f => f.followerId === user.id);
  const posts = db.posts.filter(p => p.userId === user.id).map(p => enrichPost(p, req.user.id)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const isFollowing = db.follows.some(f => f.followerId === req.user.id && f.followingId === user.id);

  const { password, ...safeUser } = user;
  res.json({ ...safeUser, followersCount: followers.length, followingCount: following.length, postsCount: posts.length, isFollowing, posts });
});

// ─── POST ROUTES ──────────────────────────────────────────────────────────────
app.get('/api/posts/feed', authMiddleware, (req, res) => {
  const following = db.follows.filter(f => f.followerId === req.user.id).map(f => f.followingId);
  const feedUserIds = [...following, req.user.id];
  const posts = db.posts
    .filter(p => feedUserIds.includes(p.userId))
    .map(p => enrichPost(p, req.user.id))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(posts);
});

app.get('/api/posts', authMiddleware, (req, res) => {
  const posts = db.posts.map(p => enrichPost(p, req.user.id)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(posts);
});

app.post('/api/posts', authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  const post = { id: uuidv4(), userId: req.user.id, content: content.trim(), createdAt: new Date().toISOString() };
  db.posts.push(post);
  res.status(201).json(enrichPost(post, req.user.id));
});

app.delete('/api/posts/:id', authMiddleware, (req, res) => {
  const idx = db.posts.findIndex(p => p.id === req.params.id && p.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Post not found or unauthorized' });
  db.posts.splice(idx, 1);
  db.comments = db.comments.filter(c => c.postId !== req.params.id);
  db.likes = db.likes.filter(l => l.postId !== req.params.id);
  res.json({ message: 'Post deleted' });
});

// ─── COMMENT ROUTES ───────────────────────────────────────────────────────────
app.post('/api/posts/:id/comments', authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const user = db.users.find(u => u.id === req.user.id);
  const comment = { id: uuidv4(), postId: req.params.id, userId: req.user.id, content: content.trim(), createdAt: new Date().toISOString() };
  db.comments.push(comment);
  res.status(201).json({ ...comment, author: { username: user.username, avatar: user.avatar } });
});

// ─── LIKE ROUTES ──────────────────────────────────────────────────────────────
app.post('/api/posts/:id/like', authMiddleware, (req, res) => {
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const existingIdx = db.likes.findIndex(l => l.userId === req.user.id && l.postId === req.params.id);
  if (existingIdx !== -1) {
    db.likes.splice(existingIdx, 1);
    res.json({ liked: false, likesCount: db.likes.filter(l => l.postId === req.params.id).length });
  } else {
    db.likes.push({ userId: req.user.id, postId: req.params.id });
    res.json({ liked: true, likesCount: db.likes.filter(l => l.postId === req.params.id).length });
  }
});

// ─── FOLLOW ROUTES ────────────────────────────────────────────────────────────
app.post('/api/users/:id/follow', authMiddleware, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });
  const target = db.users.find(u => u.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });

  const existingIdx = db.follows.findIndex(f => f.followerId === req.user.id && f.followingId === req.params.id);
  if (existingIdx !== -1) {
    db.follows.splice(existingIdx, 1);
    res.json({ following: false, followersCount: db.follows.filter(f => f.followingId === req.params.id).length });
  } else {
    db.follows.push({ followerId: req.user.id, followingId: req.params.id });
    res.json({ following: true, followersCount: db.follows.filter(f => f.followingId === req.params.id).length });
  }
});

app.get('/api/users', authMiddleware, (req, res) => {
  const users = db.users.map(u => {
    const { password, ...safe } = u;
    return {
      ...safe,
      followersCount: db.follows.filter(f => f.followingId === u.id).length,
      isFollowing: db.follows.some(f => f.followerId === req.user.id && f.followingId === u.id)
    };
  }).filter(u => u.id !== req.user.id);
  res.json(users);
});

// ─── SERVE FRONTEND ───────────────────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
