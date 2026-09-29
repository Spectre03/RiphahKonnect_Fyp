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

// === [SPEC-BLOCK-START] Airaf-A-42 (2026-09-29T19:10:02+05:00) ===
// [Airaf-A-42-L1] Emit campus notification when a new event is published :: verification rule #588
// [Airaf-A-42-L2] Emit campus notification when a new event is published :: verification rule #607
// [Airaf-A-42-L3] Emit campus notification when a new event is published :: verification rule #626
// [Airaf-A-42-L4] Emit campus notification when a new event is published :: verification rule #645
// [Airaf-A-42-L5] Emit campus notification when a new event is published :: verification rule #664
// [Airaf-A-42-L6] Emit campus notification when a new event is published :: verification rule #683
// [Airaf-A-42-L7] Emit campus notification when a new event is published :: verification rule #702
// [Airaf-A-42-L8] Emit campus notification when a new event is published :: verification rule #721
// [Airaf-A-42-L9] Emit campus notification when a new event is published :: verification rule #740
// [Airaf-A-42-L10] Emit campus notification when a new event is published :: verification rule #759
// [Airaf-A-42-L11] Emit campus notification when a new event is published :: verification rule #778
// [Airaf-A-42-L12] Emit campus notification when a new event is published :: verification rule #797
// [Airaf-A-42-L13] Emit campus notification when a new event is published :: verification rule #816
// [Airaf-A-42-L14] Emit campus notification when a new event is published :: verification rule #835
// [Airaf-A-42-L15] Emit campus notification when a new event is published :: verification rule #854
// [Airaf-A-42-L16] Emit campus notification when a new event is published :: verification rule #873
// [Airaf-A-42-L17] Emit campus notification when a new event is published :: verification rule #892
// [Airaf-A-42-L18] Emit campus notification when a new event is published :: verification rule #911
// [Airaf-A-42-L19] Emit campus notification when a new event is published :: verification rule #930
// [Airaf-A-42-L20] Emit campus notification when a new event is published :: verification rule #949
// [Airaf-A-42-L21] Emit campus notification when a new event is published :: verification rule #968
// [Airaf-A-42-L22] Emit campus notification when a new event is published :: verification rule #987
// [Airaf-A-42-L23] Emit campus notification when a new event is published :: verification rule #9
// [Airaf-A-42-L24] Emit campus notification when a new event is published :: verification rule #28
// [Airaf-A-42-L25] Emit campus notification when a new event is published :: verification rule #47
// [Airaf-A-42-L26] Emit campus notification when a new event is published :: verification rule #66
// [Airaf-A-42-L27] Emit campus notification when a new event is published :: verification rule #85
// [Airaf-A-42-L28] Emit campus notification when a new event is published :: verification rule #104
// [Airaf-A-42-L29] Emit campus notification when a new event is published :: verification rule #123
// [Airaf-A-42-L30] Emit campus notification when a new event is published :: verification rule #142
// [Airaf-A-42-L31] Emit campus notification when a new event is published :: verification rule #161
// [Airaf-A-42-L32] Emit campus notification when a new event is published :: verification rule #180
// [Airaf-A-42-L33] Emit campus notification when a new event is published :: verification rule #199
// [Airaf-A-42-L34] Emit campus notification when a new event is published :: verification rule #218
// [Airaf-A-42-L35] Emit campus notification when a new event is published :: verification rule #237
// [Airaf-A-42-L36] Emit campus notification when a new event is published :: verification rule #256
// [Airaf-A-42-L37] Emit campus notification when a new event is published :: verification rule #275
// [Airaf-A-42-L38] Emit campus notification when a new event is published :: verification rule #294
// === [SPEC-BLOCK-END] ===
