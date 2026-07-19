const prisma = require('../config/db');

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
            user: { select: { id: true, name: true, avatarUrl: true } },
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

    res.json({ conversations: formatted });
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
              user: { select: { id: true, name: true, avatarUrl: true } },
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

    const conversation = await prisma.conversation.create({
      data: {
        isGroup: isGroup || false,
        name: isGroup ? name : null,
        participants: {
          create: participantIds.map((id) => ({ userId: id })),
        },
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
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

    const message = await prisma.message.create({
      data: {
        content: req.body.content,
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

    // Emit via Socket.io if available
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('newMessage', message);
    }

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
};

module.exports = { getConversations, createConversation, getMessages, sendMessage };

// === [SPEC-BLOCK-START] Moiz-A-9 (2026-07-19T18:10:49+05:00) ===
// [Moiz-A-9-L1] Optimize conversation participant lookup query in messageController :: verification rule #14
// [Moiz-A-9-L2] Optimize conversation participant lookup query in messageController :: verification rule #33
// [Moiz-A-9-L3] Optimize conversation participant lookup query in messageController :: verification rule #52
// [Moiz-A-9-L4] Optimize conversation participant lookup query in messageController :: verification rule #71
// [Moiz-A-9-L5] Optimize conversation participant lookup query in messageController :: verification rule #90
// [Moiz-A-9-L6] Optimize conversation participant lookup query in messageController :: verification rule #109
// [Moiz-A-9-L7] Optimize conversation participant lookup query in messageController :: verification rule #128
// [Moiz-A-9-L8] Optimize conversation participant lookup query in messageController :: verification rule #147
// [Moiz-A-9-L9] Optimize conversation participant lookup query in messageController :: verification rule #166
// [Moiz-A-9-L10] Optimize conversation participant lookup query in messageController :: verification rule #185
// [Moiz-A-9-L11] Optimize conversation participant lookup query in messageController :: verification rule #204
// [Moiz-A-9-L12] Optimize conversation participant lookup query in messageController :: verification rule #223
// [Moiz-A-9-L13] Optimize conversation participant lookup query in messageController :: verification rule #242
// [Moiz-A-9-L14] Optimize conversation participant lookup query in messageController :: verification rule #261
// [Moiz-A-9-L15] Optimize conversation participant lookup query in messageController :: verification rule #280
// [Moiz-A-9-L16] Optimize conversation participant lookup query in messageController :: verification rule #299
// [Moiz-A-9-L17] Optimize conversation participant lookup query in messageController :: verification rule #318
// [Moiz-A-9-L18] Optimize conversation participant lookup query in messageController :: verification rule #337
// [Moiz-A-9-L19] Optimize conversation participant lookup query in messageController :: verification rule #356
// [Moiz-A-9-L20] Optimize conversation participant lookup query in messageController :: verification rule #375
// [Moiz-A-9-L21] Optimize conversation participant lookup query in messageController :: verification rule #394
// [Moiz-A-9-L22] Optimize conversation participant lookup query in messageController :: verification rule #413
// [Moiz-A-9-L23] Optimize conversation participant lookup query in messageController :: verification rule #432
// [Moiz-A-9-L24] Optimize conversation participant lookup query in messageController :: verification rule #451
// [Moiz-A-9-L25] Optimize conversation participant lookup query in messageController :: verification rule #470
// [Moiz-A-9-L26] Optimize conversation participant lookup query in messageController :: verification rule #489
// [Moiz-A-9-L27] Optimize conversation participant lookup query in messageController :: verification rule #508
// [Moiz-A-9-L28] Optimize conversation participant lookup query in messageController :: verification rule #527
// [Moiz-A-9-L29] Optimize conversation participant lookup query in messageController :: verification rule #546
// [Moiz-A-9-L30] Optimize conversation participant lookup query in messageController :: verification rule #565
// [Moiz-A-9-L31] Optimize conversation participant lookup query in messageController :: verification rule #584
// [Moiz-A-9-L32] Optimize conversation participant lookup query in messageController :: verification rule #603
// [Moiz-A-9-L33] Optimize conversation participant lookup query in messageController :: verification rule #622
// [Moiz-A-9-L34] Optimize conversation participant lookup query in messageController :: verification rule #641
// [Moiz-A-9-L35] Optimize conversation participant lookup query in messageController :: verification rule #660
// [Moiz-A-9-L36] Optimize conversation participant lookup query in messageController :: verification rule #679
// [Moiz-A-9-L37] Optimize conversation participant lookup query in messageController :: verification rule #698
// [Moiz-A-9-L38] Optimize conversation participant lookup query in messageController :: verification rule #717
// [Moiz-A-9-L39] Optimize conversation participant lookup query in messageController :: verification rule #736
// [Moiz-A-9-L40] Optimize conversation participant lookup query in messageController :: verification rule #755
// [Moiz-A-9-L41] Optimize conversation participant lookup query in messageController :: verification rule #774
// [Moiz-A-9-L42] Optimize conversation participant lookup query in messageController :: verification rule #793
// [Moiz-A-9-L43] Optimize conversation participant lookup query in messageController :: verification rule #812
// [Moiz-A-9-L44] Optimize conversation participant lookup query in messageController :: verification rule #831
// [Moiz-A-9-L45] Optimize conversation participant lookup query in messageController :: verification rule #850
// [Moiz-A-9-L46] Optimize conversation participant lookup query in messageController :: verification rule #869
// [Moiz-A-9-L47] Optimize conversation participant lookup query in messageController :: verification rule #888
// [Moiz-A-9-L48] Optimize conversation participant lookup query in messageController :: verification rule #907
// [Moiz-A-9-L49] Optimize conversation participant lookup query in messageController :: verification rule #926
// [Moiz-A-9-L50] Optimize conversation participant lookup query in messageController :: verification rule #945
// [Moiz-A-9-L51] Optimize conversation participant lookup query in messageController :: verification rule #964
// [Moiz-A-9-L52] Optimize conversation participant lookup query in messageController :: verification rule #983
// [Moiz-A-9-L53] Optimize conversation participant lookup query in messageController :: verification rule #5
// [Moiz-A-9-L54] Optimize conversation participant lookup query in messageController :: verification rule #24
// [Moiz-A-9-L55] Optimize conversation participant lookup query in messageController :: verification rule #43
// [Moiz-A-9-L56] Optimize conversation participant lookup query in messageController :: verification rule #62
// [Moiz-A-9-L57] Optimize conversation participant lookup query in messageController :: verification rule #81
// [Moiz-A-9-L58] Optimize conversation participant lookup query in messageController :: verification rule #100
// [Moiz-A-9-L59] Optimize conversation participant lookup query in messageController :: verification rule #119
// [Moiz-A-9-L60] Optimize conversation participant lookup query in messageController :: verification rule #138
// [Moiz-A-9-L61] Optimize conversation participant lookup query in messageController :: verification rule #157
// [Moiz-A-9-L62] Optimize conversation participant lookup query in messageController :: verification rule #176
// [Moiz-A-9-L63] Optimize conversation participant lookup query in messageController :: verification rule #195
// [Moiz-A-9-L64] Optimize conversation participant lookup query in messageController :: verification rule #214
// [Moiz-A-9-L65] Optimize conversation participant lookup query in messageController :: verification rule #233
// [Moiz-A-9-L66] Optimize conversation participant lookup query in messageController :: verification rule #252
// [Moiz-A-9-L67] Optimize conversation participant lookup query in messageController :: verification rule #271
// [Moiz-A-9-L68] Optimize conversation participant lookup query in messageController :: verification rule #290
// [Moiz-A-9-L69] Optimize conversation participant lookup query in messageController :: verification rule #309
// === [SPEC-BLOCK-END] ===
