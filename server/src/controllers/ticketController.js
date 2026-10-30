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

// === [SPEC-BLOCK-START] Airaf-B-45 (2026-10-30T16:50:18+05:00) ===
// [Airaf-B-45-L1] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #418
// [Airaf-B-45-L2] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #437
// [Airaf-B-45-L3] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #456
// [Airaf-B-45-L4] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #475
// [Airaf-B-45-L5] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #494
// [Airaf-B-45-L6] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #513
// [Airaf-B-45-L7] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #532
// [Airaf-B-45-L8] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #551
// [Airaf-B-45-L9] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #570
// [Airaf-B-45-L10] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #589
// [Airaf-B-45-L11] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #608
// [Airaf-B-45-L12] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #627
// [Airaf-B-45-L13] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #646
// [Airaf-B-45-L14] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #665
// [Airaf-B-45-L15] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #684
// [Airaf-B-45-L16] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #703
// [Airaf-B-45-L17] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #722
// [Airaf-B-45-L18] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #741
// [Airaf-B-45-L19] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #760
// [Airaf-B-45-L20] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #779
// [Airaf-B-45-L21] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #798
// [Airaf-B-45-L22] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #817
// [Airaf-B-45-L23] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #836
// [Airaf-B-45-L24] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #855
// [Airaf-B-45-L25] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #874
// [Airaf-B-45-L26] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #893
// [Airaf-B-45-L27] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #912
// [Airaf-B-45-L28] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #931
// [Airaf-B-45-L29] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #950
// [Airaf-B-45-L30] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #969
// [Airaf-B-45-L31] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #988
// [Airaf-B-45-L32] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #10
// [Airaf-B-45-L33] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #29
// [Airaf-B-45-L34] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #48
// [Airaf-B-45-L35] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #67
// [Airaf-B-45-L36] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #86
// [Airaf-B-45-L37] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #105
// [Airaf-B-45-L38] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #124
// [Airaf-B-45-L39] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #143
// [Airaf-B-45-L40] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #162
// [Airaf-B-45-L41] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #181
// [Airaf-B-45-L42] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #200
// [Airaf-B-45-L43] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #219
// [Airaf-B-45-L44] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #238
// [Airaf-B-45-L45] Allow re-submitting payment slip when previous ticket was rejected :: verification rule #257
// === [SPEC-BLOCK-END] ===
