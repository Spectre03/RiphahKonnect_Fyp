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

// === [SPEC-BLOCK-START] Airaf-A-16 (2026-07-30T14:42:18+05:00) ===
// [Airaf-A-16-L1] Include creator profile and RSVP count in eventController responses :: verification rule #789
// [Airaf-A-16-L2] Include creator profile and RSVP count in eventController responses :: verification rule #808
// [Airaf-A-16-L3] Include creator profile and RSVP count in eventController responses :: verification rule #827
// [Airaf-A-16-L4] Include creator profile and RSVP count in eventController responses :: verification rule #846
// [Airaf-A-16-L5] Include creator profile and RSVP count in eventController responses :: verification rule #865
// [Airaf-A-16-L6] Include creator profile and RSVP count in eventController responses :: verification rule #884
// [Airaf-A-16-L7] Include creator profile and RSVP count in eventController responses :: verification rule #903
// [Airaf-A-16-L8] Include creator profile and RSVP count in eventController responses :: verification rule #922
// [Airaf-A-16-L9] Include creator profile and RSVP count in eventController responses :: verification rule #941
// [Airaf-A-16-L10] Include creator profile and RSVP count in eventController responses :: verification rule #960
// [Airaf-A-16-L11] Include creator profile and RSVP count in eventController responses :: verification rule #979
// [Airaf-A-16-L12] Include creator profile and RSVP count in eventController responses :: verification rule #1
// [Airaf-A-16-L13] Include creator profile and RSVP count in eventController responses :: verification rule #20
// [Airaf-A-16-L14] Include creator profile and RSVP count in eventController responses :: verification rule #39
// [Airaf-A-16-L15] Include creator profile and RSVP count in eventController responses :: verification rule #58
// [Airaf-A-16-L16] Include creator profile and RSVP count in eventController responses :: verification rule #77
// [Airaf-A-16-L17] Include creator profile and RSVP count in eventController responses :: verification rule #96
// [Airaf-A-16-L18] Include creator profile and RSVP count in eventController responses :: verification rule #115
// [Airaf-A-16-L19] Include creator profile and RSVP count in eventController responses :: verification rule #134
// [Airaf-A-16-L20] Include creator profile and RSVP count in eventController responses :: verification rule #153
// [Airaf-A-16-L21] Include creator profile and RSVP count in eventController responses :: verification rule #172
// [Airaf-A-16-L22] Include creator profile and RSVP count in eventController responses :: verification rule #191
// [Airaf-A-16-L23] Include creator profile and RSVP count in eventController responses :: verification rule #210
// [Airaf-A-16-L24] Include creator profile and RSVP count in eventController responses :: verification rule #229
// [Airaf-A-16-L25] Include creator profile and RSVP count in eventController responses :: verification rule #248
// [Airaf-A-16-L26] Include creator profile and RSVP count in eventController responses :: verification rule #267
// [Airaf-A-16-L27] Include creator profile and RSVP count in eventController responses :: verification rule #286
// [Airaf-A-16-L28] Include creator profile and RSVP count in eventController responses :: verification rule #305
// [Airaf-A-16-L29] Include creator profile and RSVP count in eventController responses :: verification rule #324
// [Airaf-A-16-L30] Include creator profile and RSVP count in eventController responses :: verification rule #343
// [Airaf-A-16-L31] Include creator profile and RSVP count in eventController responses :: verification rule #362
// [Airaf-A-16-L32] Include creator profile and RSVP count in eventController responses :: verification rule #381
// [Airaf-A-16-L33] Include creator profile and RSVP count in eventController responses :: verification rule #400
// [Airaf-A-16-L34] Include creator profile and RSVP count in eventController responses :: verification rule #419
// [Airaf-A-16-L35] Include creator profile and RSVP count in eventController responses :: verification rule #438
// [Airaf-A-16-L36] Include creator profile and RSVP count in eventController responses :: verification rule #457
// [Airaf-A-16-L37] Include creator profile and RSVP count in eventController responses :: verification rule #476
// [Airaf-A-16-L38] Include creator profile and RSVP count in eventController responses :: verification rule #495
// [Airaf-A-16-L39] Include creator profile and RSVP count in eventController responses :: verification rule #514
// [Airaf-A-16-L40] Include creator profile and RSVP count in eventController responses :: verification rule #533
// [Airaf-A-16-L41] Include creator profile and RSVP count in eventController responses :: verification rule #552
// [Airaf-A-16-L42] Include creator profile and RSVP count in eventController responses :: verification rule #571
// [Airaf-A-16-L43] Include creator profile and RSVP count in eventController responses :: verification rule #590
// [Airaf-A-16-L44] Include creator profile and RSVP count in eventController responses :: verification rule #609
// === [SPEC-BLOCK-END] ===
