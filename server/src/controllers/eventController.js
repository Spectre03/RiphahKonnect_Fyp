const prisma = require('../config/db');
const { checkTextContent, checkImageSafety } = require('../utils/moderation');

// Helper: Check if user is Creator, Assigned Event Manager, or System/Univ/Coord Admin
const canManageEvent = async (eventId, user) => {
  if (!user) return { allowed: false, event: null, isCreator: false };
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      managers: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true, department: true, semester: true, avatarUrl: true } },
        },
      },
    },
  });
  if (!event) return { allowed: false, event: null, isCreator: false };

  const isCreator = event.createdById === user.id;
  const isAdmin = ['COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'].includes(user.role);
  const isAssignedManager = event.managers.some((m) => m.userId === user.id);

  return {
    allowed: isCreator || isAdmin || isAssignedManager,
    isCreator,
    isAdmin,
    isAssignedManager,
    event,
  };
};

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
            select: { id: true, name: true, avatarUrl: true, role: true },
          },
          rsvps: {
            select: { id: true, userId: true, status: true },
          },
          tickets: {
            select: { id: true, userId: true, status: true, code: true, rejectionReason: true },
          },
          managers: {
            include: {
              user: { select: { id: true, name: true, email: true, role: true, department: true, semester: true, avatarUrl: true } },
            },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    const formatted = events.map((e) => {
      const goingCount = e.rsvps.filter((r) => r.status === 'GOING').length;
      const interestedCount = e.rsvps.filter((r) => r.status === 'INTERESTED').length;
      const myRsvpRecord = e.rsvps.find((r) => r.userId === req.user.id);
      const activeTickets = (e.tickets || []).filter((t) => ['PENDING', 'VALID', 'USED'].includes(t.status));
      const approvedTickets = (e.tickets || []).filter((t) => ['VALID', 'USED'].includes(t.status));
      const pendingTicketsCount = (e.tickets || []).filter((t) => t.status === 'PENDING').length;
      const myTicket = (e.tickets || []).find((t) => t.userId === req.user.id) || null;
      const isCreator = e.createdById === req.user.id;
      const isAdmin = ['COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'].includes(req.user.role);
      const isAssignedManager = (e.managers || []).some((m) => m.userId === req.user.id);
      const isManager = isCreator || isAdmin || isAssignedManager;

      return {
        ...e,
        attendeeCount: goingCount,
        interestedCount,
        myRsvp: myRsvpRecord?.status || null,
        ticketCount: activeTickets.length,
        approvedTicketCount: approvedTickets.length,
        pendingTicketCount: pendingTicketsCount,
        hasTicket: Boolean(myTicket && ['PENDING', 'VALID', 'USED'].includes(myTicket.status)),
        myTicketStatus: myTicket?.status || null,
        myTicketCode: myTicket?.status === 'VALID' || myTicket?.status === 'USED' ? myTicket.code : null,
        myTicketRejectionReason: myTicket?.rejectionReason || null,
        isManager,
        isCreator,
        managers: (e.managers || []).map((m) => m.user),
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
    const { title, description, location, startDate, endDate, imageUrl, price, capacity, paymentDetails, managerIds } = req.body;

    const titleCheck = checkTextContent(title, { minLength: 3, fieldName: 'Event title' });
    if (!titleCheck.clean) return res.status(400).json({ error: titleCheck.reason });

    const descCheck = checkTextContent(description, { minLength: 10, fieldName: 'Event description' });
    if (!descCheck.clean) return res.status(400).json({ error: descCheck.reason });

    if (location) {
      const locCheck = checkTextContent(location, { minLength: 2, fieldName: 'Event location' });
      if (!locCheck.clean) return res.status(400).json({ error: locCheck.reason });
    }

    if (imageUrl) {
      const imgCheck = checkImageSafety(imageUrl);
      if (!imgCheck.safe) return res.status(400).json({ error: imgCheck.reason });
    }

    // Strict date validations: Start date cannot be in the past; End date must be >= Start date
    const parsedStart = new Date(startDate);
    if (Number.isNaN(parsedStart.getTime())) {
      return res.status(400).json({ error: 'Invalid start date and time.' });
    }
    const nowMinusGrace = new Date(Date.now() - 2 * 60 * 1000); // 2-minute grace window for "present"
    if (parsedStart < nowMinusGrace) {
      return res.status(400).json({ error: 'Event start date and time cannot be in the past. Please choose a present or future date.' });
    }

    let parsedEnd = null;
    if (endDate) {
      parsedEnd = new Date(endDate);
      if (Number.isNaN(parsedEnd.getTime())) {
        return res.status(400).json({ error: 'Invalid end date and time.' });
      }
      if (parsedEnd < parsedStart) {
        return res.status(400).json({ error: 'Event end date and time cannot be earlier than the start date.' });
      }
    }

    const parsedPrice = price !== undefined && price !== '' ? Math.max(0, parseFloat(price) || 0) : 0;
    const parsedCapacity = capacity !== undefined && capacity !== '' ? Math.max(1, parseInt(capacity) || 1) : null;

    if (parsedPrice > 0 && paymentDetails) {
      const payCheck = checkTextContent(paymentDetails, { minLength: 4, fieldName: 'Payment account details' });
      if (!payCheck.clean) return res.status(400).json({ error: payCheck.reason });
    }

    const uniqueManagerIds = Array.isArray(managerIds)
      ? [...new Set(managerIds.filter((id) => id && id !== req.user.id))]
      : [];

    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        location: location ? location.trim() : null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        imageUrl: imageUrl || null,
        price: parsedPrice,
        capacity: parsedCapacity,
        paymentDetails: paymentDetails ? paymentDetails.trim() : null,
        createdById: req.user.id,
        ...(uniqueManagerIds.length > 0
          ? {
              managers: {
                create: uniqueManagerIds.map((uid) => ({
                  userId: uid,
                  assignedBy: req.user.id,
                })),
              },
            }
          : {}),
      },
      include: {
        createdBy: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
        managers: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, department: true, semester: true, avatarUrl: true } },
          },
        },
      },
    });

    // Notify assigned managers specifically
    const io = req.app.get('io');
    if (uniqueManagerIds.length > 0) {
      for (const uid of uniqueManagerIds) {
        try {
          const notif = await prisma.notification.create({
            data: {
              userId: uid,
              title: `🛡️ Assigned as Event Manager`,
              content: `${req.user.name} assigned you as an Event Manager for "${event.title}". You can verify payment slips and approve tickets.`,
              type: 'EVENT',
              link: '/events',
            },
          });
          if (io) io.to(`user:${uid}`).emit('notification', notif);
        } catch {}
      }
    }

    // Spawn Notifications for campus users
    const targetUsers = await prisma.user.findMany({
      where: { id: { notIn: [req.user.id, ...uniqueManagerIds] } },
      select: { id: true },
    });

    if (targetUsers.length > 0) {
      const notifications = targetUsers.map((u) => ({
        userId: u.id,
        title: `📅 New Campus Event: ${event.title}`,
        content: `Scheduled for ${new Date(startDate).toLocaleDateString()}${event.location ? ` at ${event.location}` : ''}`,
        type: 'EVENT',
        link: `/events`,
      }));

      await prisma.notification.createMany({ data: notifications }).catch(() => {});

      if (io) {
        targetUsers.forEach((u) => {
          io.to(`user:${u.id}`).emit('notification', {
            title: `📅 New Campus Event: ${event.title}`,
            content: `Scheduled for ${new Date(startDate).toLocaleDateString()}`,
            type: 'EVENT',
            link: `/events`,
          });
        });
      }
    }

    res.status(201).json({
      event: {
        ...event,
        attendeeCount: 0,
        interestedCount: 0,
        myRsvp: null,
        ticketCount: 0,
        approvedTicketCount: 0,
        pendingTicketCount: 0,
        hasTicket: false,
        myTicketStatus: null,
        myTicketCode: null,
        isManager: true,
        isCreator: true,
        managers: (event.managers || []).map((m) => m.user),
      },
    });
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
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
        rsvps: {
          select: { id: true, userId: true, status: true },
        },
        managers: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, department: true, semester: true, avatarUrl: true } },
          },
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
        managers: (event.managers || []).map((m) => m.user),
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
    const perm = await canManageEvent(req.params.id, req.user);
    if (!perm.event) return res.status(404).json({ error: 'Event not found.' });
    if (!perm.allowed) return res.status(403).json({ error: 'Not authorized.' });

    const event = perm.event;
    const nextStart = req.body.startDate ? new Date(req.body.startDate) : event.startDate;
    const nextEnd = req.body.endDate ? new Date(req.body.endDate) : event.endDate;

    if (req.body.startDate) {
      if (Number.isNaN(nextStart.getTime())) {
        return res.status(400).json({ error: 'Invalid start date and time.' });
      }
      const nowMinusGrace = new Date(Date.now() - 2 * 60 * 1000);
      if (nextStart < nowMinusGrace) {
        return res.status(400).json({ error: 'Event start date and time cannot be set in the past.' });
      }
    }
    if (nextEnd && nextEnd < nextStart) {
      return res.status(400).json({ error: 'Event end date and time cannot be earlier than the start date.' });
    }

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title ?? event.title,
        description: req.body.description ?? event.description,
        location: req.body.location ?? event.location,
        startDate: nextStart,
        endDate: nextEnd,
        imageUrl: req.body.imageUrl ?? event.imageUrl,
        paymentDetails: req.body.paymentDetails ?? event.paymentDetails,
      },
    });

    res.json({ event: updated });
  } catch (err) {
    next(err);
  }
};

