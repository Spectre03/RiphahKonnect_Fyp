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
