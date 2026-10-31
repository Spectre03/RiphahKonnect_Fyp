require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const semesterGroupRoutes = require('./routes/semesterGroupRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const eventRoutes = require('./routes/eventRoutes');
const lostFoundRoutes = require('./routes/lostFoundRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/semester-groups', semesterGroupRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/lost-found', lostFoundRoutes);
app.use('/api/conversations', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tickets', ticketRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Make io accessible in controllers via req.app.get('io')
app.set('io', io);

// Track online users: Map<userId, Set<socketId>>
// (Using a Set of socket IDs allows a user to be connected from multiple tabs/devices)
const onlineUsers = new Map();
app.set('onlineUsers', onlineUsers);

// Socket.io
io.on('connection', (socket) => {
  let currentUserId = socket.handshake.query?.userId || null;

  const registerOnline = (userId) => {
    if (!userId || userId === 'undefined') return;
    currentUserId = userId;
    socket.join(`user:${userId}`);

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
      socket.broadcast.emit('userOnline', userId);
    }
    onlineUsers.get(userId).add(socket.id);

    const list = Array.from(onlineUsers.keys());
    socket.emit('onlineUsers', list);
    io.emit('online_users', list);
  };

  if (currentUserId) {
    registerOnline(currentUserId);
  }

  // 1. Identify User
  socket.on('identify', (userId) => {
    registerOnline(userId);
  });

  socket.on('request_online_users', () => {
    const list = Array.from(onlineUsers.keys());
    socket.emit('onlineUsers', list);
    socket.emit('online_users', list);
  });

  // 2. Conversation Rooms
  socket.on('joinConversation', (conversationId) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on('leaveConversation', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
  });

  // 3. Disconnect
  socket.on('disconnect', () => {
    if (currentUserId && onlineUsers.has(currentUserId)) {
      const userSockets = onlineUsers.get(currentUserId);
      userSockets.delete(socket.id);

      // If no sockets left for this user, they are totally offline
      if (userSockets.size === 0) {
        onlineUsers.delete(currentUserId);
        io.emit('userOffline', currentUserId);
        io.emit('online_users', Array.from(onlineUsers.keys()));
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io };
