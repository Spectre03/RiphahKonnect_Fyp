const prisma = require('../config/db');
const { checkTextContent } = require('../utils/moderation');

// GET /api/conversations
const getConversations = async (req, res, next) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { some: { userId: req.user.id } },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, role: true, department: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formatted = conversations.map((c) => ({
      id: c.id,
      isGroup: c.isGroup,
      name: c.name,
      participants: c.participants.map((p) => p.user),
      lastMessage: c.messages[0] || null,
      updatedAt: c.updatedAt,
    }));

    // Deduplicate DM conversations with the same participant (keep most recent / one with messages)
    const seenDmPartners = new Set();
    const deduped = [];
    for (const conv of formatted) {
      if (!conv.isGroup) {
        const other = conv.participants.find((p) => p.id !== req.user.id);
        if (other?.id) {
          if (seenDmPartners.has(other.id)) continue;
          seenDmPartners.add(other.id);
        }
      }
      deduped.push(conv);
    }

    res.json({ conversations: deduped });
  } catch (err) {
    next(err);
  }
};

// POST /api/conversations — create or get existing DM
const createConversation = async (req, res, next) => {
  try {
    const { participantId, isGroup, name } = req.body;

    // For DMs, check if conversation already exists
    if (!isGroup && participantId) {
      const existing = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { participants: { some: { userId: req.user.id } } },
            { participants: { some: { userId: participantId } } },
          ],
        },
        include: {
          participants: {
            include: {
              user: { select: { id: true, name: true, avatarUrl: true, role: true, department: true } },
            },
          },
        },
      });

      if (existing) {
        return res.json({
          conversation: {
            id: existing.id,
            isGroup: existing.isGroup,
            name: existing.name,
            participants: existing.participants.map((p) => p.user),
          },
        });
      }
    }

    const participantIds = isGroup
      ? [req.user.id, ...(req.body.participantIds || [])]
      : [req.user.id, participantId];

    // Deduplicate participant IDs
    const uniqueParticipantIds = [...new Set(participantIds.filter(Boolean))];

    const conversation = await prisma.conversation.create({
      data: {
        isGroup: isGroup || false,
        name: isGroup ? name : null,
        participants: {
          create: uniqueParticipantIds.map((id) => ({ userId: id })),
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, role: true, department: true } },
          },
        },
      },
    });

    res.status(201).json({
      conversation: {
        id: conversation.id,
        isGroup: conversation.isGroup,
        name: conversation.name,
        participants: conversation.participants.map((p) => p.user),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/conversations/:id/messages
const getMessages = async (req, res, next) => {
  try {
    const conversationId = req.params.id;

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: { userId_conversationId: { userId: req.user.id, conversationId } },
    });
    if (!participant) return res.status(403).json({ error: 'Not a participant.' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    res.json({
      messages: messages.reverse(),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/conversations/:id/messages
const sendMessage = async (req, res, next) => {
  try {
    const conversationId = req.params.id;

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: { userId_conversationId: { userId: req.user.id, conversationId } },
    });
    if (!participant) return res.status(403).json({ error: 'Not a participant.' });

    const modCheck = checkTextContent(req.body.content, { minLength: 1, fieldName: 'Message' });
    if (!modCheck.clean) {
      return res.status(400).json({ error: modCheck.reason });
    }

    const message = await prisma.message.create({
      data: {
        content: req.body.content.trim(),
        senderId: req.user.id,
        conversationId,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Find all participants to emit to their personal rooms & create notifications
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    const io = req.app.get('io');
    if (conv) {
      const recipients = conv.participants.filter((p) => p.userId !== req.user.id);
      const preview = message.content.length > 80 ? `${message.content.slice(0, 80)}...` : message.content;

      if (io) {
        conv.participants.forEach((p) => {
          io.to(`user:${p.userId}`).emit('newMessage', message);
        });
      }

      // Create persistent notifications for recipients and emit with real DB ID
      await Promise.all(
        recipients.map(async (p) => {
          try {
            const notif = await prisma.notification.create({
              data: {
                userId: p.userId,
                title: `💬 Message from ${message.sender.name}`,
                content: preview,
                type: 'MESSAGE',
                link: `/messages?userId=${req.user.id}`,
              },
            });
            if (io) {
              io.to(`user:${p.userId}`).emit('notification', notif);
            }
          } catch {
            // Ignore notification creation failure
          }
        })
      );
    }

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/messages/:id/pin
const togglePinMessage = async (req, res, next) => {
  try {
    const messageId = req.params.id;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });
    
    if (!message) return res.status(404).json({ error: 'Message not found.' });

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: { userId_conversationId: { userId: req.user.id, conversationId: message.conversationId } },
    });
    
    if (!participant) return res.status(403).json({ error: 'Not a participant.' });

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { isPinned: !message.isPinned },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } }
    });

    // Emit socket event if available
    const io = req.app.get('io');
    if (io) {
      const conv = await prisma.conversation.findUnique({
        where: { id: message.conversationId },
        include: { participants: true },
      });
      if (conv) {
        conv.participants.forEach((p) => {
          io.to(`user:${p.userId}`).emit('messagePinned', updatedMessage);
        });
      }
    }

    res.json({ message: updatedMessage });
  } catch (err) {
    next(err);
  }
};

module.exports = { getConversations, createConversation, getMessages, sendMessage, togglePinMessage };
