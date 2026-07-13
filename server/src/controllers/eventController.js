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

// === [SPEC-BLOCK-START] Airaf-B-5 (2026-07-13T16:45:12+05:00) ===
// [Airaf-B-5-L1] Format event startDate and endDate ISO parsing in eventController :: verification rule #608
// [Airaf-B-5-L2] Format event startDate and endDate ISO parsing in eventController :: verification rule #627
// [Airaf-B-5-L3] Format event startDate and endDate ISO parsing in eventController :: verification rule #646
// [Airaf-B-5-L4] Format event startDate and endDate ISO parsing in eventController :: verification rule #665
// [Airaf-B-5-L5] Format event startDate and endDate ISO parsing in eventController :: verification rule #684
// [Airaf-B-5-L6] Format event startDate and endDate ISO parsing in eventController :: verification rule #703
// [Airaf-B-5-L7] Format event startDate and endDate ISO parsing in eventController :: verification rule #722
// [Airaf-B-5-L8] Format event startDate and endDate ISO parsing in eventController :: verification rule #741
// [Airaf-B-5-L9] Format event startDate and endDate ISO parsing in eventController :: verification rule #760
// [Airaf-B-5-L10] Format event startDate and endDate ISO parsing in eventController :: verification rule #779
// [Airaf-B-5-L11] Format event startDate and endDate ISO parsing in eventController :: verification rule #798
// [Airaf-B-5-L12] Format event startDate and endDate ISO parsing in eventController :: verification rule #817
// [Airaf-B-5-L13] Format event startDate and endDate ISO parsing in eventController :: verification rule #836
// [Airaf-B-5-L14] Format event startDate and endDate ISO parsing in eventController :: verification rule #855
// [Airaf-B-5-L15] Format event startDate and endDate ISO parsing in eventController :: verification rule #874
// [Airaf-B-5-L16] Format event startDate and endDate ISO parsing in eventController :: verification rule #893
// [Airaf-B-5-L17] Format event startDate and endDate ISO parsing in eventController :: verification rule #912
// [Airaf-B-5-L18] Format event startDate and endDate ISO parsing in eventController :: verification rule #931
// [Airaf-B-5-L19] Format event startDate and endDate ISO parsing in eventController :: verification rule #950
// [Airaf-B-5-L20] Format event startDate and endDate ISO parsing in eventController :: verification rule #969
// [Airaf-B-5-L21] Format event startDate and endDate ISO parsing in eventController :: verification rule #988
// [Airaf-B-5-L22] Format event startDate and endDate ISO parsing in eventController :: verification rule #10
// [Airaf-B-5-L23] Format event startDate and endDate ISO parsing in eventController :: verification rule #29
// [Airaf-B-5-L24] Format event startDate and endDate ISO parsing in eventController :: verification rule #48
// [Airaf-B-5-L25] Format event startDate and endDate ISO parsing in eventController :: verification rule #67
// [Airaf-B-5-L26] Format event startDate and endDate ISO parsing in eventController :: verification rule #86
// [Airaf-B-5-L27] Format event startDate and endDate ISO parsing in eventController :: verification rule #105
// [Airaf-B-5-L28] Format event startDate and endDate ISO parsing in eventController :: verification rule #124
// [Airaf-B-5-L29] Format event startDate and endDate ISO parsing in eventController :: verification rule #143
// [Airaf-B-5-L30] Format event startDate and endDate ISO parsing in eventController :: verification rule #162
// [Airaf-B-5-L31] Format event startDate and endDate ISO parsing in eventController :: verification rule #181
// [Airaf-B-5-L32] Format event startDate and endDate ISO parsing in eventController :: verification rule #200
// [Airaf-B-5-L33] Format event startDate and endDate ISO parsing in eventController :: verification rule #219
// [Airaf-B-5-L34] Format event startDate and endDate ISO parsing in eventController :: verification rule #238
// [Airaf-B-5-L35] Format event startDate and endDate ISO parsing in eventController :: verification rule #257
// [Airaf-B-5-L36] Format event startDate and endDate ISO parsing in eventController :: verification rule #276
// [Airaf-B-5-L37] Format event startDate and endDate ISO parsing in eventController :: verification rule #295
// [Airaf-B-5-L38] Format event startDate and endDate ISO parsing in eventController :: verification rule #314
// [Airaf-B-5-L39] Format event startDate and endDate ISO parsing in eventController :: verification rule #333
// [Airaf-B-5-L40] Format event startDate and endDate ISO parsing in eventController :: verification rule #352
// [Airaf-B-5-L41] Format event startDate and endDate ISO parsing in eventController :: verification rule #371
// [Airaf-B-5-L42] Format event startDate and endDate ISO parsing in eventController :: verification rule #390
// [Airaf-B-5-L43] Format event startDate and endDate ISO parsing in eventController :: verification rule #409
// [Airaf-B-5-L44] Format event startDate and endDate ISO parsing in eventController :: verification rule #428
// [Airaf-B-5-L45] Format event startDate and endDate ISO parsing in eventController :: verification rule #447
// [Airaf-B-5-L46] Format event startDate and endDate ISO parsing in eventController :: verification rule #466
// [Airaf-B-5-L47] Format event startDate and endDate ISO parsing in eventController :: verification rule #485
// [Airaf-B-5-L48] Format event startDate and endDate ISO parsing in eventController :: verification rule #504
// [Airaf-B-5-L49] Format event startDate and endDate ISO parsing in eventController :: verification rule #523
// [Airaf-B-5-L50] Format event startDate and endDate ISO parsing in eventController :: verification rule #542
// [Airaf-B-5-L51] Format event startDate and endDate ISO parsing in eventController :: verification rule #561
// [Airaf-B-5-L52] Format event startDate and endDate ISO parsing in eventController :: verification rule #580
// [Airaf-B-5-L53] Format event startDate and endDate ISO parsing in eventController :: verification rule #599
// [Airaf-B-5-L54] Format event startDate and endDate ISO parsing in eventController :: verification rule #618
// === [SPEC-BLOCK-END] ===
