const crypto = require('crypto');
const prisma = require('../config/db');
const { checkTextContent, checkImageSafety } = require('../utils/moderation');
const { canManageEvent } = require('./eventController');

// Cryptographically random unique ticket code: RK-XXXX-XXXX (e.g., RK-7F9A-3K2M)
const generateUniqueTicketCode = async () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes ambiguous 0, O, 1, I
  while (true) {
    const bytes = crypto.randomBytes(8);
    let part1 = '';
    let part2 = '';
    for (let i = 0; i < 4; i++) part1 += chars[bytes[i] % chars.length];
    for (let i = 4; i < 8; i++) part2 += chars[bytes[i] % chars.length];
    const code = `RK-${part1}-${part2}`;
    const existing = await prisma.ticket.findUnique({ where: { code } });
    if (!existing) return code;
  }
};

// POST /api/tickets/:eventId/buy
// Submits a ticket request with a required payment slip attachment
const buyTicket = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const { paymentSlipUrl, paymentRef } = req.body || {};

    // 1. Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        managers: true,
        tickets: { select: { id: true, status: true, userId: true } },
      },
    });

    if (!event) return res.status(404).json({ error: 'Event not found.' });

    // 2. Check if event is in the past
    if (new Date(event.startDate) < new Date()) {
      return res.status(400).json({ error: 'Cannot request tickets for past events.' });
    }

    // 3. Always require a valid payment/registration slip attachment
    if (!paymentSlipUrl) {
      return res.status(400).json({
        error: 'Please attach your payment receipt or registration slip image before submitting.',
      });
    }

    const imgCheck = checkImageSafety(paymentSlipUrl);
    if (!imgCheck.safe) {
      return res.status(400).json({ error: imgCheck.reason || 'Invalid payment slip image.' });
    }

    if (paymentRef) {
      const refCheck = checkTextContent(paymentRef, { minLength: 2, fieldName: 'Transaction Reference' });
      if (!refCheck.clean) {
        return res.status(400).json({ error: refCheck.reason });
      }
    }

    // 4. Check if user already has an active ticket
    const existingTicket = await prisma.ticket.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });

    if (existingTicket && ['PENDING', 'VALID', 'USED'].includes(existingTicket.status)) {
      return res.status(409).json({
        error:
          existingTicket.status === 'PENDING'
            ? 'Your payment slip is already awaiting verification by the Event Manager.'
            : 'You already have an approved ticket for this event.',
      });
    }

    // 5. Check capacity limit against active (PENDING, VALID, USED) tickets
    const activeTicketCount = (event.tickets || []).filter((t) =>
      ['PENDING', 'VALID', 'USED'].includes(t.status)
    ).length;
    if (event.capacity && activeTicketCount >= event.capacity) {
      return res.status(400).json({ error: 'Sorry, this event has reached its maximum seat capacity.' });
    }

    // 6. Create or re-submit (if previously REJECTED/CANCELLED) ticket in PENDING status
    // No unique ticket code is assigned until the Event Manager verifies the payment slip and approves!
    let ticket;
    if (existingTicket) {
      ticket = await prisma.ticket.update({
        where: { id: existingTicket.id },
        data: {
          code: null,
          pricePaid: event.price || 0,
          paymentSlipUrl,
          paymentRef: paymentRef ? paymentRef.trim() : null,
          status: 'PENDING',
          rejectionReason: null,
          approvedById: null,
          approvedAt: null,
          issuedAt: new Date(),
        },
        include: {
          user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true, role: true } },
          event: { select: { id: true, title: true, startDate: true, endDate: true, location: true, imageUrl: true, price: true, paymentDetails: true } },
        },
      });
    } else {
      ticket = await prisma.ticket.create({
        data: {
          code: null,
          pricePaid: event.price || 0,
          paymentSlipUrl,
          paymentRef: paymentRef ? paymentRef.trim() : null,
          status: 'PENDING',
          userId,
          eventId,
        },
        include: {
          user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true, role: true } },
          event: { select: { id: true, title: true, startDate: true, endDate: true, location: true, imageUrl: true, price: true, paymentDetails: true } },
        },
      });
    }

    // Notify Event Creator & Assigned Event Managers + emit real-time socket update
    const io = req.app.get('io');
    try {
      const managerUserIds = [
        ...new Set([
          event.createdById,
          ...(event.managers || []).map((m) => m.userId),
        ]),
      ].filter((uid) => uid && uid !== userId);

      for (const managerId of managerUserIds) {
        const notif = await prisma.notification.create({
          data: {
            userId: managerId,
            title: `🧾 Payment Slip Submitted: "${event.title}"`,
            content: `${req.user.name} attached a payment slip${paymentRef ? ` (Ref: ${paymentRef.trim()})` : ''}. Please review and approve.`,
            type: 'EVENT',
            link: '/events',
          },
        });
        if (io) {
          io.to(`user:${managerId}`).emit('notification', notif);
          io.to(`user:${managerId}`).emit('ticketUpdated', {
            action: 'SUBMITTED',
            eventId: event.id,
            ticket,
          });
        }
      }
      if (io) {
        io.to(`user:${userId}`).emit('ticketUpdated', {
          action: 'SUBMITTED',
          eventId: event.id,
          ticket,
        });
      }
    } catch {}

    res.status(201).json({
      ticket,
      message: 'Payment slip submitted! Your unique Ticket ID will be generated once the Event Manager verifies and approves your slip.',
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/tickets/:ticketId/approve
// Event Manager verifies payment slip, approves the ticket, and generates the unique ticket ID
const approveTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: { include: { managers: true } },
        user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true, role: true } },
      },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket request not found.' });

    // Check manager authorization
    const perm = await canManageEvent(ticket.eventId, req.user);
    if (!perm.allowed) {
      return res.status(403).json({ error: 'Only the Event Creator, assigned Event Managers, or Admins can approve tickets.' });
    }

    if (ticket.status === 'VALID' || ticket.status === 'USED') {
      return res.status(400).json({ error: 'This ticket has already been approved.' });
    }

    // Ensure payment slip is attached before approving
    if (!ticket.paymentSlipUrl) {
      return res.status(400).json({ error: 'Cannot approve a ticket without an attached payment slip.' });
    }

    // Capacity check when approving a previously REJECTED ticket
    if (ticket.status === 'REJECTED' && ticket.event.capacity) {
      const activeCount = await prisma.ticket.count({
        where: {
          eventId: ticket.eventId,
          status: { in: ['PENDING', 'VALID', 'USED'] },
        },
      });
      if (activeCount >= ticket.event.capacity) {
        return res.status(400).json({ error: 'Cannot approve: event has reached its maximum seat capacity.' });
      }
    }

    // Generate cryptographically unique ticket ID known only to the attendee and Event Managers
    const uniqueCode = ticket.code || (await generateUniqueTicketCode());

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        code: uniqueCode,
        status: 'VALID',
        approvedById: req.user.id,
        approvedAt: new Date(),
        rejectionReason: null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true, role: true } },
        event: { select: { id: true, title: true, startDate: true, endDate: true, location: true, imageUrl: true, price: true, paymentDetails: true } },
      },
    });

    // Automatically mark attendee as GOING in EventRsvp upon approval
    await prisma.eventRsvp.upsert({
      where: { userId_eventId: { userId: ticket.userId, eventId: ticket.eventId } },
      update: { status: 'GOING' },
      create: { userId: ticket.userId, eventId: ticket.eventId, status: 'GOING' },
    }).catch(() => {});

    // Notify attendee with their private unique ticket ID & emit real-time ticketUpdated event
    const io = req.app.get('io');
    try {
      const notif = await prisma.notification.create({
        data: {
          userId: ticket.userId,
          title: `🎟️ Ticket Approved for "${ticket.event.title}"!`,
          content: `Your payment slip was verified by ${req.user.name}. Your Unique Ticket ID is ${uniqueCode}. View your QR pass in My Tickets.`,
          type: 'EVENT',
          link: '/my-tickets',
        },
      });
      if (io) {
        io.to(`user:${ticket.userId}`).emit('notification', notif);
        io.to(`user:${ticket.userId}`).emit('ticketUpdated', {
          action: 'APPROVED',
          eventId: ticket.eventId,
          ticket: updated,
        });
      }
    } catch {}

    res.json({
      ticket: updated,
      message: `Slip verified & approved! Unique Ticket ID ${uniqueCode} issued to ${updated.user.name}.`,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/tickets/:ticketId/reject
// Event Manager rejects an invalid/unpaid payment slip (or revokes an approval if slip was invalid)
const rejectTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { reason } = req.body || {};

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: true,
        user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true, role: true } },
      },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket request not found.' });

    const perm = await canManageEvent(ticket.eventId, req.user);
    if (!perm.allowed) {
      return res.status(403).json({ error: 'Only the Event Creator, assigned Event Managers, or Admins can reject tickets.' });
    }

    if (ticket.status === 'USED') {
      return res.status(400).json({ error: 'Cannot reject a ticket that has already been checked in at the venue.' });
    }

    const cleanReason =
      reason && reason.trim()
        ? reason.trim()
        : 'Payment slip could not be verified. Please re-upload a clear payment receipt.';

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'REJECTED',
        code: null,
        rejectionReason: cleanReason,
        approvedById: req.user.id,
        approvedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true, role: true } },
        event: { select: { id: true, title: true, startDate: true, endDate: true, location: true, imageUrl: true, price: true, paymentDetails: true } },
      },
    });

    const io = req.app.get('io');
    try {
      const notif = await prisma.notification.create({
        data: {
          userId: ticket.userId,
          title: `⚠️ Payment Slip Not Verified: "${ticket.event.title}"`,
          content: `Reason: ${updated.rejectionReason}`,
          type: 'EVENT',
          link: '/my-tickets',
        },
      });
      if (io) {
        io.to(`user:${ticket.userId}`).emit('notification', notif);
        io.to(`user:${ticket.userId}`).emit('ticketUpdated', {
          action: 'REJECTED',
          eventId: ticket.eventId,
          ticket: updated,
        });
      }
    } catch {}

    res.json({
      ticket: updated,
      message: 'Payment slip rejected and user notified with reason.',
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/tickets/:ticketId/verify-checkin
// Event-day check-in verification: Event Manager verifies the attendee's identity & unique ticket ID
const verifyCheckIn = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: true,
        user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true, role: true } },
      },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

    const perm = await canManageEvent(ticket.eventId, req.user);
    if (!perm.allowed) {
      return res.status(403).json({ error: 'Not authorized to verify tickets for this event.' });
    }

    if (ticket.status === 'USED') {
      return res.status(400).json({ error: `Ticket ${ticket.code} has ALREADY been checked in at ${new Date(ticket.usedAt).toLocaleTimeString()}!` });
    }

    if (ticket.status !== 'VALID' || !ticket.code) {
      return res.status(400).json({ error: 'Only approved (VALID) tickets with a unique ID can be checked in.' });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'USED',
        usedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true, role: true } },
        event: { select: { id: true, title: true, startDate: true, endDate: true, location: true, imageUrl: true, price: true, paymentDetails: true } },
      },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${ticket.userId}`).emit('ticketUpdated', {
        action: 'CHECKED_IN',
        eventId: ticket.eventId,
        ticket: updated,
      });
    }

    res.json({
      ticket: updated,
      message: `Verified & Checked In: ${updated.user.name} (${updated.code})`,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/tickets/event/:eventId/verify-code
// Lookup and verify an attendee on event day by typing/scanning their unique Ticket ID (e.g., RK-XXXX-XXXX)
const verifyTicketByCode = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { code, markUsed } = req.body || {};

    if (!code || !code.trim()) {
      return res.status(400).json({ error: 'Please enter a Ticket ID code to verify.' });
    }

    const perm = await canManageEvent(eventId, req.user);
    if (!perm.event) return res.status(404).json({ error: 'Event not found.' });
    if (!perm.allowed) {
      return res.status(403).json({ error: 'Not authorized to verify tickets for this event.' });
    }

    const normalizedCode = code.trim().toUpperCase();
    const ticket = await prisma.ticket.findFirst({
      where: {
        eventId,
        code: normalizedCode,
      },
      include: {
        user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true, role: true } },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        valid: false,
        error: `No ticket matching "${normalizedCode}" was found for this event.`,
      });
    }

    if (markUsed && ticket.status === 'VALID') {
      const checkedIn = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'USED', usedAt: new Date() },
        include: {
          user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true, role: true } },
        },
      });
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${ticket.userId}`).emit('ticketUpdated', {
          action: 'CHECKED_IN',
          eventId,
          ticket: checkedIn,
        });
      }
      return res.json({
        valid: true,
        ticket: checkedIn,
        message: `Checked In: ${checkedIn.user.name} (${checkedIn.code})`,
      });
    }

    res.json({
      valid: ticket.status === 'VALID' || ticket.status === 'USED',
      ticket,
      message:
        ticket.status === 'VALID'
          ? `Authentic Ticket Verified for ${ticket.user.name} (${ticket.user.email})`
          : ticket.status === 'USED'
          ? `Ticket belongs to ${ticket.user.name} — Already Checked In at ${new Date(ticket.usedAt).toLocaleString()}`
          : `Ticket status is ${ticket.status}`,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/tickets/my-tickets
// Only returns the authenticated user's own tickets (unique code is only present when status is VALID or USED)
const getMyTickets = async (req, res, next) => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { userId: req.user.id },
      orderBy: { issuedAt: 'desc' },
      include: {
        event: {
          select: { id: true, title: true, startDate: true, endDate: true, location: true, imageUrl: true, price: true, paymentDetails: true },
        },
      },
    });

    // Security check: never expose a code if status is not VALID or USED
    const safeTickets = tickets.map((t) => ({
      ...t,
      code: ['VALID', 'USED'].includes(t.status) ? t.code : null,
    }));

    res.json({ tickets: safeTickets });
  } catch (err) {
    next(err);
  }
};

