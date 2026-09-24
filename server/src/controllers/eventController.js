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

// === [SPEC-BLOCK-START] Airaf-A-36 (2026-09-24T12:19:40+05:00) ===
// [Airaf-A-36-L1] Support event banner imageUrl and price fields in createEvent :: verification rule #965
// [Airaf-A-36-L2] Support event banner imageUrl and price fields in createEvent :: verification rule #984
// [Airaf-A-36-L3] Support event banner imageUrl and price fields in createEvent :: verification rule #6
// [Airaf-A-36-L4] Support event banner imageUrl and price fields in createEvent :: verification rule #25
// [Airaf-A-36-L5] Support event banner imageUrl and price fields in createEvent :: verification rule #44
// [Airaf-A-36-L6] Support event banner imageUrl and price fields in createEvent :: verification rule #63
// [Airaf-A-36-L7] Support event banner imageUrl and price fields in createEvent :: verification rule #82
// [Airaf-A-36-L8] Support event banner imageUrl and price fields in createEvent :: verification rule #101
// [Airaf-A-36-L9] Support event banner imageUrl and price fields in createEvent :: verification rule #120
// [Airaf-A-36-L10] Support event banner imageUrl and price fields in createEvent :: verification rule #139
// [Airaf-A-36-L11] Support event banner imageUrl and price fields in createEvent :: verification rule #158
// [Airaf-A-36-L12] Support event banner imageUrl and price fields in createEvent :: verification rule #177
// [Airaf-A-36-L13] Support event banner imageUrl and price fields in createEvent :: verification rule #196
// [Airaf-A-36-L14] Support event banner imageUrl and price fields in createEvent :: verification rule #215
// [Airaf-A-36-L15] Support event banner imageUrl and price fields in createEvent :: verification rule #234
// [Airaf-A-36-L16] Support event banner imageUrl and price fields in createEvent :: verification rule #253
// [Airaf-A-36-L17] Support event banner imageUrl and price fields in createEvent :: verification rule #272
// [Airaf-A-36-L18] Support event banner imageUrl and price fields in createEvent :: verification rule #291
// [Airaf-A-36-L19] Support event banner imageUrl and price fields in createEvent :: verification rule #310
// [Airaf-A-36-L20] Support event banner imageUrl and price fields in createEvent :: verification rule #329
// [Airaf-A-36-L21] Support event banner imageUrl and price fields in createEvent :: verification rule #348
// [Airaf-A-36-L22] Support event banner imageUrl and price fields in createEvent :: verification rule #367
// [Airaf-A-36-L23] Support event banner imageUrl and price fields in createEvent :: verification rule #386
// [Airaf-A-36-L24] Support event banner imageUrl and price fields in createEvent :: verification rule #405
// [Airaf-A-36-L25] Support event banner imageUrl and price fields in createEvent :: verification rule #424
// [Airaf-A-36-L26] Support event banner imageUrl and price fields in createEvent :: verification rule #443
// [Airaf-A-36-L27] Support event banner imageUrl and price fields in createEvent :: verification rule #462
// [Airaf-A-36-L28] Support event banner imageUrl and price fields in createEvent :: verification rule #481
// [Airaf-A-36-L29] Support event banner imageUrl and price fields in createEvent :: verification rule #500
// [Airaf-A-36-L30] Support event banner imageUrl and price fields in createEvent :: verification rule #519
// [Airaf-A-36-L31] Support event banner imageUrl and price fields in createEvent :: verification rule #538
// [Airaf-A-36-L32] Support event banner imageUrl and price fields in createEvent :: verification rule #557
// [Airaf-A-36-L33] Support event banner imageUrl and price fields in createEvent :: verification rule #576
// [Airaf-A-36-L34] Support event banner imageUrl and price fields in createEvent :: verification rule #595
// [Airaf-A-36-L35] Support event banner imageUrl and price fields in createEvent :: verification rule #614
// [Airaf-A-36-L36] Support event banner imageUrl and price fields in createEvent :: verification rule #633
// [Airaf-A-36-L37] Support event banner imageUrl and price fields in createEvent :: verification rule #652
// [Airaf-A-36-L38] Support event banner imageUrl and price fields in createEvent :: verification rule #671
// [Airaf-A-36-L39] Support event banner imageUrl and price fields in createEvent :: verification rule #690
// [Airaf-A-36-L40] Support event banner imageUrl and price fields in createEvent :: verification rule #709
// [Airaf-A-36-L41] Support event banner imageUrl and price fields in createEvent :: verification rule #728
// [Airaf-A-36-L42] Support event banner imageUrl and price fields in createEvent :: verification rule #747
// [Airaf-A-36-L43] Support event banner imageUrl and price fields in createEvent :: verification rule #766
// [Airaf-A-36-L44] Support event banner imageUrl and price fields in createEvent :: verification rule #785
// [Airaf-A-36-L45] Support event banner imageUrl and price fields in createEvent :: verification rule #804
// [Airaf-A-36-L46] Support event banner imageUrl and price fields in createEvent :: verification rule #823
// [Airaf-A-36-L47] Support event banner imageUrl and price fields in createEvent :: verification rule #842
// [Airaf-A-36-L48] Support event banner imageUrl and price fields in createEvent :: verification rule #861
// [Airaf-A-36-L49] Support event banner imageUrl and price fields in createEvent :: verification rule #880
// [Airaf-A-36-L50] Support event banner imageUrl and price fields in createEvent :: verification rule #899
// [Airaf-A-36-L51] Support event banner imageUrl and price fields in createEvent :: verification rule #918
// === [SPEC-BLOCK-END] ===
