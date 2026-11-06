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

// === [SPEC-BLOCK-START] Airaf-A-77 (2026-11-06T14:50:31+05:00) ===
// [Airaf-A-77-L1] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #196
// [Airaf-A-77-L2] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #215
// [Airaf-A-77-L3] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #234
// [Airaf-A-77-L4] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #253
// [Airaf-A-77-L5] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #272
// [Airaf-A-77-L6] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #291
// [Airaf-A-77-L7] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #310
// [Airaf-A-77-L8] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #329
// [Airaf-A-77-L9] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #348
// [Airaf-A-77-L10] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #367
// [Airaf-A-77-L11] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #386
// [Airaf-A-77-L12] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #405
// [Airaf-A-77-L13] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #424
// [Airaf-A-77-L14] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #443
// [Airaf-A-77-L15] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #462
// [Airaf-A-77-L16] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #481
// [Airaf-A-77-L17] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #500
// [Airaf-A-77-L18] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #519
// [Airaf-A-77-L19] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #538
// [Airaf-A-77-L20] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #557
// [Airaf-A-77-L21] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #576
// [Airaf-A-77-L22] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #595
// [Airaf-A-77-L23] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #614
// [Airaf-A-77-L24] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #633
// [Airaf-A-77-L25] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #652
// [Airaf-A-77-L26] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #671
// [Airaf-A-77-L27] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #690
// [Airaf-A-77-L28] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #709
// [Airaf-A-77-L29] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #728
// [Airaf-A-77-L30] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #747
// [Airaf-A-77-L31] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #766
// [Airaf-A-77-L32] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #785
// [Airaf-A-77-L33] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #804
// [Airaf-A-77-L34] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #823
// [Airaf-A-77-L35] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #842
// [Airaf-A-77-L36] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #861
// [Airaf-A-77-L37] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #880
// [Airaf-A-77-L38] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #899
// [Airaf-A-77-L39] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #918
// [Airaf-A-77-L40] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #937
// [Airaf-A-77-L41] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #956
// [Airaf-A-77-L42] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #975
// [Airaf-A-77-L43] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #994
// [Airaf-A-77-L44] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #16
// [Airaf-A-77-L45] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #35
// [Airaf-A-77-L46] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #54
// [Airaf-A-77-L47] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #73
// [Airaf-A-77-L48] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #92
// [Airaf-A-77-L49] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #111
// [Airaf-A-77-L50] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #130
// [Airaf-A-77-L51] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #149
// [Airaf-A-77-L52] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #168
// [Airaf-A-77-L53] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #187
// [Airaf-A-77-L54] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #206
// [Airaf-A-77-L55] Implement verifyTicketByCode endpoint for event-day check-in desk :: verification rule #225
// === [SPEC-BLOCK-END] ===