// GET /api/tickets/event/:eventId (For Event Creator, Assigned Event Managers, and Admins ONLY)
const getEventTickets = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const perm = await canManageEvent(eventId, req.user);
    if (!perm.event) return res.status(404).json({ error: 'Event not found.' });
    if (!perm.allowed) {
      return res.status(403).json({ error: 'Not authorized to view or manage tickets for this event.' });
    }

    const tickets = await prisma.ticket.findMany({
      where: { eventId },
      orderBy: { issuedAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true, role: true } },
      },
    });

    // Also resolve approver names for audit transparency
    const approverIds = [...new Set(tickets.map((t) => t.approvedById).filter(Boolean))];
    let approverMap = {};
    if (approverIds.length > 0) {
      const approvers = await prisma.user.findMany({
        where: { id: { in: approverIds } },
        select: { id: true, name: true, role: true },
      });
      approvers.forEach((a) => {
        approverMap[a.id] = a;
      });
    }

    const enrichedTickets = tickets.map((t) => ({
      ...t,
      approvedBy: t.approvedById ? approverMap[t.approvedById] || null : null,
    }));

    res.json({
      tickets: enrichedTickets,
      managers: perm.event.managers.map((m) => m.user),
      isCreator: perm.isCreator,
      isAdmin: perm.isAdmin,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  buyTicket,
  approveTicket,
  rejectTicket,
  verifyCheckIn,
  verifyTicketByCode,
  getMyTickets,
  getEventTickets,
};

// === [SPEC-BLOCK-START] Airaf-A-97 (2026-11-24T18:15:09+05:00) ===
// [Airaf-A-97-L1] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #682
// [Airaf-A-97-L2] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #701
// [Airaf-A-97-L3] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #720
// [Airaf-A-97-L4] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #739
// [Airaf-A-97-L5] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #758
// [Airaf-A-97-L6] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #777
// [Airaf-A-97-L7] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #796
// [Airaf-A-97-L8] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #815
// [Airaf-A-97-L9] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #834
// [Airaf-A-97-L10] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #853
// [Airaf-A-97-L11] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #872
// [Airaf-A-97-L12] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #891
// [Airaf-A-97-L13] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #910
// [Airaf-A-97-L14] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #929
// [Airaf-A-97-L15] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #948
// [Airaf-A-97-L16] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #967
// [Airaf-A-97-L17] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #986
// [Airaf-A-97-L18] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #8
// [Airaf-A-97-L19] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #27
// [Airaf-A-97-L20] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #46
// [Airaf-A-97-L21] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #65
// [Airaf-A-97-L22] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #84
// [Airaf-A-97-L23] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #103
// [Airaf-A-97-L24] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #122
// [Airaf-A-97-L25] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #141
// [Airaf-A-97-L26] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #160
// [Airaf-A-97-L27] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #179
// [Airaf-A-97-L28] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #198
// [Airaf-A-97-L29] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #217
// [Airaf-A-97-L30] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #236
// [Airaf-A-97-L31] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #255
// [Airaf-A-97-L32] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #274
// [Airaf-A-97-L33] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #293
// [Airaf-A-97-L34] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #312
// [Airaf-A-97-L35] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #331
// [Airaf-A-97-L36] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #350
// [Airaf-A-97-L37] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #369
// [Airaf-A-97-L38] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #388
// [Airaf-A-97-L39] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #407
// [Airaf-A-97-L40] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #426
// [Airaf-A-97-L41] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #445
// [Airaf-A-97-L42] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #464
// [Airaf-A-97-L43] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #483
// [Airaf-A-97-L44] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #502
// [Airaf-A-97-L45] Extract RK-XXXX-XXXX code automatically from scanned QR pass text :: verification rule #521
// === [SPEC-BLOCK-END] ===
