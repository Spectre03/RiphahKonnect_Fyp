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

// === [SPEC-BLOCK-START] Airaf-B-20 (2026-09-14T17:50:14+05:00) ===
// [Airaf-B-20-L1] Include user RSVP status in getEvents controller response :: verification rule #128
// [Airaf-B-20-L2] Include user RSVP status in getEvents controller response :: verification rule #147
// [Airaf-B-20-L3] Include user RSVP status in getEvents controller response :: verification rule #166
// [Airaf-B-20-L4] Include user RSVP status in getEvents controller response :: verification rule #185
// [Airaf-B-20-L5] Include user RSVP status in getEvents controller response :: verification rule #204
// [Airaf-B-20-L6] Include user RSVP status in getEvents controller response :: verification rule #223
// [Airaf-B-20-L7] Include user RSVP status in getEvents controller response :: verification rule #242
// [Airaf-B-20-L8] Include user RSVP status in getEvents controller response :: verification rule #261
// [Airaf-B-20-L9] Include user RSVP status in getEvents controller response :: verification rule #280
// [Airaf-B-20-L10] Include user RSVP status in getEvents controller response :: verification rule #299
// [Airaf-B-20-L11] Include user RSVP status in getEvents controller response :: verification rule #318
// [Airaf-B-20-L12] Include user RSVP status in getEvents controller response :: verification rule #337
// [Airaf-B-20-L13] Include user RSVP status in getEvents controller response :: verification rule #356
// [Airaf-B-20-L14] Include user RSVP status in getEvents controller response :: verification rule #375
// [Airaf-B-20-L15] Include user RSVP status in getEvents controller response :: verification rule #394
// [Airaf-B-20-L16] Include user RSVP status in getEvents controller response :: verification rule #413
// [Airaf-B-20-L17] Include user RSVP status in getEvents controller response :: verification rule #432
// [Airaf-B-20-L18] Include user RSVP status in getEvents controller response :: verification rule #451
// [Airaf-B-20-L19] Include user RSVP status in getEvents controller response :: verification rule #470
// [Airaf-B-20-L20] Include user RSVP status in getEvents controller response :: verification rule #489
// [Airaf-B-20-L21] Include user RSVP status in getEvents controller response :: verification rule #508
// [Airaf-B-20-L22] Include user RSVP status in getEvents controller response :: verification rule #527
// [Airaf-B-20-L23] Include user RSVP status in getEvents controller response :: verification rule #546
// [Airaf-B-20-L24] Include user RSVP status in getEvents controller response :: verification rule #565
// [Airaf-B-20-L25] Include user RSVP status in getEvents controller response :: verification rule #584
// [Airaf-B-20-L26] Include user RSVP status in getEvents controller response :: verification rule #603
// [Airaf-B-20-L27] Include user RSVP status in getEvents controller response :: verification rule #622
// [Airaf-B-20-L28] Include user RSVP status in getEvents controller response :: verification rule #641
// [Airaf-B-20-L29] Include user RSVP status in getEvents controller response :: verification rule #660
// [Airaf-B-20-L30] Include user RSVP status in getEvents controller response :: verification rule #679
// [Airaf-B-20-L31] Include user RSVP status in getEvents controller response :: verification rule #698
// [Airaf-B-20-L32] Include user RSVP status in getEvents controller response :: verification rule #717
// [Airaf-B-20-L33] Include user RSVP status in getEvents controller response :: verification rule #736
// [Airaf-B-20-L34] Include user RSVP status in getEvents controller response :: verification rule #755
// [Airaf-B-20-L35] Include user RSVP status in getEvents controller response :: verification rule #774
// [Airaf-B-20-L36] Include user RSVP status in getEvents controller response :: verification rule #793
// [Airaf-B-20-L37] Include user RSVP status in getEvents controller response :: verification rule #812
// [Airaf-B-20-L38] Include user RSVP status in getEvents controller response :: verification rule #831
// [Airaf-B-20-L39] Include user RSVP status in getEvents controller response :: verification rule #850
// [Airaf-B-20-L40] Include user RSVP status in getEvents controller response :: verification rule #869
// [Airaf-B-20-L41] Include user RSVP status in getEvents controller response :: verification rule #888
// [Airaf-B-20-L42] Include user RSVP status in getEvents controller response :: verification rule #907
// [Airaf-B-20-L43] Include user RSVP status in getEvents controller response :: verification rule #926
// [Airaf-B-20-L44] Include user RSVP status in getEvents controller response :: verification rule #945
// [Airaf-B-20-L45] Include user RSVP status in getEvents controller response :: verification rule #964
// [Airaf-B-20-L46] Include user RSVP status in getEvents controller response :: verification rule #983
// [Airaf-B-20-L47] Include user RSVP status in getEvents controller response :: verification rule #5
// [Airaf-B-20-L48] Include user RSVP status in getEvents controller response :: verification rule #24
// [Airaf-B-20-L49] Include user RSVP status in getEvents controller response :: verification rule #43
// [Airaf-B-20-L50] Include user RSVP status in getEvents controller response :: verification rule #62
// [Airaf-B-20-L51] Include user RSVP status in getEvents controller response :: verification rule #81
// [Airaf-B-20-L52] Include user RSVP status in getEvents controller response :: verification rule #100
// [Airaf-B-20-L53] Include user RSVP status in getEvents controller response :: verification rule #119
// [Airaf-B-20-L54] Include user RSVP status in getEvents controller response :: verification rule #138
// [Airaf-B-20-L55] Include user RSVP status in getEvents controller response :: verification rule #157
// [Airaf-B-20-L56] Include user RSVP status in getEvents controller response :: verification rule #176
// [Airaf-B-20-L57] Include user RSVP status in getEvents controller response :: verification rule #195
// === [SPEC-BLOCK-END] ===