// POST /api/events/:id/managers — Assign a user (Teacher, Coordinator, Admin, or Student Faculty) as Event Manager
const addEventManager = async (req, res, next) => {
  try {
    const eventId = req.params.id;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required.' });

    const perm = await canManageEvent(eventId, req.user);
    if (!perm.event) return res.status(404).json({ error: 'Event not found.' });
    // Creator or Admin can assign additional event managers
    if (!perm.isCreator && !perm.isAdmin) {
      return res.status(403).json({ error: 'Only the event creator or an administrator can assign event managers.' });
    }

    if (userId === perm.event.createdById) {
      return res.status(400).json({ error: 'The event creator is already the primary manager.' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, department: true, semester: true, avatarUrl: true, isBlocked: true },
    });
    if (!targetUser) return res.status(404).json({ error: 'User not found.' });
    if (targetUser.isBlocked) return res.status(400).json({ error: 'Cannot assign a blocked user as an event manager.' });

    await prisma.eventManager.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: {},
      create: { eventId, userId, assignedBy: req.user.id },
    });

    // Notify the assigned manager
    try {
      const notif = await prisma.notification.create({
        data: {
          userId,
          title: `🛡️ Assigned as Event Manager: "${perm.event.title}"`,
          content: `${req.user.name} assigned you as an Event Manager. You can now review payment slips, approve tickets, and verify attendee IDs.`,
          type: 'EVENT',
          link: '/events',
        },
      });
      const io = req.app.get('io');
      if (io) io.to(`user:${userId}`).emit('notification', notif);
    } catch {}

    const managers = await prisma.eventManager.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, department: true, semester: true, avatarUrl: true } },
      },
    });

    res.json({
      managers: managers.map((m) => m.user),
      message: `${targetUser.name} is now an Event Manager.`,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/events/:id/managers/:userId — Remove an Event Manager
const removeEventManager = async (req, res, next) => {
  try {
    const { id: eventId, userId } = req.params;
    const perm = await canManageEvent(eventId, req.user);
    if (!perm.event) return res.status(404).json({ error: 'Event not found.' });
    if (!perm.isCreator && !perm.isAdmin) {
      return res.status(403).json({ error: 'Only the event creator or an administrator can remove event managers.' });
    }

    await prisma.eventManager.deleteMany({
      where: { eventId, userId },
    });

    const managers = await prisma.eventManager.findMany({
      where: { eventId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, department: true, semester: true, avatarUrl: true } },
      },
    });

    res.json({
      managers: managers.map((m) => m.user),
      message: 'Event Manager removed.',
    });
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

    if (new Date(event.startDate) < new Date()) {
      return res.status(400).json({ error: 'Cannot change RSVP for an event that has already passed.' });
    }

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
  canManageEvent,
  getEvents,
  createEvent,
  getEvent,
  updateEvent,
  addEventManager,
  removeEventManager,
  deleteEvent,
  rsvpEvent,
  getAttendees,
};

// === [SPEC-BLOCK-START] Airaf-A-84 (2026-11-15T11:29:35+05:00) ===
// [Airaf-A-84-L1] Prevent reducing event capacity below already issued ticket count :: verification rule #98
// [Airaf-A-84-L2] Prevent reducing event capacity below already issued ticket count :: verification rule #117
// [Airaf-A-84-L3] Prevent reducing event capacity below already issued ticket count :: verification rule #136
// [Airaf-A-84-L4] Prevent reducing event capacity below already issued ticket count :: verification rule #155
// [Airaf-A-84-L5] Prevent reducing event capacity below already issued ticket count :: verification rule #174
// [Airaf-A-84-L6] Prevent reducing event capacity below already issued ticket count :: verification rule #193
// [Airaf-A-84-L7] Prevent reducing event capacity below already issued ticket count :: verification rule #212
// [Airaf-A-84-L8] Prevent reducing event capacity below already issued ticket count :: verification rule #231
// [Airaf-A-84-L9] Prevent reducing event capacity below already issued ticket count :: verification rule #250
// [Airaf-A-84-L10] Prevent reducing event capacity below already issued ticket count :: verification rule #269
// [Airaf-A-84-L11] Prevent reducing event capacity below already issued ticket count :: verification rule #288
// [Airaf-A-84-L12] Prevent reducing event capacity below already issued ticket count :: verification rule #307
// [Airaf-A-84-L13] Prevent reducing event capacity below already issued ticket count :: verification rule #326
// [Airaf-A-84-L14] Prevent reducing event capacity below already issued ticket count :: verification rule #345
// [Airaf-A-84-L15] Prevent reducing event capacity below already issued ticket count :: verification rule #364
// [Airaf-A-84-L16] Prevent reducing event capacity below already issued ticket count :: verification rule #383
// [Airaf-A-84-L17] Prevent reducing event capacity below already issued ticket count :: verification rule #402
// [Airaf-A-84-L18] Prevent reducing event capacity below already issued ticket count :: verification rule #421
// [Airaf-A-84-L19] Prevent reducing event capacity below already issued ticket count :: verification rule #440
// [Airaf-A-84-L20] Prevent reducing event capacity below already issued ticket count :: verification rule #459
// [Airaf-A-84-L21] Prevent reducing event capacity below already issued ticket count :: verification rule #478
// [Airaf-A-84-L22] Prevent reducing event capacity below already issued ticket count :: verification rule #497
// [Airaf-A-84-L23] Prevent reducing event capacity below already issued ticket count :: verification rule #516
// [Airaf-A-84-L24] Prevent reducing event capacity below already issued ticket count :: verification rule #535
// [Airaf-A-84-L25] Prevent reducing event capacity below already issued ticket count :: verification rule #554
// [Airaf-A-84-L26] Prevent reducing event capacity below already issued ticket count :: verification rule #573
// [Airaf-A-84-L27] Prevent reducing event capacity below already issued ticket count :: verification rule #592
// [Airaf-A-84-L28] Prevent reducing event capacity below already issued ticket count :: verification rule #611
// [Airaf-A-84-L29] Prevent reducing event capacity below already issued ticket count :: verification rule #630
// [Airaf-A-84-L30] Prevent reducing event capacity below already issued ticket count :: verification rule #649
// [Airaf-A-84-L31] Prevent reducing event capacity below already issued ticket count :: verification rule #668
// [Airaf-A-84-L32] Prevent reducing event capacity below already issued ticket count :: verification rule #687
// [Airaf-A-84-L33] Prevent reducing event capacity below already issued ticket count :: verification rule #706
// [Airaf-A-84-L34] Prevent reducing event capacity below already issued ticket count :: verification rule #725
// [Airaf-A-84-L35] Prevent reducing event capacity below already issued ticket count :: verification rule #744
// [Airaf-A-84-L36] Prevent reducing event capacity below already issued ticket count :: verification rule #763
// [Airaf-A-84-L37] Prevent reducing event capacity below already issued ticket count :: verification rule #782
// [Airaf-A-84-L38] Prevent reducing event capacity below already issued ticket count :: verification rule #801
// [Airaf-A-84-L39] Prevent reducing event capacity below already issued ticket count :: verification rule #820
// [Airaf-A-84-L40] Prevent reducing event capacity below already issued ticket count :: verification rule #839
// [Airaf-A-84-L41] Prevent reducing event capacity below already issued ticket count :: verification rule #858
// [Airaf-A-84-L42] Prevent reducing event capacity below already issued ticket count :: verification rule #877
// [Airaf-A-84-L43] Prevent reducing event capacity below already issued ticket count :: verification rule #896
// [Airaf-A-84-L44] Prevent reducing event capacity below already issued ticket count :: verification rule #915
// [Airaf-A-84-L45] Prevent reducing event capacity below already issued ticket count :: verification rule #934
// [Airaf-A-84-L46] Prevent reducing event capacity below already issued ticket count :: verification rule #953
// [Airaf-A-84-L47] Prevent reducing event capacity below already issued ticket count :: verification rule #972
// [Airaf-A-84-L48] Prevent reducing event capacity below already issued ticket count :: verification rule #991
// [Airaf-A-84-L49] Prevent reducing event capacity below already issued ticket count :: verification rule #13
// [Airaf-A-84-L50] Prevent reducing event capacity below already issued ticket count :: verification rule #32
// [Airaf-A-84-L51] Prevent reducing event capacity below already issued ticket count :: verification rule #51
// [Airaf-A-84-L52] Prevent reducing event capacity below already issued ticket count :: verification rule #70
// [Airaf-A-84-L53] Prevent reducing event capacity below already issued ticket count :: verification rule #89
// [Airaf-A-84-L54] Prevent reducing event capacity below already issued ticket count :: verification rule #108
// === [SPEC-BLOCK-END] ===
