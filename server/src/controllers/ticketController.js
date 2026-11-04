const prisma = require('../config/db');

// Generate a random ticket code like TKT-A1B2C3
const generateTicketCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TKT-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// POST /api/tickets/:eventId/buy
const buyTicket = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // 1. Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { _count: { select: { tickets: true } } },
    });

    if (!event) return res.status(404).json({ error: 'Event not found.' });

    // 2. Check if event is in the past
    if (new Date(event.startDate) < new Date()) {
      return res.status(400).json({ error: 'Cannot buy tickets for past events.' });
    }

    // 3. Check if user already has a ticket
    const existingTicket = await prisma.ticket.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
    if (existingTicket) {
      return res.status(409).json({ error: 'You already have a ticket for this event.' });
    }

    // 4. Check capacity limit
    if (event.capacity && event._count.tickets >= event.capacity) {
      return res.status(400).json({ error: 'Sorry, this event is sold out.' });
    }

    // 5. Generate unique code
    let code = generateTicketCode();
    let isUnique = false;
    while (!isUnique) {
      const existing = await prisma.ticket.findUnique({ where: { code } });
      if (!existing) isUnique = true;
      else code = generateTicketCode();
    }

    // 6. Create the ticket (and auto-RSVP GOING)
    const ticket = await prisma.ticket.create({
      data: {
        code,
        pricePaid: event.price || 0,
        userId,
        eventId,
      },
      include: {
        event: { select: { title: true, startDate: true, location: true, imageUrl: true } },
      },
    });

    // Also mark user as GOING in EventRsvp
    await prisma.eventRsvp.upsert({
      where: { userId_eventId: { userId, eventId } },
      update: { status: 'GOING' },
      create: { userId, eventId, status: 'GOING' },
    }).catch(() => {});

    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
};

// GET /api/tickets/my-tickets
const getMyTickets = async (req, res, next) => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { userId: req.user.id },
      orderBy: { issuedAt: 'desc' },
      include: {
        event: {
          select: { id: true, title: true, startDate: true, endDate: true, location: true, imageUrl: true },
        },
      },
    });

    res.json({ tickets });
  } catch (err) {
    next(err);
  }
};

// GET /api/tickets/event/:eventId (For organizers/admins)
const getEventTickets = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { createdById: true },
    });

    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const isAdmin = ['UNIVERSITY_ADMIN', 'SYSTEM_ADMIN', 'COORDINATION'].includes(req.user.role);
    if (event.createdById !== req.user.id && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to view tickets.' });
    }

    const tickets = await prisma.ticket.findMany({
      where: { eventId },
      orderBy: { issuedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true } },
      },
    });

    res.json({ tickets });
  } catch (err) {
    next(err);
  }
};

module.exports = { buyTicket, getMyTickets, getEventTickets };

// === [SPEC-BLOCK-START] Airaf-B-48 (2026-11-04T15:45:29+05:00) ===
// [Airaf-B-48-L1] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #72
// [Airaf-B-48-L2] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #91
// [Airaf-B-48-L3] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #110
// [Airaf-B-48-L4] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #129
// [Airaf-B-48-L5] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #148
// [Airaf-B-48-L6] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #167
// [Airaf-B-48-L7] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #186
// [Airaf-B-48-L8] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #205
// [Airaf-B-48-L9] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #224
// [Airaf-B-48-L10] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #243
// [Airaf-B-48-L11] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #262
// [Airaf-B-48-L12] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #281
// [Airaf-B-48-L13] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #300
// [Airaf-B-48-L14] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #319
// [Airaf-B-48-L15] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #338
// [Airaf-B-48-L16] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #357
// [Airaf-B-48-L17] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #376
// [Airaf-B-48-L18] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #395
// [Airaf-B-48-L19] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #414
// [Airaf-B-48-L20] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #433
// [Airaf-B-48-L21] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #452
// [Airaf-B-48-L22] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #471
// [Airaf-B-48-L23] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #490
// [Airaf-B-48-L24] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #509
// [Airaf-B-48-L25] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #528
// [Airaf-B-48-L26] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #547
// [Airaf-B-48-L27] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #566
// [Airaf-B-48-L28] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #585
// [Airaf-B-48-L29] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #604
// [Airaf-B-48-L30] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #623
// [Airaf-B-48-L31] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #642
// [Airaf-B-48-L32] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #661
// [Airaf-B-48-L33] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #680
// [Airaf-B-48-L34] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #699
// [Airaf-B-48-L35] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #718
// [Airaf-B-48-L36] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #737
// [Airaf-B-48-L37] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #756
// [Airaf-B-48-L38] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #775
// [Airaf-B-48-L39] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #794
// [Airaf-B-48-L40] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #813
// [Airaf-B-48-L41] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #832
// [Airaf-B-48-L42] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #851
// [Airaf-B-48-L43] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #870
// [Airaf-B-48-L44] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #889
// [Airaf-B-48-L45] Validate paymentSlipUrl with checkImageSafety before saving :: verification rule #908
// === [SPEC-BLOCK-END] ===
