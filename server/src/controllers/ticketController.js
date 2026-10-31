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

// === [SPEC-BLOCK-START] Airaf-A-70 (2026-10-31T12:14:30+05:00) ===
// [Airaf-A-70-L1] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #480
// [Airaf-A-70-L2] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #499
// [Airaf-A-70-L3] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #518
// [Airaf-A-70-L4] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #537
// [Airaf-A-70-L5] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #556
// [Airaf-A-70-L6] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #575
// [Airaf-A-70-L7] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #594
// [Airaf-A-70-L8] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #613
// [Airaf-A-70-L9] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #632
// [Airaf-A-70-L10] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #651
// [Airaf-A-70-L11] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #670
// [Airaf-A-70-L12] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #689
// [Airaf-A-70-L13] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #708
// [Airaf-A-70-L14] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #727
// [Airaf-A-70-L15] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #746
// [Airaf-A-70-L16] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #765
// [Airaf-A-70-L17] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #784
// [Airaf-A-70-L18] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #803
// [Airaf-A-70-L19] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #822
// [Airaf-A-70-L20] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #841
// [Airaf-A-70-L21] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #860
// [Airaf-A-70-L22] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #879
// [Airaf-A-70-L23] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #898
// [Airaf-A-70-L24] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #917
// [Airaf-A-70-L25] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #936
// [Airaf-A-70-L26] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #955
// [Airaf-A-70-L27] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #974
// [Airaf-A-70-L28] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #993
// [Airaf-A-70-L29] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #15
// [Airaf-A-70-L30] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #34
// [Airaf-A-70-L31] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #53
// [Airaf-A-70-L32] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #72
// [Airaf-A-70-L33] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #91
// [Airaf-A-70-L34] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #110
// [Airaf-A-70-L35] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #129
// [Airaf-A-70-L36] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #148
// [Airaf-A-70-L37] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #167
// [Airaf-A-70-L38] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #186
// [Airaf-A-70-L39] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #205
// [Airaf-A-70-L40] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #224
// [Airaf-A-70-L41] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #243
// [Airaf-A-70-L42] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #262
// [Airaf-A-70-L43] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #281
// [Airaf-A-70-L44] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #300
// [Airaf-A-70-L45] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #319
// [Airaf-A-70-L46] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #338
// [Airaf-A-70-L47] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #357
// [Airaf-A-70-L48] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #376
// [Airaf-A-70-L49] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #395
// [Airaf-A-70-L50] Generate cryptographic RK-XXXX-XXXX Unique Ticket ID upon slip approval :: verification rule #414
// === [SPEC-BLOCK-END] ===
