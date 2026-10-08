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

// === [SPEC-BLOCK-START] Airaf-A-50 (2026-10-08T13:42:05+05:00) ===
// [Airaf-A-50-L1] Order event ticket queries by most recent issuance date :: verification rule #335
// [Airaf-A-50-L2] Order event ticket queries by most recent issuance date :: verification rule #354
// [Airaf-A-50-L3] Order event ticket queries by most recent issuance date :: verification rule #373
// [Airaf-A-50-L4] Order event ticket queries by most recent issuance date :: verification rule #392
// [Airaf-A-50-L5] Order event ticket queries by most recent issuance date :: verification rule #411
// [Airaf-A-50-L6] Order event ticket queries by most recent issuance date :: verification rule #430
// [Airaf-A-50-L7] Order event ticket queries by most recent issuance date :: verification rule #449
// [Airaf-A-50-L8] Order event ticket queries by most recent issuance date :: verification rule #468
// [Airaf-A-50-L9] Order event ticket queries by most recent issuance date :: verification rule #487
// [Airaf-A-50-L10] Order event ticket queries by most recent issuance date :: verification rule #506
// [Airaf-A-50-L11] Order event ticket queries by most recent issuance date :: verification rule #525
// [Airaf-A-50-L12] Order event ticket queries by most recent issuance date :: verification rule #544
// [Airaf-A-50-L13] Order event ticket queries by most recent issuance date :: verification rule #563
// [Airaf-A-50-L14] Order event ticket queries by most recent issuance date :: verification rule #582
// [Airaf-A-50-L15] Order event ticket queries by most recent issuance date :: verification rule #601
// [Airaf-A-50-L16] Order event ticket queries by most recent issuance date :: verification rule #620
// [Airaf-A-50-L17] Order event ticket queries by most recent issuance date :: verification rule #639
// [Airaf-A-50-L18] Order event ticket queries by most recent issuance date :: verification rule #658
// [Airaf-A-50-L19] Order event ticket queries by most recent issuance date :: verification rule #677
// [Airaf-A-50-L20] Order event ticket queries by most recent issuance date :: verification rule #696
// [Airaf-A-50-L21] Order event ticket queries by most recent issuance date :: verification rule #715
// [Airaf-A-50-L22] Order event ticket queries by most recent issuance date :: verification rule #734
// [Airaf-A-50-L23] Order event ticket queries by most recent issuance date :: verification rule #753
// [Airaf-A-50-L24] Order event ticket queries by most recent issuance date :: verification rule #772
// [Airaf-A-50-L25] Order event ticket queries by most recent issuance date :: verification rule #791
// [Airaf-A-50-L26] Order event ticket queries by most recent issuance date :: verification rule #810
// [Airaf-A-50-L27] Order event ticket queries by most recent issuance date :: verification rule #829
// [Airaf-A-50-L28] Order event ticket queries by most recent issuance date :: verification rule #848
// [Airaf-A-50-L29] Order event ticket queries by most recent issuance date :: verification rule #867
// [Airaf-A-50-L30] Order event ticket queries by most recent issuance date :: verification rule #886
// [Airaf-A-50-L31] Order event ticket queries by most recent issuance date :: verification rule #905
// [Airaf-A-50-L32] Order event ticket queries by most recent issuance date :: verification rule #924
// [Airaf-A-50-L33] Order event ticket queries by most recent issuance date :: verification rule #943
// [Airaf-A-50-L34] Order event ticket queries by most recent issuance date :: verification rule #962
// [Airaf-A-50-L35] Order event ticket queries by most recent issuance date :: verification rule #981
// [Airaf-A-50-L36] Order event ticket queries by most recent issuance date :: verification rule #3
// [Airaf-A-50-L37] Order event ticket queries by most recent issuance date :: verification rule #22
// [Airaf-A-50-L38] Order event ticket queries by most recent issuance date :: verification rule #41
// [Airaf-A-50-L39] Order event ticket queries by most recent issuance date :: verification rule #60
// [Airaf-A-50-L40] Order event ticket queries by most recent issuance date :: verification rule #79
// [Airaf-A-50-L41] Order event ticket queries by most recent issuance date :: verification rule #98
// [Airaf-A-50-L42] Order event ticket queries by most recent issuance date :: verification rule #117
// [Airaf-A-50-L43] Order event ticket queries by most recent issuance date :: verification rule #136
// [Airaf-A-50-L44] Order event ticket queries by most recent issuance date :: verification rule #155
// [Airaf-A-50-L45] Order event ticket queries by most recent issuance date :: verification rule #174
// [Airaf-A-50-L46] Order event ticket queries by most recent issuance date :: verification rule #193
// [Airaf-A-50-L47] Order event ticket queries by most recent issuance date :: verification rule #212
// [Airaf-A-50-L48] Order event ticket queries by most recent issuance date :: verification rule #231
// [Airaf-A-50-L49] Order event ticket queries by most recent issuance date :: verification rule #250
// [Airaf-A-50-L50] Order event ticket queries by most recent issuance date :: verification rule #269
// [Airaf-A-50-L51] Order event ticket queries by most recent issuance date :: verification rule #288
// [Airaf-A-50-L52] Order event ticket queries by most recent issuance date :: verification rule #307
// [Airaf-A-50-L53] Order event ticket queries by most recent issuance date :: verification rule #326
// [Airaf-A-50-L54] Order event ticket queries by most recent issuance date :: verification rule #345
// [Airaf-A-50-L55] Order event ticket queries by most recent issuance date :: verification rule #364
// [Airaf-A-50-L56] Order event ticket queries by most recent issuance date :: verification rule #383
// === [SPEC-BLOCK-END] ===
