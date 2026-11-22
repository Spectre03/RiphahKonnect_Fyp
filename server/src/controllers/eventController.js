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
            select: {
              id: true,
              userId: true,
              status: true,
              code: true,
              rejectionReason: true,
              paymentSlipUrl: true,
              paymentRef: true,
              approvedAt: true,
            },
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
        myTicketSlipUrl: myTicket?.paymentSlipUrl || null,
        myTicketPaymentRef: myTicket?.paymentRef || null,
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
    if (!perm.allowed) return res.status(403).json({ error: 'Not authorized to edit this event.' });

    const event = perm.event;

    if (req.body.title !== undefined) {
      const titleCheck = checkTextContent(req.body.title, { minLength: 3, fieldName: 'Event title' });
      if (!titleCheck.clean) return res.status(400).json({ error: titleCheck.reason });
    }
    if (req.body.description !== undefined) {
      const descCheck = checkTextContent(req.body.description, { minLength: 10, fieldName: 'Event description' });
      if (!descCheck.clean) return res.status(400).json({ error: descCheck.reason });
    }
    if (req.body.location) {
      const locCheck = checkTextContent(req.body.location, { minLength: 2, fieldName: 'Event location' });
      if (!locCheck.clean) return res.status(400).json({ error: locCheck.reason });
    }
    if (req.body.imageUrl) {
      const imgCheck = checkImageSafety(req.body.imageUrl);
      if (!imgCheck.safe) return res.status(400).json({ error: imgCheck.reason });
    }
    if (req.body.paymentDetails) {
      const payCheck = checkTextContent(req.body.paymentDetails, { minLength: 4, fieldName: 'Payment account details' });
      if (!payCheck.clean) return res.status(400).json({ error: payCheck.reason });
    }

    const nextStart = req.body.startDate ? new Date(req.body.startDate) : event.startDate;
    const nextEnd =
      req.body.endDate === '' || req.body.endDate === null
        ? null
        : req.body.endDate
        ? new Date(req.body.endDate)
        : event.endDate;

    if (req.body.startDate) {
      if (Number.isNaN(nextStart.getTime())) {
        return res.status(400).json({ error: 'Invalid start date and time.' });
      }
      const nowMinusGrace = new Date(Date.now() - 2 * 60 * 1000);
      // Allow keeping the existing startDate if unchanged, otherwise require present/future
      const isSameAsOriginal = Math.abs(nextStart.getTime() - new Date(event.startDate).getTime()) < 60 * 1000;
      if (!isSameAsOriginal && nextStart < nowMinusGrace) {
        return res.status(400).json({ error: 'Event start date and time cannot be set in the past.' });
      }
    }
    if (nextEnd) {
      if (Number.isNaN(nextEnd.getTime())) {
        return res.status(400).json({ error: 'Invalid end date and time.' });
      }
      if (nextEnd < nextStart) {
        return res.status(400).json({ error: 'Event end date and time cannot be earlier than the start date.' });
      }
    }

    const nextPrice =
      req.body.price !== undefined
        ? req.body.price === '' || req.body.price === null
          ? 0
          : Math.max(0, parseFloat(req.body.price) || 0)
        : event.price;

    const nextCapacity =
      req.body.capacity !== undefined
        ? req.body.capacity === '' || req.body.capacity === null
          ? null
          : Math.max(1, parseInt(req.body.capacity, 10) || 1)
        : event.capacity;

    // Prevent reducing capacity below active ticket count
    if (nextCapacity !== null) {
      const activeTicketCount = await prisma.ticket.count({
        where: {
          eventId: event.id,
          status: { in: ['PENDING', 'VALID', 'USED'] },
        },
      });
      if (nextCapacity < activeTicketCount) {
        return res.status(400).json({
          error: `Seat capacity cannot be less than the ${activeTicketCount} tickets already reserved/issued.`,
        });
      }
    }

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title !== undefined ? req.body.title.trim() : event.title,
        description: req.body.description !== undefined ? req.body.description.trim() : event.description,
        location: req.body.location !== undefined ? (req.body.location ? req.body.location.trim() : null) : event.location,
        startDate: nextStart,
        endDate: nextEnd,
        price: nextPrice,
        capacity: nextCapacity,
        imageUrl: req.body.imageUrl !== undefined ? (req.body.imageUrl || null) : event.imageUrl,
        paymentDetails: req.body.paymentDetails !== undefined ? (req.body.paymentDetails ? req.body.paymentDetails.trim() : null) : event.paymentDetails,
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

    res.json({
      event: {
        ...updated,
        managers: (updated.managers || []).map((m) => m.user),
      },
    });
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
