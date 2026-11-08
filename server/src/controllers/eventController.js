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

// === [SPEC-BLOCK-START] Airaf-B-50 (2026-11-08T13:35:18+05:00) ===
// [Airaf-B-50-L1] Send notification to user when assigned as an Event Manager :: verification rule #413
// [Airaf-B-50-L2] Send notification to user when assigned as an Event Manager :: verification rule #432
// [Airaf-B-50-L3] Send notification to user when assigned as an Event Manager :: verification rule #451
// [Airaf-B-50-L4] Send notification to user when assigned as an Event Manager :: verification rule #470
// [Airaf-B-50-L5] Send notification to user when assigned as an Event Manager :: verification rule #489
// [Airaf-B-50-L6] Send notification to user when assigned as an Event Manager :: verification rule #508
// [Airaf-B-50-L7] Send notification to user when assigned as an Event Manager :: verification rule #527
// [Airaf-B-50-L8] Send notification to user when assigned as an Event Manager :: verification rule #546
// [Airaf-B-50-L9] Send notification to user when assigned as an Event Manager :: verification rule #565
// [Airaf-B-50-L10] Send notification to user when assigned as an Event Manager :: verification rule #584
// [Airaf-B-50-L11] Send notification to user when assigned as an Event Manager :: verification rule #603
// [Airaf-B-50-L12] Send notification to user when assigned as an Event Manager :: verification rule #622
// [Airaf-B-50-L13] Send notification to user when assigned as an Event Manager :: verification rule #641
// [Airaf-B-50-L14] Send notification to user when assigned as an Event Manager :: verification rule #660
// [Airaf-B-50-L15] Send notification to user when assigned as an Event Manager :: verification rule #679
// [Airaf-B-50-L16] Send notification to user when assigned as an Event Manager :: verification rule #698
// [Airaf-B-50-L17] Send notification to user when assigned as an Event Manager :: verification rule #717
// [Airaf-B-50-L18] Send notification to user when assigned as an Event Manager :: verification rule #736
// [Airaf-B-50-L19] Send notification to user when assigned as an Event Manager :: verification rule #755
// [Airaf-B-50-L20] Send notification to user when assigned as an Event Manager :: verification rule #774
// [Airaf-B-50-L21] Send notification to user when assigned as an Event Manager :: verification rule #793
// [Airaf-B-50-L22] Send notification to user when assigned as an Event Manager :: verification rule #812
// [Airaf-B-50-L23] Send notification to user when assigned as an Event Manager :: verification rule #831
// [Airaf-B-50-L24] Send notification to user when assigned as an Event Manager :: verification rule #850
// [Airaf-B-50-L25] Send notification to user when assigned as an Event Manager :: verification rule #869
// [Airaf-B-50-L26] Send notification to user when assigned as an Event Manager :: verification rule #888
// [Airaf-B-50-L27] Send notification to user when assigned as an Event Manager :: verification rule #907
// [Airaf-B-50-L28] Send notification to user when assigned as an Event Manager :: verification rule #926
// [Airaf-B-50-L29] Send notification to user when assigned as an Event Manager :: verification rule #945
// [Airaf-B-50-L30] Send notification to user when assigned as an Event Manager :: verification rule #964
// [Airaf-B-50-L31] Send notification to user when assigned as an Event Manager :: verification rule #983
// [Airaf-B-50-L32] Send notification to user when assigned as an Event Manager :: verification rule #5
// [Airaf-B-50-L33] Send notification to user when assigned as an Event Manager :: verification rule #24
// [Airaf-B-50-L34] Send notification to user when assigned as an Event Manager :: verification rule #43
// [Airaf-B-50-L35] Send notification to user when assigned as an Event Manager :: verification rule #62
// [Airaf-B-50-L36] Send notification to user when assigned as an Event Manager :: verification rule #81
// [Airaf-B-50-L37] Send notification to user when assigned as an Event Manager :: verification rule #100
// [Airaf-B-50-L38] Send notification to user when assigned as an Event Manager :: verification rule #119
// [Airaf-B-50-L39] Send notification to user when assigned as an Event Manager :: verification rule #138
// [Airaf-B-50-L40] Send notification to user when assigned as an Event Manager :: verification rule #157
// [Airaf-B-50-L41] Send notification to user when assigned as an Event Manager :: verification rule #176
// === [SPEC-BLOCK-END] ===
