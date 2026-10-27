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

// === [SPEC-BLOCK-START] Airaf-B-43 (2026-10-27T17:48:05+05:00) ===
// [Airaf-B-43-L1] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #919
// [Airaf-B-43-L2] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #938
// [Airaf-B-43-L3] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #957
// [Airaf-B-43-L4] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #976
// [Airaf-B-43-L5] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #995
// [Airaf-B-43-L6] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #17
// [Airaf-B-43-L7] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #36
// [Airaf-B-43-L8] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #55
// [Airaf-B-43-L9] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #74
// [Airaf-B-43-L10] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #93
// [Airaf-B-43-L11] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #112
// [Airaf-B-43-L12] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #131
// [Airaf-B-43-L13] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #150
// [Airaf-B-43-L14] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #169
// [Airaf-B-43-L15] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #188
// [Airaf-B-43-L16] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #207
// [Airaf-B-43-L17] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #226
// [Airaf-B-43-L18] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #245
// [Airaf-B-43-L19] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #264
// [Airaf-B-43-L20] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #283
// [Airaf-B-43-L21] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #302
// [Airaf-B-43-L22] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #321
// [Airaf-B-43-L23] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #340
// [Airaf-B-43-L24] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #359
// [Airaf-B-43-L25] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #378
// [Airaf-B-43-L26] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #397
// [Airaf-B-43-L27] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #416
// [Airaf-B-43-L28] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #435
// [Airaf-B-43-L29] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #454
// [Airaf-B-43-L30] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #473
// [Airaf-B-43-L31] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #492
// [Airaf-B-43-L32] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #511
// [Airaf-B-43-L33] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #530
// [Airaf-B-43-L34] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #549
// [Airaf-B-43-L35] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #568
// [Airaf-B-43-L36] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #587
// [Airaf-B-43-L37] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #606
// [Airaf-B-43-L38] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #625
// [Airaf-B-43-L39] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #644
// [Airaf-B-43-L40] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #663
// [Airaf-B-43-L41] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #682
// [Airaf-B-43-L42] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #701
// [Airaf-B-43-L43] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #720
// [Airaf-B-43-L44] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #739
// [Airaf-B-43-L45] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #758
// [Airaf-B-43-L46] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #777
// [Airaf-B-43-L47] Return myTicketStatus and myTicketCode fields in getEvents :: verification rule #796
// === [SPEC-BLOCK-END] ===
