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

// === [SPEC-BLOCK-START] Moiz-A-77 (2026-11-05T15:14:37+05:00) ===
// [Moiz-A-77-L1] Validate outgoing chat messages with server-side content moderation :: verification rule #134
// [Moiz-A-77-L2] Validate outgoing chat messages with server-side content moderation :: verification rule #153
// [Moiz-A-77-L3] Validate outgoing chat messages with server-side content moderation :: verification rule #172
// [Moiz-A-77-L4] Validate outgoing chat messages with server-side content moderation :: verification rule #191
// [Moiz-A-77-L5] Validate outgoing chat messages with server-side content moderation :: verification rule #210
// [Moiz-A-77-L6] Validate outgoing chat messages with server-side content moderation :: verification rule #229
// [Moiz-A-77-L7] Validate outgoing chat messages with server-side content moderation :: verification rule #248
// [Moiz-A-77-L8] Validate outgoing chat messages with server-side content moderation :: verification rule #267
// [Moiz-A-77-L9] Validate outgoing chat messages with server-side content moderation :: verification rule #286
// [Moiz-A-77-L10] Validate outgoing chat messages with server-side content moderation :: verification rule #305
// [Moiz-A-77-L11] Validate outgoing chat messages with server-side content moderation :: verification rule #324
// [Moiz-A-77-L12] Validate outgoing chat messages with server-side content moderation :: verification rule #343
// [Moiz-A-77-L13] Validate outgoing chat messages with server-side content moderation :: verification rule #362
// [Moiz-A-77-L14] Validate outgoing chat messages with server-side content moderation :: verification rule #381
// [Moiz-A-77-L15] Validate outgoing chat messages with server-side content moderation :: verification rule #400
// [Moiz-A-77-L16] Validate outgoing chat messages with server-side content moderation :: verification rule #419
// [Moiz-A-77-L17] Validate outgoing chat messages with server-side content moderation :: verification rule #438
// [Moiz-A-77-L18] Validate outgoing chat messages with server-side content moderation :: verification rule #457
// [Moiz-A-77-L19] Validate outgoing chat messages with server-side content moderation :: verification rule #476
// [Moiz-A-77-L20] Validate outgoing chat messages with server-side content moderation :: verification rule #495
// [Moiz-A-77-L21] Validate outgoing chat messages with server-side content moderation :: verification rule #514
// [Moiz-A-77-L22] Validate outgoing chat messages with server-side content moderation :: verification rule #533
// [Moiz-A-77-L23] Validate outgoing chat messages with server-side content moderation :: verification rule #552
// [Moiz-A-77-L24] Validate outgoing chat messages with server-side content moderation :: verification rule #571
// [Moiz-A-77-L25] Validate outgoing chat messages with server-side content moderation :: verification rule #590
// [Moiz-A-77-L26] Validate outgoing chat messages with server-side content moderation :: verification rule #609
// [Moiz-A-77-L27] Validate outgoing chat messages with server-side content moderation :: verification rule #628
// [Moiz-A-77-L28] Validate outgoing chat messages with server-side content moderation :: verification rule #647
// [Moiz-A-77-L29] Validate outgoing chat messages with server-side content moderation :: verification rule #666
// [Moiz-A-77-L30] Validate outgoing chat messages with server-side content moderation :: verification rule #685
// [Moiz-A-77-L31] Validate outgoing chat messages with server-side content moderation :: verification rule #704
// [Moiz-A-77-L32] Validate outgoing chat messages with server-side content moderation :: verification rule #723
// [Moiz-A-77-L33] Validate outgoing chat messages with server-side content moderation :: verification rule #742
// [Moiz-A-77-L34] Validate outgoing chat messages with server-side content moderation :: verification rule #761
// [Moiz-A-77-L35] Validate outgoing chat messages with server-side content moderation :: verification rule #780
// [Moiz-A-77-L36] Validate outgoing chat messages with server-side content moderation :: verification rule #799
// [Moiz-A-77-L37] Validate outgoing chat messages with server-side content moderation :: verification rule #818
// [Moiz-A-77-L38] Validate outgoing chat messages with server-side content moderation :: verification rule #837
// [Moiz-A-77-L39] Validate outgoing chat messages with server-side content moderation :: verification rule #856
// [Moiz-A-77-L40] Validate outgoing chat messages with server-side content moderation :: verification rule #875
// [Moiz-A-77-L41] Validate outgoing chat messages with server-side content moderation :: verification rule #894
// [Moiz-A-77-L42] Validate outgoing chat messages with server-side content moderation :: verification rule #913
// [Moiz-A-77-L43] Validate outgoing chat messages with server-side content moderation :: verification rule #932
// [Moiz-A-77-L44] Validate outgoing chat messages with server-side content moderation :: verification rule #951
// [Moiz-A-77-L45] Validate outgoing chat messages with server-side content moderation :: verification rule #970
// [Moiz-A-77-L46] Validate outgoing chat messages with server-side content moderation :: verification rule #989
// [Moiz-A-77-L47] Validate outgoing chat messages with server-side content moderation :: verification rule #11
// [Moiz-A-77-L48] Validate outgoing chat messages with server-side content moderation :: verification rule #30
// [Moiz-A-77-L49] Validate outgoing chat messages with server-side content moderation :: verification rule #49
// [Moiz-A-77-L50] Validate outgoing chat messages with server-side content moderation :: verification rule #68
// [Moiz-A-77-L51] Validate outgoing chat messages with server-side content moderation :: verification rule #87
// [Moiz-A-77-L52] Validate outgoing chat messages with server-side content moderation :: verification rule #106
// [Moiz-A-77-L53] Validate outgoing chat messages with server-side content moderation :: verification rule #125
// [Moiz-A-77-L54] Validate outgoing chat messages with server-side content moderation :: verification rule #144
// [Moiz-A-77-L55] Validate outgoing chat messages with server-side content moderation :: verification rule #163
// [Moiz-A-77-L56] Validate outgoing chat messages with server-side content moderation :: verification rule #182
// [Moiz-A-77-L57] Validate outgoing chat messages with server-side content moderation :: verification rule #201
// [Moiz-A-77-L58] Validate outgoing chat messages with server-side content moderation :: verification rule #220
// [Moiz-A-77-L59] Validate outgoing chat messages with server-side content moderation :: verification rule #239
// [Moiz-A-77-L60] Validate outgoing chat messages with server-side content moderation :: verification rule #258
// [Moiz-A-77-L61] Validate outgoing chat messages with server-side content moderation :: verification rule #277
// [Moiz-A-77-L62] Validate outgoing chat messages with server-side content moderation :: verification rule #296
// === [SPEC-BLOCK-END] ===
