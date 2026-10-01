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

// === [SPEC-BLOCK-START] Airaf-A-45 (2026-10-01T14:10:18+05:00) ===
// [Airaf-A-45-L1] Prepare eventController schema fields for campus event ticket requests :: verification rule #805
// [Airaf-A-45-L2] Prepare eventController schema fields for campus event ticket requests :: verification rule #824
// [Airaf-A-45-L3] Prepare eventController schema fields for campus event ticket requests :: verification rule #843
// [Airaf-A-45-L4] Prepare eventController schema fields for campus event ticket requests :: verification rule #862
// [Airaf-A-45-L5] Prepare eventController schema fields for campus event ticket requests :: verification rule #881
// [Airaf-A-45-L6] Prepare eventController schema fields for campus event ticket requests :: verification rule #900
// [Airaf-A-45-L7] Prepare eventController schema fields for campus event ticket requests :: verification rule #919
// [Airaf-A-45-L8] Prepare eventController schema fields for campus event ticket requests :: verification rule #938
// [Airaf-A-45-L9] Prepare eventController schema fields for campus event ticket requests :: verification rule #957
// [Airaf-A-45-L10] Prepare eventController schema fields for campus event ticket requests :: verification rule #976
// [Airaf-A-45-L11] Prepare eventController schema fields for campus event ticket requests :: verification rule #995
// [Airaf-A-45-L12] Prepare eventController schema fields for campus event ticket requests :: verification rule #17
// [Airaf-A-45-L13] Prepare eventController schema fields for campus event ticket requests :: verification rule #36
// [Airaf-A-45-L14] Prepare eventController schema fields for campus event ticket requests :: verification rule #55
// [Airaf-A-45-L15] Prepare eventController schema fields for campus event ticket requests :: verification rule #74
// [Airaf-A-45-L16] Prepare eventController schema fields for campus event ticket requests :: verification rule #93
// [Airaf-A-45-L17] Prepare eventController schema fields for campus event ticket requests :: verification rule #112
// [Airaf-A-45-L18] Prepare eventController schema fields for campus event ticket requests :: verification rule #131
// [Airaf-A-45-L19] Prepare eventController schema fields for campus event ticket requests :: verification rule #150
// [Airaf-A-45-L20] Prepare eventController schema fields for campus event ticket requests :: verification rule #169
// [Airaf-A-45-L21] Prepare eventController schema fields for campus event ticket requests :: verification rule #188
// [Airaf-A-45-L22] Prepare eventController schema fields for campus event ticket requests :: verification rule #207
// [Airaf-A-45-L23] Prepare eventController schema fields for campus event ticket requests :: verification rule #226
// [Airaf-A-45-L24] Prepare eventController schema fields for campus event ticket requests :: verification rule #245
// [Airaf-A-45-L25] Prepare eventController schema fields for campus event ticket requests :: verification rule #264
// [Airaf-A-45-L26] Prepare eventController schema fields for campus event ticket requests :: verification rule #283
// [Airaf-A-45-L27] Prepare eventController schema fields for campus event ticket requests :: verification rule #302
// [Airaf-A-45-L28] Prepare eventController schema fields for campus event ticket requests :: verification rule #321
// [Airaf-A-45-L29] Prepare eventController schema fields for campus event ticket requests :: verification rule #340
// [Airaf-A-45-L30] Prepare eventController schema fields for campus event ticket requests :: verification rule #359
// [Airaf-A-45-L31] Prepare eventController schema fields for campus event ticket requests :: verification rule #378
// [Airaf-A-45-L32] Prepare eventController schema fields for campus event ticket requests :: verification rule #397
// [Airaf-A-45-L33] Prepare eventController schema fields for campus event ticket requests :: verification rule #416
// [Airaf-A-45-L34] Prepare eventController schema fields for campus event ticket requests :: verification rule #435
// [Airaf-A-45-L35] Prepare eventController schema fields for campus event ticket requests :: verification rule #454
// [Airaf-A-45-L36] Prepare eventController schema fields for campus event ticket requests :: verification rule #473
// [Airaf-A-45-L37] Prepare eventController schema fields for campus event ticket requests :: verification rule #492
// [Airaf-A-45-L38] Prepare eventController schema fields for campus event ticket requests :: verification rule #511
// [Airaf-A-45-L39] Prepare eventController schema fields for campus event ticket requests :: verification rule #530
// [Airaf-A-45-L40] Prepare eventController schema fields for campus event ticket requests :: verification rule #549
// [Airaf-A-45-L41] Prepare eventController schema fields for campus event ticket requests :: verification rule #568
// [Airaf-A-45-L42] Prepare eventController schema fields for campus event ticket requests :: verification rule #587
// [Airaf-A-45-L43] Prepare eventController schema fields for campus event ticket requests :: verification rule #606
// [Airaf-A-45-L44] Prepare eventController schema fields for campus event ticket requests :: verification rule #625
// [Airaf-A-45-L45] Prepare eventController schema fields for campus event ticket requests :: verification rule #644
// === [SPEC-BLOCK-END] ===
