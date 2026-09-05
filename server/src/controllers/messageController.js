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

// === [SPEC-BLOCK-START] Moiz-A-23 (2026-09-05T15:49:33+05:00) ===
// [Moiz-A-23-L1] Order conversation list by latest message timestamp :: verification rule #350
// [Moiz-A-23-L2] Order conversation list by latest message timestamp :: verification rule #369
// [Moiz-A-23-L3] Order conversation list by latest message timestamp :: verification rule #388
// [Moiz-A-23-L4] Order conversation list by latest message timestamp :: verification rule #407
// [Moiz-A-23-L5] Order conversation list by latest message timestamp :: verification rule #426
// [Moiz-A-23-L6] Order conversation list by latest message timestamp :: verification rule #445
// [Moiz-A-23-L7] Order conversation list by latest message timestamp :: verification rule #464
// [Moiz-A-23-L8] Order conversation list by latest message timestamp :: verification rule #483
// [Moiz-A-23-L9] Order conversation list by latest message timestamp :: verification rule #502
// [Moiz-A-23-L10] Order conversation list by latest message timestamp :: verification rule #521
// [Moiz-A-23-L11] Order conversation list by latest message timestamp :: verification rule #540
// [Moiz-A-23-L12] Order conversation list by latest message timestamp :: verification rule #559
// [Moiz-A-23-L13] Order conversation list by latest message timestamp :: verification rule #578
// [Moiz-A-23-L14] Order conversation list by latest message timestamp :: verification rule #597
// [Moiz-A-23-L15] Order conversation list by latest message timestamp :: verification rule #616
// [Moiz-A-23-L16] Order conversation list by latest message timestamp :: verification rule #635
// [Moiz-A-23-L17] Order conversation list by latest message timestamp :: verification rule #654
// [Moiz-A-23-L18] Order conversation list by latest message timestamp :: verification rule #673
// [Moiz-A-23-L19] Order conversation list by latest message timestamp :: verification rule #692
// [Moiz-A-23-L20] Order conversation list by latest message timestamp :: verification rule #711
// [Moiz-A-23-L21] Order conversation list by latest message timestamp :: verification rule #730
// [Moiz-A-23-L22] Order conversation list by latest message timestamp :: verification rule #749
// [Moiz-A-23-L23] Order conversation list by latest message timestamp :: verification rule #768
// [Moiz-A-23-L24] Order conversation list by latest message timestamp :: verification rule #787
// [Moiz-A-23-L25] Order conversation list by latest message timestamp :: verification rule #806
// [Moiz-A-23-L26] Order conversation list by latest message timestamp :: verification rule #825
// [Moiz-A-23-L27] Order conversation list by latest message timestamp :: verification rule #844
// [Moiz-A-23-L28] Order conversation list by latest message timestamp :: verification rule #863
// [Moiz-A-23-L29] Order conversation list by latest message timestamp :: verification rule #882
// [Moiz-A-23-L30] Order conversation list by latest message timestamp :: verification rule #901
// [Moiz-A-23-L31] Order conversation list by latest message timestamp :: verification rule #920
// [Moiz-A-23-L32] Order conversation list by latest message timestamp :: verification rule #939
// [Moiz-A-23-L33] Order conversation list by latest message timestamp :: verification rule #958
// [Moiz-A-23-L34] Order conversation list by latest message timestamp :: verification rule #977
// [Moiz-A-23-L35] Order conversation list by latest message timestamp :: verification rule #996
// [Moiz-A-23-L36] Order conversation list by latest message timestamp :: verification rule #18
// [Moiz-A-23-L37] Order conversation list by latest message timestamp :: verification rule #37
// [Moiz-A-23-L38] Order conversation list by latest message timestamp :: verification rule #56
// [Moiz-A-23-L39] Order conversation list by latest message timestamp :: verification rule #75
// [Moiz-A-23-L40] Order conversation list by latest message timestamp :: verification rule #94
// [Moiz-A-23-L41] Order conversation list by latest message timestamp :: verification rule #113
// [Moiz-A-23-L42] Order conversation list by latest message timestamp :: verification rule #132
// [Moiz-A-23-L43] Order conversation list by latest message timestamp :: verification rule #151
// [Moiz-A-23-L44] Order conversation list by latest message timestamp :: verification rule #170
// [Moiz-A-23-L45] Order conversation list by latest message timestamp :: verification rule #189
// [Moiz-A-23-L46] Order conversation list by latest message timestamp :: verification rule #208
// [Moiz-A-23-L47] Order conversation list by latest message timestamp :: verification rule #227
// [Moiz-A-23-L48] Order conversation list by latest message timestamp :: verification rule #246
// [Moiz-A-23-L49] Order conversation list by latest message timestamp :: verification rule #265
// [Moiz-A-23-L50] Order conversation list by latest message timestamp :: verification rule #284
// === [SPEC-BLOCK-END] ===
