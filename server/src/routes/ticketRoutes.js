const express = require('express');
const authenticate = require('../middleware/authenticate');
const {
  buyTicket,
  approveTicket,
  rejectTicket,
  verifyCheckIn,
  verifyTicketByCode,
  getMyTickets,
  getEventTickets,
} = require('../controllers/ticketController');

const router = express.Router();

router.use(authenticate);

// View my own tickets
router.get('/my-tickets', getMyTickets);

// View & manage tickets for a specific event (Creator, Assigned Event Managers, or Admin only)
router.get('/event/:eventId', getEventTickets);

// Verify a ticket on event day by entering/scanning its unique Ticket ID code
router.post('/event/:eventId/verify-code', verifyTicketByCode);

// Submit a ticket request with payment slip
router.post('/:eventId/buy', buyTicket);

// Event Manager actions: Approve payment slip (generates unique ID), Reject slip, or Check-in attendee on event day
router.patch('/:ticketId/approve', approveTicket);
router.patch('/:ticketId/reject', rejectTicket);
router.patch('/:ticketId/verify-checkin', verifyCheckIn);

module.exports = router;
