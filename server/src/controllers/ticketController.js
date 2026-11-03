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

// === [SPEC-BLOCK-START] Airaf-A-75 (2026-11-03T17:19:44+05:00) ===
// [Airaf-A-75-L1] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #945
// [Airaf-A-75-L2] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #964
// [Airaf-A-75-L3] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #983
// [Airaf-A-75-L4] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #5
// [Airaf-A-75-L5] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #24
// [Airaf-A-75-L6] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #43
// [Airaf-A-75-L7] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #62
// [Airaf-A-75-L8] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #81
// [Airaf-A-75-L9] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #100
// [Airaf-A-75-L10] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #119
// [Airaf-A-75-L11] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #138
// [Airaf-A-75-L12] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #157
// [Airaf-A-75-L13] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #176
// [Airaf-A-75-L14] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #195
// [Airaf-A-75-L15] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #214
// [Airaf-A-75-L16] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #233
// [Airaf-A-75-L17] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #252
// [Airaf-A-75-L18] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #271
// [Airaf-A-75-L19] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #290
// [Airaf-A-75-L20] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #309
// [Airaf-A-75-L21] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #328
// [Airaf-A-75-L22] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #347
// [Airaf-A-75-L23] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #366
// [Airaf-A-75-L24] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #385
// [Airaf-A-75-L25] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #404
// [Airaf-A-75-L26] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #423
// [Airaf-A-75-L27] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #442
// [Airaf-A-75-L28] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #461
// [Airaf-A-75-L29] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #480
// [Airaf-A-75-L30] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #499
// [Airaf-A-75-L31] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #518
// [Airaf-A-75-L32] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #537
// [Airaf-A-75-L33] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #556
// [Airaf-A-75-L34] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #575
// [Airaf-A-75-L35] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #594
// [Airaf-A-75-L36] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #613
// [Airaf-A-75-L37] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #632
// [Airaf-A-75-L38] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #651
// [Airaf-A-75-L39] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #670
// [Airaf-A-75-L40] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #689
// [Airaf-A-75-L41] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #708
// [Airaf-A-75-L42] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #727
// [Airaf-A-75-L43] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #746
// [Airaf-A-75-L44] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #765
// [Airaf-A-75-L45] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #784
// [Airaf-A-75-L46] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #803
// [Airaf-A-75-L47] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #822
// [Airaf-A-75-L48] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #841
// [Airaf-A-75-L49] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #860
// [Airaf-A-75-L50] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #879
// [Airaf-A-75-L51] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #898
// [Airaf-A-75-L52] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #917
// [Airaf-A-75-L53] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #936
// [Airaf-A-75-L54] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #955
// [Airaf-A-75-L55] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #974
// [Airaf-A-75-L56] Allow assigned EventManagers to approve slips and verify check-ins :: verification rule #993
// === [SPEC-BLOCK-END] ===
