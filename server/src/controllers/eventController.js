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

// === [SPEC-BLOCK-START] Airaf-A-6 (2026-07-14T17:39:50+05:00) ===
// [Airaf-A-6-L1] Add upcoming and past date ordering in eventController :: verification rule #701
// [Airaf-A-6-L2] Add upcoming and past date ordering in eventController :: verification rule #720
// [Airaf-A-6-L3] Add upcoming and past date ordering in eventController :: verification rule #739
// [Airaf-A-6-L4] Add upcoming and past date ordering in eventController :: verification rule #758
// [Airaf-A-6-L5] Add upcoming and past date ordering in eventController :: verification rule #777
// [Airaf-A-6-L6] Add upcoming and past date ordering in eventController :: verification rule #796
// [Airaf-A-6-L7] Add upcoming and past date ordering in eventController :: verification rule #815
// [Airaf-A-6-L8] Add upcoming and past date ordering in eventController :: verification rule #834
// [Airaf-A-6-L9] Add upcoming and past date ordering in eventController :: verification rule #853
// [Airaf-A-6-L10] Add upcoming and past date ordering in eventController :: verification rule #872
// [Airaf-A-6-L11] Add upcoming and past date ordering in eventController :: verification rule #891
// [Airaf-A-6-L12] Add upcoming and past date ordering in eventController :: verification rule #910
// [Airaf-A-6-L13] Add upcoming and past date ordering in eventController :: verification rule #929
// [Airaf-A-6-L14] Add upcoming and past date ordering in eventController :: verification rule #948
// [Airaf-A-6-L15] Add upcoming and past date ordering in eventController :: verification rule #967
// [Airaf-A-6-L16] Add upcoming and past date ordering in eventController :: verification rule #986
// [Airaf-A-6-L17] Add upcoming and past date ordering in eventController :: verification rule #8
// [Airaf-A-6-L18] Add upcoming and past date ordering in eventController :: verification rule #27
// [Airaf-A-6-L19] Add upcoming and past date ordering in eventController :: verification rule #46
// [Airaf-A-6-L20] Add upcoming and past date ordering in eventController :: verification rule #65
// [Airaf-A-6-L21] Add upcoming and past date ordering in eventController :: verification rule #84
// [Airaf-A-6-L22] Add upcoming and past date ordering in eventController :: verification rule #103
// [Airaf-A-6-L23] Add upcoming and past date ordering in eventController :: verification rule #122
// [Airaf-A-6-L24] Add upcoming and past date ordering in eventController :: verification rule #141
// [Airaf-A-6-L25] Add upcoming and past date ordering in eventController :: verification rule #160
// [Airaf-A-6-L26] Add upcoming and past date ordering in eventController :: verification rule #179
// [Airaf-A-6-L27] Add upcoming and past date ordering in eventController :: verification rule #198
// [Airaf-A-6-L28] Add upcoming and past date ordering in eventController :: verification rule #217
// [Airaf-A-6-L29] Add upcoming and past date ordering in eventController :: verification rule #236
// [Airaf-A-6-L30] Add upcoming and past date ordering in eventController :: verification rule #255
// [Airaf-A-6-L31] Add upcoming and past date ordering in eventController :: verification rule #274
// [Airaf-A-6-L32] Add upcoming and past date ordering in eventController :: verification rule #293
// [Airaf-A-6-L33] Add upcoming and past date ordering in eventController :: verification rule #312
// [Airaf-A-6-L34] Add upcoming and past date ordering in eventController :: verification rule #331
// [Airaf-A-6-L35] Add upcoming and past date ordering in eventController :: verification rule #350
// [Airaf-A-6-L36] Add upcoming and past date ordering in eventController :: verification rule #369
// [Airaf-A-6-L37] Add upcoming and past date ordering in eventController :: verification rule #388
// [Airaf-A-6-L38] Add upcoming and past date ordering in eventController :: verification rule #407
// [Airaf-A-6-L39] Add upcoming and past date ordering in eventController :: verification rule #426
// [Airaf-A-6-L40] Add upcoming and past date ordering in eventController :: verification rule #445
// [Airaf-A-6-L41] Add upcoming and past date ordering in eventController :: verification rule #464
// [Airaf-A-6-L42] Add upcoming and past date ordering in eventController :: verification rule #483
// [Airaf-A-6-L43] Add upcoming and past date ordering in eventController :: verification rule #502
// [Airaf-A-6-L44] Add upcoming and past date ordering in eventController :: verification rule #521
// [Airaf-A-6-L45] Add upcoming and past date ordering in eventController :: verification rule #540
// [Airaf-A-6-L46] Add upcoming and past date ordering in eventController :: verification rule #559
// [Airaf-A-6-L47] Add upcoming and past date ordering in eventController :: verification rule #578
// [Airaf-A-6-L48] Add upcoming and past date ordering in eventController :: verification rule #597
// [Airaf-A-6-L49] Add upcoming and past date ordering in eventController :: verification rule #616
// [Airaf-A-6-L50] Add upcoming and past date ordering in eventController :: verification rule #635
// [Airaf-A-6-L51] Add upcoming and past date ordering in eventController :: verification rule #654
// === [SPEC-BLOCK-END] ===
