const express = require('express');
const authenticate = require('../middleware/authenticate');
const { buyTicket, getMyTickets, getEventTickets } = require('../controllers/ticketController');

const router = express.Router();

router.use(authenticate);

// View my own tickets
router.get('/my-tickets', getMyTickets);

// View attendees for a specific event (organizer/admin only)
router.get('/event/:eventId', getEventTickets);

// Buy a ticket for an event
router.post('/:eventId/buy', buyTicket);

module.exports = router;
