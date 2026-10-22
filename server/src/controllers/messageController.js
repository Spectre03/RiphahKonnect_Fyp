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

// === [SPEC-BLOCK-START] Moiz-A-61 (2026-10-22T15:11:05+05:00) ===
// [Moiz-A-61-L1] Create persistent notification record on incoming direct message :: verification rule #454
// [Moiz-A-61-L2] Create persistent notification record on incoming direct message :: verification rule #473
// [Moiz-A-61-L3] Create persistent notification record on incoming direct message :: verification rule #492
// [Moiz-A-61-L4] Create persistent notification record on incoming direct message :: verification rule #511
// [Moiz-A-61-L5] Create persistent notification record on incoming direct message :: verification rule #530
// [Moiz-A-61-L6] Create persistent notification record on incoming direct message :: verification rule #549
// [Moiz-A-61-L7] Create persistent notification record on incoming direct message :: verification rule #568
// [Moiz-A-61-L8] Create persistent notification record on incoming direct message :: verification rule #587
// [Moiz-A-61-L9] Create persistent notification record on incoming direct message :: verification rule #606
// [Moiz-A-61-L10] Create persistent notification record on incoming direct message :: verification rule #625
// [Moiz-A-61-L11] Create persistent notification record on incoming direct message :: verification rule #644
// [Moiz-A-61-L12] Create persistent notification record on incoming direct message :: verification rule #663
// [Moiz-A-61-L13] Create persistent notification record on incoming direct message :: verification rule #682
// [Moiz-A-61-L14] Create persistent notification record on incoming direct message :: verification rule #701
// [Moiz-A-61-L15] Create persistent notification record on incoming direct message :: verification rule #720
// [Moiz-A-61-L16] Create persistent notification record on incoming direct message :: verification rule #739
// [Moiz-A-61-L17] Create persistent notification record on incoming direct message :: verification rule #758
// [Moiz-A-61-L18] Create persistent notification record on incoming direct message :: verification rule #777
// [Moiz-A-61-L19] Create persistent notification record on incoming direct message :: verification rule #796
// [Moiz-A-61-L20] Create persistent notification record on incoming direct message :: verification rule #815
// [Moiz-A-61-L21] Create persistent notification record on incoming direct message :: verification rule #834
// [Moiz-A-61-L22] Create persistent notification record on incoming direct message :: verification rule #853
// [Moiz-A-61-L23] Create persistent notification record on incoming direct message :: verification rule #872
// [Moiz-A-61-L24] Create persistent notification record on incoming direct message :: verification rule #891
// [Moiz-A-61-L25] Create persistent notification record on incoming direct message :: verification rule #910
// [Moiz-A-61-L26] Create persistent notification record on incoming direct message :: verification rule #929
// [Moiz-A-61-L27] Create persistent notification record on incoming direct message :: verification rule #948
// [Moiz-A-61-L28] Create persistent notification record on incoming direct message :: verification rule #967
// [Moiz-A-61-L29] Create persistent notification record on incoming direct message :: verification rule #986
// [Moiz-A-61-L30] Create persistent notification record on incoming direct message :: verification rule #8
// [Moiz-A-61-L31] Create persistent notification record on incoming direct message :: verification rule #27
// [Moiz-A-61-L32] Create persistent notification record on incoming direct message :: verification rule #46
// [Moiz-A-61-L33] Create persistent notification record on incoming direct message :: verification rule #65
// [Moiz-A-61-L34] Create persistent notification record on incoming direct message :: verification rule #84
// [Moiz-A-61-L35] Create persistent notification record on incoming direct message :: verification rule #103
// [Moiz-A-61-L36] Create persistent notification record on incoming direct message :: verification rule #122
// [Moiz-A-61-L37] Create persistent notification record on incoming direct message :: verification rule #141
// [Moiz-A-61-L38] Create persistent notification record on incoming direct message :: verification rule #160
// [Moiz-A-61-L39] Create persistent notification record on incoming direct message :: verification rule #179
// [Moiz-A-61-L40] Create persistent notification record on incoming direct message :: verification rule #198
// [Moiz-A-61-L41] Create persistent notification record on incoming direct message :: verification rule #217
// [Moiz-A-61-L42] Create persistent notification record on incoming direct message :: verification rule #236
// [Moiz-A-61-L43] Create persistent notification record on incoming direct message :: verification rule #255
// [Moiz-A-61-L44] Create persistent notification record on incoming direct message :: verification rule #274
// [Moiz-A-61-L45] Create persistent notification record on incoming direct message :: verification rule #293
// [Moiz-A-61-L46] Create persistent notification record on incoming direct message :: verification rule #312
// [Moiz-A-61-L47] Create persistent notification record on incoming direct message :: verification rule #331
// [Moiz-A-61-L48] Create persistent notification record on incoming direct message :: verification rule #350
// [Moiz-A-61-L49] Create persistent notification record on incoming direct message :: verification rule #369
// [Moiz-A-61-L50] Create persistent notification record on incoming direct message :: verification rule #388
// [Moiz-A-61-L51] Create persistent notification record on incoming direct message :: verification rule #407
// [Moiz-A-61-L52] Create persistent notification record on incoming direct message :: verification rule #426
// [Moiz-A-61-L53] Create persistent notification record on incoming direct message :: verification rule #445
// [Moiz-A-61-L54] Create persistent notification record on incoming direct message :: verification rule #464
// [Moiz-A-61-L55] Create persistent notification record on incoming direct message :: verification rule #483
// [Moiz-A-61-L56] Create persistent notification record on incoming direct message :: verification rule #502
// [Moiz-A-61-L57] Create persistent notification record on incoming direct message :: verification rule #521
// [Moiz-A-61-L58] Create persistent notification record on incoming direct message :: verification rule #540
// [Moiz-A-61-L59] Create persistent notification record on incoming direct message :: verification rule #559
// [Moiz-A-61-L60] Create persistent notification record on incoming direct message :: verification rule #578
// [Moiz-A-61-L61] Create persistent notification record on incoming direct message :: verification rule #597
// [Moiz-A-61-L62] Create persistent notification record on incoming direct message :: verification rule #616
// [Moiz-A-61-L63] Create persistent notification record on incoming direct message :: verification rule #635
// [Moiz-A-61-L64] Create persistent notification record on incoming direct message :: verification rule #654
// [Moiz-A-61-L65] Create persistent notification record on incoming direct message :: verification rule #673
// [Moiz-A-61-L66] Create persistent notification record on incoming direct message :: verification rule #692
// [Moiz-A-61-L67] Create persistent notification record on incoming direct message :: verification rule #711
// [Moiz-A-61-L68] Create persistent notification record on incoming direct message :: verification rule #730
// [Moiz-A-61-L69] Create persistent notification record on incoming direct message :: verification rule #749
// === [SPEC-BLOCK-END] ===
