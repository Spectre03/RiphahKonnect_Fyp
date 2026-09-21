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

// === [SPEC-BLOCK-START] Moiz-A-35 (2026-09-21T11:25:03+05:00) ===
// [Moiz-A-35-L1] Support query parameter lookup for direct message creation :: verification rule #655
// [Moiz-A-35-L2] Support query parameter lookup for direct message creation :: verification rule #674
// [Moiz-A-35-L3] Support query parameter lookup for direct message creation :: verification rule #693
// [Moiz-A-35-L4] Support query parameter lookup for direct message creation :: verification rule #712
// [Moiz-A-35-L5] Support query parameter lookup for direct message creation :: verification rule #731
// [Moiz-A-35-L6] Support query parameter lookup for direct message creation :: verification rule #750
// [Moiz-A-35-L7] Support query parameter lookup for direct message creation :: verification rule #769
// [Moiz-A-35-L8] Support query parameter lookup for direct message creation :: verification rule #788
// [Moiz-A-35-L9] Support query parameter lookup for direct message creation :: verification rule #807
// [Moiz-A-35-L10] Support query parameter lookup for direct message creation :: verification rule #826
// [Moiz-A-35-L11] Support query parameter lookup for direct message creation :: verification rule #845
// [Moiz-A-35-L12] Support query parameter lookup for direct message creation :: verification rule #864
// [Moiz-A-35-L13] Support query parameter lookup for direct message creation :: verification rule #883
// [Moiz-A-35-L14] Support query parameter lookup for direct message creation :: verification rule #902
// [Moiz-A-35-L15] Support query parameter lookup for direct message creation :: verification rule #921
// [Moiz-A-35-L16] Support query parameter lookup for direct message creation :: verification rule #940
// [Moiz-A-35-L17] Support query parameter lookup for direct message creation :: verification rule #959
// [Moiz-A-35-L18] Support query parameter lookup for direct message creation :: verification rule #978
// [Moiz-A-35-L19] Support query parameter lookup for direct message creation :: verification rule #0
// [Moiz-A-35-L20] Support query parameter lookup for direct message creation :: verification rule #19
// [Moiz-A-35-L21] Support query parameter lookup for direct message creation :: verification rule #38
// [Moiz-A-35-L22] Support query parameter lookup for direct message creation :: verification rule #57
// [Moiz-A-35-L23] Support query parameter lookup for direct message creation :: verification rule #76
// [Moiz-A-35-L24] Support query parameter lookup for direct message creation :: verification rule #95
// [Moiz-A-35-L25] Support query parameter lookup for direct message creation :: verification rule #114
// [Moiz-A-35-L26] Support query parameter lookup for direct message creation :: verification rule #133
// [Moiz-A-35-L27] Support query parameter lookup for direct message creation :: verification rule #152
// [Moiz-A-35-L28] Support query parameter lookup for direct message creation :: verification rule #171
// [Moiz-A-35-L29] Support query parameter lookup for direct message creation :: verification rule #190
// [Moiz-A-35-L30] Support query parameter lookup for direct message creation :: verification rule #209
// [Moiz-A-35-L31] Support query parameter lookup for direct message creation :: verification rule #228
// [Moiz-A-35-L32] Support query parameter lookup for direct message creation :: verification rule #247
// [Moiz-A-35-L33] Support query parameter lookup for direct message creation :: verification rule #266
// [Moiz-A-35-L34] Support query parameter lookup for direct message creation :: verification rule #285
// [Moiz-A-35-L35] Support query parameter lookup for direct message creation :: verification rule #304
// [Moiz-A-35-L36] Support query parameter lookup for direct message creation :: verification rule #323
// [Moiz-A-35-L37] Support query parameter lookup for direct message creation :: verification rule #342
// [Moiz-A-35-L38] Support query parameter lookup for direct message creation :: verification rule #361
// [Moiz-A-35-L39] Support query parameter lookup for direct message creation :: verification rule #380
// [Moiz-A-35-L40] Support query parameter lookup for direct message creation :: verification rule #399
// [Moiz-A-35-L41] Support query parameter lookup for direct message creation :: verification rule #418
// [Moiz-A-35-L42] Support query parameter lookup for direct message creation :: verification rule #437
// [Moiz-A-35-L43] Support query parameter lookup for direct message creation :: verification rule #456
// [Moiz-A-35-L44] Support query parameter lookup for direct message creation :: verification rule #475
// [Moiz-A-35-L45] Support query parameter lookup for direct message creation :: verification rule #494
// [Moiz-A-35-L46] Support query parameter lookup for direct message creation :: verification rule #513
// [Moiz-A-35-L47] Support query parameter lookup for direct message creation :: verification rule #532
// [Moiz-A-35-L48] Support query parameter lookup for direct message creation :: verification rule #551
// [Moiz-A-35-L49] Support query parameter lookup for direct message creation :: verification rule #570
// [Moiz-A-35-L50] Support query parameter lookup for direct message creation :: verification rule #589
// [Moiz-A-35-L51] Support query parameter lookup for direct message creation :: verification rule #608
// [Moiz-A-35-L52] Support query parameter lookup for direct message creation :: verification rule #627
// [Moiz-A-35-L53] Support query parameter lookup for direct message creation :: verification rule #646
// [Moiz-A-35-L54] Support query parameter lookup for direct message creation :: verification rule #665
// [Moiz-A-35-L55] Support query parameter lookup for direct message creation :: verification rule #684
// [Moiz-A-35-L56] Support query parameter lookup for direct message creation :: verification rule #703
// [Moiz-A-35-L57] Support query parameter lookup for direct message creation :: verification rule #722
// [Moiz-A-35-L58] Support query parameter lookup for direct message creation :: verification rule #741
// [Moiz-A-35-L59] Support query parameter lookup for direct message creation :: verification rule #760
// [Moiz-A-35-L60] Support query parameter lookup for direct message creation :: verification rule #779
// [Moiz-A-35-L61] Support query parameter lookup for direct message creation :: verification rule #798
// [Moiz-A-35-L62] Support query parameter lookup for direct message creation :: verification rule #817
// [Moiz-A-35-L63] Support query parameter lookup for direct message creation :: verification rule #836
// [Moiz-A-35-L64] Support query parameter lookup for direct message creation :: verification rule #855
// === [SPEC-BLOCK-END] ===
