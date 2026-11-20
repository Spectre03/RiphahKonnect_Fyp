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
// Submits a ticket request with a required payment slip attachment (or free registration)
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

    // 3. Validate Payment Slip for paid events (and validate image if attached for free events)
    const isPaidEvent = (event.price || 0) > 0;
    if (isPaidEvent && !paymentSlipUrl) {
      return res.status(400).json({
        error: 'Please attach your payment receipt/slip image before submitting.',
      });
    }

    if (paymentSlipUrl) {
      const imgCheck = checkImageSafety(paymentSlipUrl);
      if (!imgCheck.safe) {
        return res.status(400).json({ error: imgCheck.reason || 'Invalid payment slip image.' });
      }
    }

    if (paymentRef) {
      const refCheck = checkTextContent(paymentRef, { minLength: 2, fieldName: 'Transaction Reference' });
      if (!refCheck.clean) {
        return res.status(400).json({ error: refCheck.reason });
      }
    }

    // 4. Check if user already has a ticket
    const existingTicket = await prisma.ticket.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });

    if (existingTicket && ['PENDING', 'VALID', 'USED'].includes(existingTicket.status)) {
      return res.status(409).json({
        error:
          existingTicket.status === 'PENDING'
            ? 'Your ticket request and payment slip are already awaiting verification by the Event Manager.'
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
    // Note: No unique ticket code is assigned until the Event Manager verifies the payment slip and approves!
    let ticket;
    if (existingTicket) {
      ticket = await prisma.ticket.update({
        where: { id: existingTicket.id },
        data: {
          code: null,
          pricePaid: event.price || 0,
          paymentSlipUrl: paymentSlipUrl || null,
          paymentRef: paymentRef ? paymentRef.trim() : null,
          status: 'PENDING',
          rejectionReason: null,
          approvedById: null,
          approvedAt: null,
          issuedAt: new Date(),
        },
        include: {
          event: { select: { id: true, title: true, startDate: true, location: true, imageUrl: true } },
        },
      });
    } else {
      ticket = await prisma.ticket.create({
        data: {
          code: null,
          pricePaid: event.price || 0,
          paymentSlipUrl: paymentSlipUrl || null,
          paymentRef: paymentRef ? paymentRef.trim() : null,
          status: 'PENDING',
          userId,
          eventId,
        },
        include: {
          event: { select: { id: true, title: true, startDate: true, location: true, imageUrl: true } },
        },
      });
    }

    // Notify Event Creator & Assigned Event Managers
    try {
      const managerUserIds = [
        ...new Set([
          event.createdById,
          ...(event.managers || []).map((m) => m.userId),
        ]),
      ].filter((uid) => uid && uid !== userId);

      const io = req.app.get('io');
      for (const managerId of managerUserIds) {
        const notif = await prisma.notification.create({
          data: {
            userId: managerId,
            title: `🧾 Payment Slip Submitted: "${event.title}"`,
            content: `${req.user.name} submitted a ticket request${paymentRef ? ` (Ref: ${paymentRef.trim()})` : ''}. Please review the payment slip and approve.`,
            type: 'EVENT',
            link: '/events',
          },
        });
        if (io) io.to(`user:${managerId}`).emit('notification', notif);
      }
    } catch {}

    res.status(201).json({
      ticket,
      message: 'Payment slip submitted! Your unique ticket ID will be generated once an Event Manager approves it.',
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
        event: true,
        user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true } },
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
        user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true } },
        event: { select: { id: true, title: true, startDate: true, location: true } },
      },
    });

    // Automatically mark attendee as GOING in EventRsvp upon approval
    await prisma.eventRsvp.upsert({
      where: { userId_eventId: { userId: ticket.userId, eventId: ticket.eventId } },
      update: { status: 'GOING' },
      create: { userId: ticket.userId, eventId: ticket.eventId, status: 'GOING' },
    }).catch(() => {});

    // Notify attendee with their private unique ticket ID
    try {
      const notif = await prisma.notification.create({
        data: {
          userId: ticket.userId,
          title: `🎟️ Ticket Approved for "${ticket.event.title}"!`,
          content: `Your payment slip was verified by ${req.user.name}. Your unique Ticket ID is ${uniqueCode}. View your QR pass in My Tickets.`,
          type: 'EVENT',
          link: '/my-tickets',
        },
      });
      const io = req.app.get('io');
      if (io) io.to(`user:${ticket.userId}`).emit('notification', notif);
    } catch {}

    res.json({
      ticket: updated,
      message: `Ticket approved! Unique ID ${uniqueCode} assigned to ${updated.user.name}.`,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/tickets/:ticketId/reject
// Event Manager rejects an invalid/unpaid payment slip
const rejectTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { reason } = req.body || {};

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: true,
        user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true } },
      },
    });
    if (!ticket) return res.status(404).json({ error: 'Ticket request not found.' });

    const perm = await canManageEvent(ticket.eventId, req.user);
    if (!perm.allowed) {
      return res.status(403).json({ error: 'Only the Event Creator, assigned Event Managers, or Admins can reject tickets.' });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'REJECTED',
        code: null,
        rejectionReason: reason ? reason.trim() : 'Payment slip could not be verified. Please re-upload a clear receipt.',
        approvedById: req.user.id,
        approvedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true } },
      },
    });

    try {
      const notif = await prisma.notification.create({
        data: {
          userId: ticket.userId,
          title: `⚠️ Ticket Payment Slip Not Verified: "${ticket.event.title}"`,
          content: `Reason: ${updated.rejectionReason}`,
          type: 'EVENT',
          link: '/events',
        },
      });
      const io = req.app.get('io');
      if (io) io.to(`user:${ticket.userId}`).emit('notification', notif);
    } catch {}

    res.json({
      ticket: updated,
      message: 'Ticket request rejected and user notified.',
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
        user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true } },
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
        user: { select: { id: true, name: true, email: true, department: true, semester: true, avatarUrl: true } },
      },
    });

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
          select: { id: true, title: true, startDate: true, endDate: true, location: true, imageUrl: true, price: true },
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

    res.json({
      tickets,
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

// === [SPEC-BLOCK-START] Airaf-A-89 (2026-11-20T18:30:27+05:00) ===
// [Airaf-A-89-L1] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #842
// [Airaf-A-89-L2] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #861
// [Airaf-A-89-L3] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #880
// [Airaf-A-89-L4] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #899
// [Airaf-A-89-L5] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #918
// [Airaf-A-89-L6] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #937
// [Airaf-A-89-L7] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #956
// [Airaf-A-89-L8] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #975
// [Airaf-A-89-L9] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #994
// [Airaf-A-89-L10] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #16
// [Airaf-A-89-L11] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #35
// [Airaf-A-89-L12] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #54
// [Airaf-A-89-L13] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #73
// [Airaf-A-89-L14] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #92
// [Airaf-A-89-L15] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #111
// [Airaf-A-89-L16] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #130
// [Airaf-A-89-L17] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #149
// [Airaf-A-89-L18] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #168
// [Airaf-A-89-L19] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #187
// [Airaf-A-89-L20] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #206
// [Airaf-A-89-L21] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #225
// [Airaf-A-89-L22] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #244
// [Airaf-A-89-L23] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #263
// [Airaf-A-89-L24] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #282
// [Airaf-A-89-L25] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #301
// [Airaf-A-89-L26] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #320
// [Airaf-A-89-L27] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #339
// [Airaf-A-89-L28] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #358
// [Airaf-A-89-L29] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #377
// [Airaf-A-89-L30] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #396
// [Airaf-A-89-L31] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #415
// [Airaf-A-89-L32] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #434
// [Airaf-A-89-L33] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #453
// [Airaf-A-89-L34] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #472
// [Airaf-A-89-L35] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #491
// [Airaf-A-89-L36] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #510
// [Airaf-A-89-L37] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #529
// [Airaf-A-89-L38] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #548
// [Airaf-A-89-L39] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #567
// [Airaf-A-89-L40] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #586
// [Airaf-A-89-L41] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #605
// [Airaf-A-89-L42] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #624
// [Airaf-A-89-L43] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #643
// [Airaf-A-89-L44] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #662
// [Airaf-A-89-L45] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #681
// [Airaf-A-89-L46] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #700
// [Airaf-A-89-L47] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #719
// [Airaf-A-89-L48] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #738
// [Airaf-A-89-L49] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #757
// [Airaf-A-89-L50] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #776
// [Airaf-A-89-L51] Support re-approving rejected slips and revoking un-used valid tickets :: verification rule #795
// === [SPEC-BLOCK-END] ===
