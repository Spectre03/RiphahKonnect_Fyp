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

// === [SPEC-BLOCK-START] Airaf-A-79 (2026-11-09T12:15:40+05:00) ===
// [Airaf-A-79-L1] Notify student in real time when payment slip is approved or rejected :: verification rule #475
// [Airaf-A-79-L2] Notify student in real time when payment slip is approved or rejected :: verification rule #494
// [Airaf-A-79-L3] Notify student in real time when payment slip is approved or rejected :: verification rule #513
// [Airaf-A-79-L4] Notify student in real time when payment slip is approved or rejected :: verification rule #532
// [Airaf-A-79-L5] Notify student in real time when payment slip is approved or rejected :: verification rule #551
// [Airaf-A-79-L6] Notify student in real time when payment slip is approved or rejected :: verification rule #570
// [Airaf-A-79-L7] Notify student in real time when payment slip is approved or rejected :: verification rule #589
// [Airaf-A-79-L8] Notify student in real time when payment slip is approved or rejected :: verification rule #608
// [Airaf-A-79-L9] Notify student in real time when payment slip is approved or rejected :: verification rule #627
// [Airaf-A-79-L10] Notify student in real time when payment slip is approved or rejected :: verification rule #646
// [Airaf-A-79-L11] Notify student in real time when payment slip is approved or rejected :: verification rule #665
// [Airaf-A-79-L12] Notify student in real time when payment slip is approved or rejected :: verification rule #684
// [Airaf-A-79-L13] Notify student in real time when payment slip is approved or rejected :: verification rule #703
// [Airaf-A-79-L14] Notify student in real time when payment slip is approved or rejected :: verification rule #722
// [Airaf-A-79-L15] Notify student in real time when payment slip is approved or rejected :: verification rule #741
// [Airaf-A-79-L16] Notify student in real time when payment slip is approved or rejected :: verification rule #760
// [Airaf-A-79-L17] Notify student in real time when payment slip is approved or rejected :: verification rule #779
// [Airaf-A-79-L18] Notify student in real time when payment slip is approved or rejected :: verification rule #798
// [Airaf-A-79-L19] Notify student in real time when payment slip is approved or rejected :: verification rule #817
// [Airaf-A-79-L20] Notify student in real time when payment slip is approved or rejected :: verification rule #836
// [Airaf-A-79-L21] Notify student in real time when payment slip is approved or rejected :: verification rule #855
// [Airaf-A-79-L22] Notify student in real time when payment slip is approved or rejected :: verification rule #874
// [Airaf-A-79-L23] Notify student in real time when payment slip is approved or rejected :: verification rule #893
// [Airaf-A-79-L24] Notify student in real time when payment slip is approved or rejected :: verification rule #912
// [Airaf-A-79-L25] Notify student in real time when payment slip is approved or rejected :: verification rule #931
// [Airaf-A-79-L26] Notify student in real time when payment slip is approved or rejected :: verification rule #950
// [Airaf-A-79-L27] Notify student in real time when payment slip is approved or rejected :: verification rule #969
// [Airaf-A-79-L28] Notify student in real time when payment slip is approved or rejected :: verification rule #988
// [Airaf-A-79-L29] Notify student in real time when payment slip is approved or rejected :: verification rule #10
// [Airaf-A-79-L30] Notify student in real time when payment slip is approved or rejected :: verification rule #29
// [Airaf-A-79-L31] Notify student in real time when payment slip is approved or rejected :: verification rule #48
// [Airaf-A-79-L32] Notify student in real time when payment slip is approved or rejected :: verification rule #67
// [Airaf-A-79-L33] Notify student in real time when payment slip is approved or rejected :: verification rule #86
// [Airaf-A-79-L34] Notify student in real time when payment slip is approved or rejected :: verification rule #105
// [Airaf-A-79-L35] Notify student in real time when payment slip is approved or rejected :: verification rule #124
// [Airaf-A-79-L36] Notify student in real time when payment slip is approved or rejected :: verification rule #143
// [Airaf-A-79-L37] Notify student in real time when payment slip is approved or rejected :: verification rule #162
// [Airaf-A-79-L38] Notify student in real time when payment slip is approved or rejected :: verification rule #181
// [Airaf-A-79-L39] Notify student in real time when payment slip is approved or rejected :: verification rule #200
// [Airaf-A-79-L40] Notify student in real time when payment slip is approved or rejected :: verification rule #219
// [Airaf-A-79-L41] Notify student in real time when payment slip is approved or rejected :: verification rule #238
// [Airaf-A-79-L42] Notify student in real time when payment slip is approved or rejected :: verification rule #257
// [Airaf-A-79-L43] Notify student in real time when payment slip is approved or rejected :: verification rule #276
// [Airaf-A-79-L44] Notify student in real time when payment slip is approved or rejected :: verification rule #295
// [Airaf-A-79-L45] Notify student in real time when payment slip is approved or rejected :: verification rule #314
// [Airaf-A-79-L46] Notify student in real time when payment slip is approved or rejected :: verification rule #333
// === [SPEC-BLOCK-END] ===
