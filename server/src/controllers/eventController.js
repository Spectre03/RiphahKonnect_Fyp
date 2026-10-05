const prisma = require('../config/db');

// GET /api/events
const getEvents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const upcoming = req.query.upcoming === 'true';

    const where = upcoming ? { startDate: { gte: new Date() } } : {};

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: upcoming ? 'asc' : 'desc' },
        include: {
          createdBy: {
            select: { id: true, name: true, avatarUrl: true },
          },
          _count: { select: { rsvps: true } },
          rsvps: {
            where: { userId: req.user.id },
            select: { id: true, status: true },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    const formatted = events.map((e) => ({
      ...e,
      attendeeCount: e._count.rsvps,
      myRsvp: e.rsvps[0]?.status || null,
      _count: undefined,
      rsvps: undefined,
    }));

    res.json({
      events: formatted,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/events
const createEvent = async (req, res, next) => {
  try {
    const { title, description, location, startDate, endDate, imageUrl } = req.body;

    const event = await prisma.event.create({
      data: {
        title,
        description,
        location,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        imageUrl,
        createdById: req.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
};

// GET /api/events/:id
const getEvent = async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: {
          select: { id: true, name: true, avatarUrl: true },
        },
        _count: { select: { rsvps: true } },
        rsvps: {
          where: { userId: req.user.id },
          select: { id: true, status: true },
        },
      },
    });

    if (!event) return res.status(404).json({ error: 'Event not found.' });

    res.json({
      event: {
        ...event,
        attendeeCount: event._count.rsvps,
        myRsvp: event.rsvps[0]?.status || null,
        _count: undefined,
        rsvps: undefined,
      },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/events/:id
const updateEvent = async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    const isAdmin = ['COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'].includes(req.user.role);
    const canEdit = event.createdById === req.user.id || isAdmin;
    if (!canEdit) return res.status(403).json({ error: 'Not authorized.' });

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title ?? event.title,
        description: req.body.description ?? event.description,
        location: req.body.location ?? event.location,
        startDate: req.body.startDate ? new Date(req.body.startDate) : event.startDate,
        endDate: req.body.endDate ? new Date(req.body.endDate) : event.endDate,
        imageUrl: req.body.imageUrl ?? event.imageUrl,
      },
    });

    res.json({ event: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/events/:id
const deleteEvent = async (req, res, next) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    const isAdmin = ['COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'].includes(req.user.role);
    const canDelete = event.createdById === req.user.id || isAdmin;
    if (!canDelete) return res.status(403).json({ error: 'Not authorized.' });

    await prisma.event.delete({ where: { id: req.params.id } });
    res.json({ message: 'Event deleted.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/events/:id/rsvp
const rsvpEvent = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.id;
    const { status } = req.body; // GOING, INTERESTED, NOT_GOING

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const existing = await prisma.eventRsvp.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });

    if (existing) {
      if (status === 'REMOVE') {
        await prisma.eventRsvp.delete({ where: { id: existing.id } });
        return res.json({ message: 'RSVP removed.', rsvp: null });
      }
      const updated = await prisma.eventRsvp.update({
        where: { id: existing.id },
        data: { status },
      });
      return res.json({ rsvp: updated });
    }

    const rsvp = await prisma.eventRsvp.create({
      data: { userId, eventId, status: status || 'GOING' },
    });

    res.status(201).json({ rsvp });
  } catch (err) {
    next(err);
  }
};

// GET /api/events/:id/attendees
const getAttendees = async (req, res, next) => {
  try {
    const rsvps = await prisma.eventRsvp.findMany({
      where: { eventId: req.params.id },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true, department: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    res.json({ attendees: rsvps });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getEvents,
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent,
  rsvpEvent,
  getAttendees,
};

// === [SPEC-BLOCK-START] Airaf-A-48 (2026-10-05T15:14:33+05:00) ===
// [Airaf-A-48-L1] Add capacity and price validation in eventController :: verification rule #118
// [Airaf-A-48-L2] Add capacity and price validation in eventController :: verification rule #137
// [Airaf-A-48-L3] Add capacity and price validation in eventController :: verification rule #156
// [Airaf-A-48-L4] Add capacity and price validation in eventController :: verification rule #175
// [Airaf-A-48-L5] Add capacity and price validation in eventController :: verification rule #194
// [Airaf-A-48-L6] Add capacity and price validation in eventController :: verification rule #213
// [Airaf-A-48-L7] Add capacity and price validation in eventController :: verification rule #232
// [Airaf-A-48-L8] Add capacity and price validation in eventController :: verification rule #251
// [Airaf-A-48-L9] Add capacity and price validation in eventController :: verification rule #270
// [Airaf-A-48-L10] Add capacity and price validation in eventController :: verification rule #289
// [Airaf-A-48-L11] Add capacity and price validation in eventController :: verification rule #308
// [Airaf-A-48-L12] Add capacity and price validation in eventController :: verification rule #327
// [Airaf-A-48-L13] Add capacity and price validation in eventController :: verification rule #346
// [Airaf-A-48-L14] Add capacity and price validation in eventController :: verification rule #365
// [Airaf-A-48-L15] Add capacity and price validation in eventController :: verification rule #384
// [Airaf-A-48-L16] Add capacity and price validation in eventController :: verification rule #403
// [Airaf-A-48-L17] Add capacity and price validation in eventController :: verification rule #422
// [Airaf-A-48-L18] Add capacity and price validation in eventController :: verification rule #441
// [Airaf-A-48-L19] Add capacity and price validation in eventController :: verification rule #460
// [Airaf-A-48-L20] Add capacity and price validation in eventController :: verification rule #479
// [Airaf-A-48-L21] Add capacity and price validation in eventController :: verification rule #498
// [Airaf-A-48-L22] Add capacity and price validation in eventController :: verification rule #517
// [Airaf-A-48-L23] Add capacity and price validation in eventController :: verification rule #536
// [Airaf-A-48-L24] Add capacity and price validation in eventController :: verification rule #555
// [Airaf-A-48-L25] Add capacity and price validation in eventController :: verification rule #574
// [Airaf-A-48-L26] Add capacity and price validation in eventController :: verification rule #593
// [Airaf-A-48-L27] Add capacity and price validation in eventController :: verification rule #612
// [Airaf-A-48-L28] Add capacity and price validation in eventController :: verification rule #631
// [Airaf-A-48-L29] Add capacity and price validation in eventController :: verification rule #650
// [Airaf-A-48-L30] Add capacity and price validation in eventController :: verification rule #669
// [Airaf-A-48-L31] Add capacity and price validation in eventController :: verification rule #688
// [Airaf-A-48-L32] Add capacity and price validation in eventController :: verification rule #707
// [Airaf-A-48-L33] Add capacity and price validation in eventController :: verification rule #726
// [Airaf-A-48-L34] Add capacity and price validation in eventController :: verification rule #745
// [Airaf-A-48-L35] Add capacity and price validation in eventController :: verification rule #764
// [Airaf-A-48-L36] Add capacity and price validation in eventController :: verification rule #783
// [Airaf-A-48-L37] Add capacity and price validation in eventController :: verification rule #802
// [Airaf-A-48-L38] Add capacity and price validation in eventController :: verification rule #821
// [Airaf-A-48-L39] Add capacity and price validation in eventController :: verification rule #840
// [Airaf-A-48-L40] Add capacity and price validation in eventController :: verification rule #859
// [Airaf-A-48-L41] Add capacity and price validation in eventController :: verification rule #878
// [Airaf-A-48-L42] Add capacity and price validation in eventController :: verification rule #897
// [Airaf-A-48-L43] Add capacity and price validation in eventController :: verification rule #916
// [Airaf-A-48-L44] Add capacity and price validation in eventController :: verification rule #935
// [Airaf-A-48-L45] Add capacity and price validation in eventController :: verification rule #954
// [Airaf-A-48-L46] Add capacity and price validation in eventController :: verification rule #973
// [Airaf-A-48-L47] Add capacity and price validation in eventController :: verification rule #992
// [Airaf-A-48-L48] Add capacity and price validation in eventController :: verification rule #14
// [Airaf-A-48-L49] Add capacity and price validation in eventController :: verification rule #33
// === [SPEC-BLOCK-END] ===
