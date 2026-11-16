const prisma = require('../config/db');

// Generate a random ticket code like TKT-A1B2C3
const generateTicketCode = () => {
<<<<<<< HEAD
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0,O,1,I)
=======
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
>>>>>>> d0512afd1fe3eb2f17b712d3fc2a98d2f1b5ff76
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

<<<<<<< HEAD
    // 5. Generate unique code (retry if collision — rare)
=======
    // 5. Generate unique code
>>>>>>> d0512afd1fe3eb2f17b712d3fc2a98d2f1b5ff76
    let code = generateTicketCode();
    let isUnique = false;
    while (!isUnique) {
      const existing = await prisma.ticket.findUnique({ where: { code } });
      if (!existing) isUnique = true;
      else code = generateTicketCode();
    }

<<<<<<< HEAD
    // 6. Create the ticket (Simulated payment: assume payment was successful)
    const ticket = await prisma.ticket.create({
      data: {
        code,
        pricePaid: event.price,
=======
    // 6. Create the ticket (and auto-RSVP GOING)
    const ticket = await prisma.ticket.create({
      data: {
        code,
        pricePaid: event.price || 0,
>>>>>>> d0512afd1fe3eb2f17b712d3fc2a98d2f1b5ff76
        userId,
        eventId,
      },
      include: {
        event: { select: { title: true, startDate: true, location: true, imageUrl: true } },
      },
    });

<<<<<<< HEAD
=======
    // Also mark user as GOING in EventRsvp
    await prisma.eventRsvp.upsert({
      where: { userId_eventId: { userId, eventId } },
      update: { status: 'GOING' },
      create: { userId, eventId, status: 'GOING' },
    }).catch(() => {});

>>>>>>> d0512afd1fe3eb2f17b712d3fc2a98d2f1b5ff76
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
<<<<<<< HEAD
        event: { 
          select: { id: true, title: true, startDate: true, endDate: true, location: true, imageUrl: true } 
=======
        event: {
          select: { id: true, title: true, startDate: true, endDate: true, location: true, imageUrl: true },
>>>>>>> d0512afd1fe3eb2f17b712d3fc2a98d2f1b5ff76
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

<<<<<<< HEAD
    // Only event creator or admins can view attendee list
=======
>>>>>>> d0512afd1fe3eb2f17b712d3fc2a98d2f1b5ff76
    const isAdmin = ['UNIVERSITY_ADMIN', 'SYSTEM_ADMIN', 'COORDINATION'].includes(req.user.role);
    if (event.createdById !== req.user.id && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to view tickets.' });
    }

    const tickets = await prisma.ticket.findMany({
      where: { eventId },
      orderBy: { issuedAt: 'desc' },
      include: {
<<<<<<< HEAD
        user: { select: { name: true, email: true, department: true, semester: true } },
=======
        user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true } },
>>>>>>> d0512afd1fe3eb2f17b712d3fc2a98d2f1b5ff76
      },
    });

    res.json({ tickets });
  } catch (err) {
    next(err);
  }
};

<<<<<<< HEAD
module.exports = { buyTicket, getMyTickets, getEventTickets };
=======
module.exports = { buyTicket, getMyTickets, getEventTickets };
>>>>>>> d0512afd1fe3eb2f17b712d3fc2a98d2f1b5ff76
