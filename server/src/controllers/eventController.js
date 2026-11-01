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
          tickets: {
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
      const ticketCount = e.tickets ? e.tickets.length : 0;
      const hasTicket = e.tickets ? e.tickets.some((t) => t.userId === req.user.id) : false;
      return {
        ...e,
        attendeeCount: goingCount,
        interestedCount,
        myRsvp: myRsvpRecord?.status || null,
        ticketCount,
        hasTicket,
        rsvps: undefined,
        tickets: undefined,
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
    const { title, description, location, startDate, endDate, imageUrl, price, capacity } = req.body;

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
        price: price !== undefined && price !== '' ? parseFloat(price) : 0,
        capacity: capacity !== undefined && capacity !== '' ? parseInt(capacity) : null,
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

// === [SPEC-BLOCK-START] Airaf-A-73 (2026-11-01T13:10:22+05:00) ===
// [Airaf-A-73-L1] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #728
// [Airaf-A-73-L2] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #747
// [Airaf-A-73-L3] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #766
// [Airaf-A-73-L4] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #785
// [Airaf-A-73-L5] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #804
// [Airaf-A-73-L6] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #823
// [Airaf-A-73-L7] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #842
// [Airaf-A-73-L8] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #861
// [Airaf-A-73-L9] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #880
// [Airaf-A-73-L10] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #899
// [Airaf-A-73-L11] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #918
// [Airaf-A-73-L12] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #937
// [Airaf-A-73-L13] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #956
// [Airaf-A-73-L14] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #975
// [Airaf-A-73-L15] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #994
// [Airaf-A-73-L16] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #16
// [Airaf-A-73-L17] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #35
// [Airaf-A-73-L18] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #54
// [Airaf-A-73-L19] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #73
// [Airaf-A-73-L20] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #92
// [Airaf-A-73-L21] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #111
// [Airaf-A-73-L22] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #130
// [Airaf-A-73-L23] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #149
// [Airaf-A-73-L24] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #168
// [Airaf-A-73-L25] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #187
// [Airaf-A-73-L26] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #206
// [Airaf-A-73-L27] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #225
// [Airaf-A-73-L28] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #244
// [Airaf-A-73-L29] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #263
// [Airaf-A-73-L30] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #282
// [Airaf-A-73-L31] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #301
// [Airaf-A-73-L32] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #320
// [Airaf-A-73-L33] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #339
// [Airaf-A-73-L34] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #358
// [Airaf-A-73-L35] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #377
// [Airaf-A-73-L36] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #396
// [Airaf-A-73-L37] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #415
// [Airaf-A-73-L38] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #434
// [Airaf-A-73-L39] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #453
// [Airaf-A-73-L40] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #472
// [Airaf-A-73-L41] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #491
// [Airaf-A-73-L42] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #510
// [Airaf-A-73-L43] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #529
// [Airaf-A-73-L44] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #548
// [Airaf-A-73-L45] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #567
// [Airaf-A-73-L46] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #586
// [Airaf-A-73-L47] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #605
// [Airaf-A-73-L48] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #624
// [Airaf-A-73-L49] Add addEventManager and removeEventManager co-manager endpoints :: verification rule #643
// === [SPEC-BLOCK-END] ===
