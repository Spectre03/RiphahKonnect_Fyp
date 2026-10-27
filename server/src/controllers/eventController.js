const prisma = require('../config/db');
const { checkTextContent } = require('../utils/moderation');

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
          rsvps: {
            select: { id: true, userId: true, status: true },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    const formatted = events.map((e) => {
      const goingCount = e.rsvps.filter((r) => r.status === 'GOING').length;
      const interestedCount = e.rsvps.filter((r) => r.status === 'INTERESTED').length;
      const myRsvpRecord = e.rsvps.find((r) => r.userId === req.user.id);
      return {
        ...e,
        attendeeCount: goingCount,
        interestedCount,
        myRsvp: myRsvpRecord?.status || null,
        rsvps: undefined,
      };
    });

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

    const titleCheck = checkTextContent(title, { minLength: 3, fieldName: 'Event title' });
    if (!titleCheck.clean) return res.status(400).json({ error: titleCheck.reason });

    const descCheck = checkTextContent(description, { minLength: 10, fieldName: 'Event description' });
    if (!descCheck.clean) return res.status(400).json({ error: descCheck.reason });

    if (location) {
      const locCheck = checkTextContent(location, { minLength: 2, fieldName: 'Event location' });
      if (!locCheck.clean) return res.status(400).json({ error: locCheck.reason });
    }

    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        location: location ? location.trim() : null,
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

    // Spawn Notifications for all users
    const targetUsers = await prisma.user.findMany({
      where: { id: { not: req.user.id } },
      select: { id: true },
    });

    if (targetUsers.length > 0) {
      const notifications = targetUsers.map(u => ({
        userId: u.id,
        title: `New Campus Event: ${title}`,
        content: `A new event has been scheduled for ${new Date(startDate).toLocaleDateString()}`,
        type: 'EVENT',
        link: `/events`,
      }));
      
      await prisma.notification.createMany({ data: notifications });

      const io = req.app.get('io');
      if (io) {
        targetUsers.forEach(u => {
          io.to(`user:${u.id}`).emit('notification', {
            title: `New Campus Event: ${title}`,
            content: `A new event has been scheduled for ${new Date(startDate).toLocaleDateString()}`,
            type: 'EVENT',
            link: `/events`
          });
        });
      }
    }

    res.status(201).json({ event: { ...event, attendeeCount: 0, interestedCount: 0, myRsvp: null } });
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
        rsvps: {
          select: { id: true, userId: true, status: true },
        },
      },
    });

    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const goingCount = event.rsvps.filter((r) => r.status === 'GOING').length;
    const interestedCount = event.rsvps.filter((r) => r.status === 'INTERESTED').length;
    const myRsvpRecord = event.rsvps.find((r) => r.userId === req.user.id);

    res.json({
      event: {
        ...event,
        attendeeCount: goingCount,
        interestedCount,
        myRsvp: myRsvpRecord?.status || null,
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
    const { status } = req.body; // GOING, INTERESTED, NOT_GOING, REMOVE

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const existing = await prisma.eventRsvp.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });

    let currentRsvp = null;
    if (existing) {
      if (status === 'REMOVE' || existing.status === status) {
        await prisma.eventRsvp.delete({ where: { id: existing.id } });
        currentRsvp = null;
      } else {
        currentRsvp = await prisma.eventRsvp.update({
          where: { id: existing.id },
          data: { status },
        });
      }
    } else if (status !== 'REMOVE') {
      currentRsvp = await prisma.eventRsvp.create({
        data: { userId, eventId, status: status || 'GOING' },
      });
    }

    const [attendeeCount, interestedCount] = await Promise.all([
      prisma.eventRsvp.count({ where: { eventId, status: 'GOING' } }),
      prisma.eventRsvp.count({ where: { eventId, status: 'INTERESTED' } }),
    ]);

    res.json({
      rsvp: currentRsvp,
      myRsvp: currentRsvp ? currentRsvp.status : null,
      attendeeCount,
      interestedCount,
    });
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

// === [SPEC-BLOCK-START] Airaf-A-64 (2026-10-27T18:10:44+05:00) ===
// [Airaf-A-64-L1] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #981
// [Airaf-A-64-L2] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #3
// [Airaf-A-64-L3] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #22
// [Airaf-A-64-L4] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #41
// [Airaf-A-64-L5] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #60
// [Airaf-A-64-L6] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #79
// [Airaf-A-64-L7] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #98
// [Airaf-A-64-L8] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #117
// [Airaf-A-64-L9] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #136
// [Airaf-A-64-L10] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #155
// [Airaf-A-64-L11] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #174
// [Airaf-A-64-L12] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #193
// [Airaf-A-64-L13] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #212
// [Airaf-A-64-L14] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #231
// [Airaf-A-64-L15] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #250
// [Airaf-A-64-L16] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #269
// [Airaf-A-64-L17] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #288
// [Airaf-A-64-L18] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #307
// [Airaf-A-64-L19] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #326
// [Airaf-A-64-L20] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #345
// [Airaf-A-64-L21] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #364
// [Airaf-A-64-L22] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #383
// [Airaf-A-64-L23] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #402
// [Airaf-A-64-L24] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #421
// [Airaf-A-64-L25] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #440
// [Airaf-A-64-L26] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #459
// [Airaf-A-64-L27] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #478
// [Airaf-A-64-L28] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #497
// [Airaf-A-64-L29] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #516
// [Airaf-A-64-L30] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #535
// [Airaf-A-64-L31] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #554
// [Airaf-A-64-L32] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #573
// [Airaf-A-64-L33] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #592
// [Airaf-A-64-L34] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #611
// [Airaf-A-64-L35] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #630
// [Airaf-A-64-L36] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #649
// [Airaf-A-64-L37] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #668
// [Airaf-A-64-L38] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #687
// [Airaf-A-64-L39] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #706
// [Airaf-A-64-L40] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #725
// [Airaf-A-64-L41] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #744
// [Airaf-A-64-L42] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #763
// [Airaf-A-64-L43] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #782
// [Airaf-A-64-L44] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #801
// [Airaf-A-64-L45] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #820
// [Airaf-A-64-L46] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #839
// [Airaf-A-64-L47] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #858
// [Airaf-A-64-L48] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #877
// [Airaf-A-64-L49] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #896
// [Airaf-A-64-L50] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #915
// [Airaf-A-64-L51] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #934
// [Airaf-A-64-L52] Include attached paymentSlipUrl and transaction reference in event ticket queries :: verification rule #953
// === [SPEC-BLOCK-END] ===
