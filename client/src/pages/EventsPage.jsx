import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { eventsAPI, ticketsAPI, usersAPI } from '../services/api';
import socket from '../services/socket';
import { formatDate } from '../utils/brand';
import { cn } from '../utils/cn';
import { checkTextContent, validateImageFile, fileToDataUrl } from '../utils/moderation';
import { Card, Button, Badge, Modal, Avatar } from '../components/ui';
import toast from 'react-hot-toast';
import {
  MapPin, Clock, Users, Plus, Loader2,
  Check, Star, XCircle, CalendarDays, Trash2, Sparkles,
  Image as ImageIcon, X, AlertTriangle, Ticket as TicketIcon,
  ShieldCheck, Upload, Eye, CheckCircle2, UserPlus, Search, KeyRound, Edit3,
} from 'lucide-react';

const CAN_CREATE  = ['TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'];
const CAN_DEL_ANY = ['COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'];

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [rsvpLoadingId, setRsvpLoadingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Payment Slip Upload Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Event Manager Control Center Modal State
  const [managingEvent, setManagingEvent] = useState(null);

  // Edit Event Modal State
  const [editingEvent, setEditingEvent] = useState(null);

  // View Own Attached Slip Modal State
  const [viewingOwnSlipEvent, setViewingOwnSlipEvent] = useState(null);

  const fetchEvents = async (p = 1) => {
    try {
      setLoading(true);
      const res = await eventsAPI.getAll(p, filter === 'upcoming');
      setEvents(p === 1 ? res.data.events : [...events, ...res.data.events]);
      setPagination(res.data.pagination);
      setPage(p);
    } catch {
      toast.error('Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(1); }, [filter]);

  // Real-time Socket sync for ticket slip submissions, approvals, rejections, and check-ins
  useEffect(() => {
    const handleTicketUpdated = () => {
      fetchEvents(page);
    };
    socket.on('ticketUpdated', handleTicketUpdated);
    return () => {
      socket.off('ticketUpdated', handleTicketUpdated);
    };
  }, [page, filter]);

  const handleRsvp = async (eventId, status) => {
    if (rsvpLoadingId === eventId) return;
    try {
      setRsvpLoadingId(eventId);
      const res = await eventsAPI.rsvp(eventId, status);
      const data = res.data || {};

      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== eventId) return e;
          const prevStatus = e.myRsvp;
          const nextStatus =
            data.myRsvp !== undefined
              ? data.myRsvp
              : status === 'REMOVE' || prevStatus === status
              ? null
              : status;

          let nextGoing = e.attendeeCount || 0;
          if (typeof data.attendeeCount === 'number') {
            nextGoing = data.attendeeCount;
          } else {
            if (prevStatus === 'GOING' && nextStatus !== 'GOING') nextGoing = Math.max(0, nextGoing - 1);
            if (prevStatus !== 'GOING' && nextStatus === 'GOING') nextGoing += 1;
          }

          let nextInterested = e.interestedCount || 0;
          if (typeof data.interestedCount === 'number') {
            nextInterested = data.interestedCount;
          } else {
            if (prevStatus === 'INTERESTED' && nextStatus !== 'INTERESTED') nextInterested = Math.max(0, nextInterested - 1);
            if (prevStatus !== 'INTERESTED' && nextStatus === 'INTERESTED') nextInterested += 1;
          }

          return {
            ...e,
            myRsvp: nextStatus,
            attendeeCount: nextGoing,
            interestedCount: nextInterested,
          };
        })
      );

      if (status === 'GOING') toast.success("You're marked as Going!");
      else if (status === 'INTERESTED') toast.success('Marked as Interested (Maybe).');
      else if (status === 'NOT_GOING') toast.success("Marked as Can't Go.");
      else toast.success('RSVP removed.');
    } catch {
      toast.error('Failed to update RSVP.');
    } finally {
      setRsvpLoadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await eventsAPI.delete(deleteTarget.id);
      setEvents(events.filter((e) => e.id !== deleteTarget.id));
      toast.success('Event deleted.');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreated = (event) => {
    setEvents([event, ...events]);
    setShowCreate(false);
    toast.success('Event created!');
  };

  const handleUpdated = (updatedEvent) => {
    setEvents((prev) =>
      prev.map((ev) => (ev.id === updatedEvent.id ? { ...ev, ...updatedEvent } : ev))
    );
    setEditingEvent(null);
    toast.success('Event updated successfully!');
  };

  const handleTicketSubmitted = (eventId, submittedTicket) => {
    setEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        const wasAlreadyActive = ['PENDING', 'VALID', 'USED'].includes(ev.myTicketStatus);
        return {
          ...ev,
          ticketCount: wasAlreadyActive ? ev.ticketCount || 1 : (ev.ticketCount || 0) + 1,
          pendingTicketCount:
            ev.myTicketStatus === 'PENDING'
              ? ev.pendingTicketCount || 1
              : (ev.pendingTicketCount || 0) + 1,
          hasTicket: true,
          myTicketStatus: 'PENDING',
          myTicketCode: null,
          myTicketRejectionReason: null,
          myTicketSlipUrl: submittedTicket?.paymentSlipUrl || ev.myTicketSlipUrl || null,
          myTicketPaymentRef: submittedTicket?.paymentRef || ev.myTicketPaymentRef || null,
        };
      })
    );
    setSelectedEvent(null);
  };

  const canCreate = CAN_CREATE.includes(user?.role);
  const canDelAny = CAN_DEL_ANY.includes(user?.role);

  return (
    <div className="page-wrapper">
      {/* ── Gradient Banner ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c1a4a 0%, #1a2b6b 100%)' }}>
        <div className="absolute inset-0 banner-grid pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(201,151,58,0.08) 0%, transparent 70%)' }} />
          <div className="absolute -left-16 bottom-0 w-64 h-64 rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(26,43,107,0.5) 0%, transparent 70%)' }} />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest block mb-2" style={{ color: '#c9973a' }}>Campus Life</span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Campus Events</h1>
              <p className="text-slate-400 text-sm mt-2">
                {canCreate
                  ? 'Create events, assign Event Managers, verify payment slips & approve unique Ticket IDs'
                  : 'Discover events, attach payment slips & receive your verified unique Ticket ID'}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {pagination && (
                <div className="hidden sm:flex items-center gap-2 backdrop-blur-sm border rounded-2xl px-4 py-3 animate-popIn" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  <CalendarDays className="h-5 w-5" style={{ color: '#c9973a' }} />
                  <div>
                    <span className="text-2xl font-extrabold text-white leading-none">{pagination.total}</span>
                    <p className="text-[11px] font-medium" style={{ color: '#c9973a' }}>Events</p>
                  </div>
                </div>
              )}
              {canCreate && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-all cursor-pointer"
                  style={{ background: 'rgba(201,151,58,0.15)' }}
                >
                  <Plus size={14} /> Create Event
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Filter Tabs ── */}
        <div className="flex gap-1 mb-6 bg-white rounded-2xl border border-slate-900/[0.06] p-1 max-w-xs shadow-sm">
          {['upcoming', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all',
                filter === f ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )}
              style={filter === f ? { background: 'linear-gradient(135deg, #1a2b6b, #2251b8)' } : {}}
            >
              {f === 'upcoming' ? 'Upcoming' : 'All Events'}
            </button>
          ))}
        </div>

        {/* ── Events List ── */}
        {loading && page === 1 ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} padding="p-0">
                <div className="flex">
                  <div className="skeleton w-20 rounded-l-2xl" style={{ minHeight: 100 }} />
                  <div className="flex-1 p-4 space-y-2">
                    <div className="skeleton h-4 w-2/3 rounded" />
                    <div className="skeleton h-3 w-full rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card className="text-center py-16">
            <div className="h-14 w-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <CalendarDays size={24} className="text-violet-300" />
            </div>
            <p className="text-base font-bold text-slate-800">No events found</p>
            <p className="text-sm text-slate-400 mt-1">
              {canCreate ? 'Create the first event.' : 'Check back later for upcoming events.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4 stagger">
            {events.map((event) => {
              const d = new Date(event.startDate);
              const upcoming = d > new Date();
              const isCreator = event.createdBy?.id === user?.id || event.isCreator;
              const isManager = Boolean(event.isManager || isCreator || canDelAny);
              const showDelete = isCreator || canDelAny;
              const isSoldOut = event.capacity && (event.ticketCount || 0) >= event.capacity;

              return (
                <Card key={event.id} hover padding="p-0" className="overflow-hidden">
                  {/* Event Banner Picture if uploaded */}
                  {event.imageUrl && (
                    <div className="w-full max-h-64 overflow-hidden bg-slate-100 border-b border-slate-100">
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full max-h-64 object-cover"
                      />
                    </div>
                  )}
                  <div className="flex">
                    {/* Date Column */}
                    <div className={cn(
                      'flex-shrink-0 w-20 flex flex-col items-center justify-center border-r border-slate-100',
                      !event.imageUrl && 'rounded-l-2xl',
                      upcoming
                        ? 'bg-gradient-to-b from-violet-500 to-indigo-600'
                        : 'bg-gradient-to-b from-slate-100 to-slate-200'
                    )}>
                      <span className={cn('text-[9px] font-bold uppercase tracking-widest', upcoming ? 'text-violet-200' : 'text-slate-400')}>
                        {d.toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className={cn('text-3xl font-extrabold leading-none', upcoming ? 'text-white' : 'text-slate-500')}>
                        {d.getDate()}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-sm font-bold text-slate-900 truncate">{event.title}</h3>
                            {!upcoming && <Badge variant="slate" size="xs">Past</Badge>}
                            {event.price > 0 ? (
                              <Badge variant="amber" size="xs">Rs. {event.price}</Badge>
                            ) : (
                              <Badge variant="teal" size="xs">Free Entry</Badge>
                            )}
                            {isManager && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <ShieldCheck size={10} /> {isCreator ? 'Event Creator' : 'Event Manager'}
                              </span>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-xs text-slate-500 leading-relaxed mb-2 whitespace-pre-wrap">{event.description}</p>
                          )}

                          {/* Assigned Event Managers Display */}
                          {event.managers?.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mb-2 text-[11px] text-slate-500">
                              <span className="font-bold text-slate-600">Event Managers:</span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                                {event.createdBy?.name} (Lead)
                              </span>
                              {event.managers.map((m) => (
                                <span key={m.id} className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                                  {m.name} ({m.role === 'STUDENT' ? 'Student Faculty' : m.role})
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock size={11} className="flex-shrink-0" />
                              {formatDate(event.startDate, true)}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin size={11} className="flex-shrink-0" />
                                {event.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1 font-semibold text-emerald-600">
                              <Users size={11} className="flex-shrink-0" />
                              {event.attendeeCount || 0} going
                              {event.interestedCount > 0 ? ` • ${event.interestedCount} maybe` : ''}
                            </span>
                            {event.capacity && (
                              <span className="flex items-center gap-1 font-bold text-violet-600">
                                <TicketIcon size={11} className="flex-shrink-0" />
                                {event.ticketCount || 0} / {event.capacity} seats reserved
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isManager && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingEvent(event)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer transition-all"
                                title="Edit event details"
                              >
                                <Edit3 size={12} />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setManagingEvent(event)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white shadow-sm cursor-pointer transition-all"
                                style={{ background: 'linear-gradient(135deg, #1a2b6b, #2251b8)' }}
                              >
                                <ShieldCheck size={13} />
                                Manage Tickets
                                {event.pendingTicketCount > 0 && (
                                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-400 text-[#0c1a4a] text-[10px] font-extrabold">
                                    {event.pendingTicketCount}
                                  </span>
                                )}
                              </button>
                            </>
                          )}
                          {showDelete && (
                            <button
                              onClick={() => setDeleteTarget(event)}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-all flex-shrink-0"
                              title="Delete event"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Rejected Ticket Notice */}
                      {event.myTicketStatus === 'REJECTED' && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold">Payment Slip Rejected: </span>
                            <span>{event.myTicketRejectionReason || 'Please upload a valid payment receipt.'}</span>
                          </div>
                          {upcoming && !isSoldOut && (
                            <button
                              type="button"
                              onClick={() => setSelectedEvent(event)}
                              className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold text-[11px] flex-shrink-0 cursor-pointer hover:bg-red-700"
                            >
                              Re-Upload Slip
                            </button>
                          )}
                        </div>
                      )}

                      {/* RSVP & Ticket Action */}
                      {user && (
                        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-50 flex-wrap">
                          {upcoming ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] text-slate-400 font-bold">RSVP:</span>
                              {[
                                { status: 'GOING',      icon: Check,   label: `Going (${event.attendeeCount || 0})`,   active: 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/30' },
                                { status: 'INTERESTED', icon: Star,    label: 'Maybe',   active: 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/30' },
                                { status: 'NOT_GOING',  icon: XCircle, label: "Can't go", active: 'bg-slate-600 text-white border-slate-600' },
                              ].map(({ status, icon: Icon, label, active }) => {
                                const isActive = event.myRsvp === status;
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    disabled={rsvpLoadingId === event.id}
                                    onClick={() => handleRsvp(event.id, isActive ? 'REMOVE' : status)}
                                    className={cn(
                                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-all border disabled:opacity-50',
                                      isActive ? active : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300'
                                    )}
                                  >
                                    <Icon size={11} /> {label}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-semibold italic">
                              This event has already taken place ({event.attendeeCount || 0} attended).
                            </span>
                          )}

                          {upcoming && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {event.myTicketStatus === 'PENDING' ? (
                                <>
                                  <Badge variant="amber" size="sm" className="py-1.5 px-3">
                                    <Clock size={12} className="mr-1 inline" /> Slip Pending Manager Approval
                                  </Badge>
                                  {event.myTicketSlipUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setViewingOwnSlipEvent(event)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer transition-all"
                                    >
                                      <Eye size={12} /> View My Slip
                                    </button>
                                  )}
                                </>
                              ) : event.myTicketStatus === 'VALID' || event.myTicketStatus === 'USED' ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="green" size="sm" className="py-1.5 px-3">
                                    <CheckCircle2 size={12} className="mr-1 inline" />
                                    Approved ID: <span className="font-mono font-extrabold ml-1">{event.myTicketCode}</span>
                                  </Badge>
                                  {event.myTicketSlipUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setViewingOwnSlipEvent(event)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer transition-all"
                                    >
                                      <Eye size={12} /> Slip
                                    </button>
                                  )}
                                </div>
                              ) : isSoldOut ? (
                                <Button variant="secondary" size="sm" disabled>Sold Out</Button>
                              ) : (
                                <Button
                                  onClick={() => setSelectedEvent(event)}
                                  size="sm"
                                  icon={TicketIcon}
                                >
                                  {event.price > 0 ? `Buy Ticket (Rs. ${event.price})` : 'Request Event Ticket'}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}

            {pagination && page < pagination.totalPages && (
              <div className="flex justify-center pt-2">
                <Button variant="secondary" onClick={() => fetchEvents(page + 1)} loading={loading}>
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}

        {canCreate && (
          <CreateEventModal
            open={showCreate}
            onClose={() => setShowCreate(false)}
            onCreated={handleCreated}
          />
        )}

        {/* Edit Event Modal */}
        {editingEvent && (
          <EditEventModal
            event={editingEvent}
            onClose={() => setEditingEvent(null)}
            onUpdated={handleUpdated}
          />
        )}

        {/* Delete Event Confirmation Modal */}
        <Modal
          open={Boolean(deleteTarget)}
          onClose={() => !deleting && setDeleteTarget(null)}
          title="Delete Event"
          subtitle="This action cannot be undone"
          icon={AlertTriangle}
          iconColor="bg-red-500"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <span className="font-bold text-slate-900">&ldquo;{deleteTarget?.title}&rdquo;</span>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDelete} loading={deleting} icon={Trash2}>
                Delete Event
              </Button>
            </div>
          </div>
        </Modal>

        {/* Payment Slip Attachment & Ticket Request Modal */}
        {selectedEvent && (
          <TicketRequestModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onSubmitted={(ticket) => handleTicketSubmitted(selectedEvent.id, ticket)}
          />
        )}

        {/* View Own Attached Slip Modal */}
        {viewingOwnSlipEvent && (
          <Modal
            open={!!viewingOwnSlipEvent}
            onClose={() => setViewingOwnSlipEvent(null)}
            title={`Your Attached Payment Slip — ${viewingOwnSlipEvent.title}`}
            subtitle={
              viewingOwnSlipEvent.myTicketPaymentRef
                ? `Reference: ${viewingOwnSlipEvent.myTicketPaymentRef}`
                : `Status: ${viewingOwnSlipEvent.myTicketStatus}`
            }
            icon={Eye}
            iconColor="bg-indigo-600"
          >
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950/5 max-h-[62vh] flex items-center justify-center">
                <img
                  src={viewingOwnSlipEvent.myTicketSlipUrl}
                  alt="Your Payment Slip"
                  className="max-h-[60vh] w-auto object-contain"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>
                  Verification Status: <strong className="text-slate-900">{viewingOwnSlipEvent.myTicketStatus}</strong>
                </span>
                {viewingOwnSlipEvent.myTicketCode && (
                  <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                    Unique ID: {viewingOwnSlipEvent.myTicketCode}
                  </span>
                )}
              </div>
            </div>
          </Modal>
        )}

        {/* Event Manager Control Center Modal (Slips, Approvals, Unique IDs, Co-Managers & Day-Of Verification) */}
        {managingEvent && (
          <EventManagerModal
            event={managingEvent}
            onTicketChanged={() => fetchEvents(page)}
            onClose={() => {
              setManagingEvent(null);
              fetchEvents(page);
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   1. Ticket Request & Payment Slip Upload Modal
───────────────────────────────────────────────────────────────────────────── */
function TicketRequestModal({ event, onClose, onSubmitted }) {
  const [paymentSlipUrl, setPaymentSlipUrl] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const slipInputRef = useRef(null);

  const handleSlipSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.reason);
      e.target.value = '';
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setPaymentSlipUrl(dataUrl);
    } catch {
      toast.error('Failed to read payment slip image.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!paymentSlipUrl) {
      toast.error('Please attach your payment slip / receipt screenshot before submitting.');
      return;
    }
    if (paymentRef.trim()) {
      const refCheck = checkTextContent(paymentRef, { minLength: 2, fieldName: 'Transaction Reference' });
      if (!refCheck.clean) {
        toast.error(refCheck.reason);
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await ticketsAPI.buy(event.id, {
        paymentSlipUrl,
        paymentRef: paymentRef.trim() || undefined,
      });
      toast.success(res.data?.message || 'Payment slip submitted for Event Manager verification!');
      onSubmitted(res.data?.ticket);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit ticket request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={!!event}
      onClose={() => !submitting && onClose()}
      title="Submit Payment Slip for Event Ticket"
      subtitle="Attach your payment proof — an Event Manager will verify it and issue your unique Ticket ID"
      icon={TicketIcon}
      iconColor="bg-gradient-to-br from-indigo-600 to-violet-600"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Event</p>
            <p className="text-sm font-bold text-slate-900">{event.title}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(event.startDate, true)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 font-medium">Ticket Fee</p>
            <p className="text-lg font-extrabold text-indigo-700">
              {event.price > 0 ? `Rs. ${event.price}` : 'Free'}
            </p>
          </div>
        </div>

        {/* Organizer's Bank / JazzCash / EasyPaisa / Desk Instructions */}
        <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3.5 text-xs text-amber-900 space-y-1">
          <p className="font-bold uppercase tracking-wider text-[10px] text-amber-700">
            Payment &amp; Verification Instructions
          </p>
          <p className="leading-relaxed whitespace-pre-wrap font-medium">
            {event.paymentDetails ||
              (event.price > 0
                ? `Deposit Rs. ${event.price} via University Account / Event Desk / JazzCash / EasyPaisa and upload the clear payment receipt slip below.`
                : 'Attach your registration slip or Student ID verification screenshot below for Event Manager approval.')}
          </p>
        </div>

        {/* Payment Reference / Transaction ID */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            Transaction ID / Receipt Reference <span className="text-slate-400 font-normal normal-case">(Optional)</span>
          </label>
          <input
            type="text"
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
            placeholder="e.g. TID-984712345 or Bank Slip #402"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Required Payment Slip Image Attachment */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            Attach Payment Slip / Receipt Image *
          </label>
          <input
            ref={slipInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleSlipSelect}
            className="hidden"
          />
          {paymentSlipUrl ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-indigo-200 bg-slate-50 max-h-56">
              <img src={paymentSlipUrl} alt="Payment slip preview" className="w-full max-h-56 object-contain bg-slate-900/5" />
              <button
                type="button"
                onClick={() => {
                  setPaymentSlipUrl('');
                  if (slipInputRef.current) slipInputRef.current.value = '';
                }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/75 text-white hover:bg-red-600 transition-colors cursor-pointer"
                title="Remove slip"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => slipInputRef.current?.click()}
              className="w-full py-6 px-4 rounded-xl border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/60 text-indigo-700 text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Upload size={22} className="text-indigo-500" />
              <span>Click to Upload Payment Slip / Receipt Screenshot (JPEG, PNG, WEBP)</span>
              <span className="text-[11px] font-normal text-slate-400">
                Only visible to you and the authorized Event Managers
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100">
          <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" />
          <span>
            Once the Event Manager verifies your slip, a private <strong>Unique Ticket ID</strong> &amp; QR Pass will be issued exclusively to you.
          </span>
        </div>

        <Button
          type="submit"
          loading={submitting}
          disabled={!paymentSlipUrl}
          icon={Upload}
          className="w-full"
        >
          {submitting ? 'Submitting Payment Slip...' : 'Submit Payment Slip for Approval'}
        </Button>
      </form>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. Event Manager Control Center Modal
      - Tab 1: Payment Slips & Approvals (View Slip, Approve -> Generate Unique ID, Reject)
      - Tab 2: Day-Of Ticket ID Verification & Check-In
      - Tab 3: Co-Managers Assignment (Add Teacher, Coordinator, Admin, or Student Faculty)
───────────────────────────────────────────────────────────────────────────── */
function EventManagerModal({ event, onTicketChanged, onClose }) {
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'verify' | 'managers'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [tickets, setTickets] = useState([]);
  const [managers, setManagers] = useState(event.managers || []);
  const [canEditManagers, setCanEditManagers] = useState(Boolean(event.isCreator));
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [previewSlipTicket, setPreviewSlipTicket] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('Payment slip is unclear or transaction could not be verified. Please upload a clear payment receipt.');

  // Day-of verification state
  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  // Manager search state
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [addingManagerId, setAddingManagerId] = useState(null);

  const loadEventManagementData = async () => {
    try {
      setLoading(true);
      const res = await ticketsAPI.getEventTickets(event.id);
      setTickets(res.data.tickets || []);
      if (res.data.managers) setManagers(res.data.managers);
      setCanEditManagers(Boolean(res.data.isCreator || res.data.isAdmin));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load event tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventManagementData();
  }, [event.id]);

  // Real-time refresh when a student submits a new payment slip
  useEffect(() => {
    const handleLiveTicket = (payload) => {
      if (!payload || payload.eventId === event.id) {
        loadEventManagementData();
      }
    };
    socket.on('ticketUpdated', handleLiveTicket);
    return () => {
      socket.off('ticketUpdated', handleLiveTicket);
    };
  }, [event.id]);

  const handleApprove = async (ticketId) => {
    try {
      setActionId(ticketId);
      const res = await ticketsAPI.approve(ticketId);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? res.data.ticket : t)));
      if (previewSlipTicket?.id === ticketId) {
        setPreviewSlipTicket(res.data.ticket);
      }
      onTicketChanged?.();
      toast.success(res.data.message || 'Ticket approved and unique ID generated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve ticket.');
    } finally {
      setActionId(null);
    }
  };

  const openRejectPrompt = (ticket) => {
    setRejectTarget(ticket);
    setRejectReason(
      ticket.rejectionReason ||
        'Payment slip is unclear or transaction could not be verified. Please upload a clear payment receipt.'
    );
  };

  const confirmRejectTicket = async (e) => {
    if (e) e.preventDefault();
    if (!rejectTarget) return;
    const ticketId = rejectTarget.id;
    try {
      setActionId(ticketId);
      const res = await ticketsAPI.reject(
        ticketId,
        rejectReason.trim() || 'Payment slip could not be verified. Please attach a valid receipt.'
      );
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? res.data.ticket : t)));
      if (previewSlipTicket?.id === ticketId) {
        setPreviewSlipTicket(res.data.ticket);
      }
      setRejectTarget(null);
      onTicketChanged?.();
      toast.success(res.data.message || 'Payment slip rejected and user notified.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject ticket.');
    } finally {
      setActionId(null);
    }
  };

  const handleCheckIn = async (ticketId) => {
    try {
      setActionId(ticketId);
      const res = await ticketsAPI.verifyCheckIn(ticketId);
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? res.data.ticket : t)));
      if (verifyResult?.ticket?.id === ticketId) {
        setVerifyResult({ ...verifyResult, ticket: res.data.ticket, message: res.data.message });
      }
      onTicketChanged?.();
      toast.success(res.data.message || 'Attendee checked in!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to check in attendee.');
    } finally {
      setActionId(null);
    }
  };

  const handleVerifyByCode = async (e, markUsed = false) => {
    if (e) e.preventDefault();
    if (!verifyCodeInput.trim()) return;
    const raw = verifyCodeInput.trim().toUpperCase();
    const rkMatch = raw.match(/RK-[A-Z0-9]{4}-[A-Z0-9]{4}/);
    const extractedCode = rkMatch ? rkMatch[0] : raw;
    if (extractedCode !== verifyCodeInput) {
      setVerifyCodeInput(extractedCode);
    }
    try {
      setVerifyingCode(true);
      const res = await ticketsAPI.verifyByCode(event.id, extractedCode, markUsed);
      setVerifyResult(res.data);
      if (markUsed && res.data.ticket) {
        setTickets((prev) => prev.map((t) => (t.id === res.data.ticket.id ? res.data.ticket : t)));
        toast.success(res.data.message);
      }
    } catch (err) {
      setVerifyResult({
        valid: false,
        error: err.response?.data?.error || 'No matching ticket found for this ID.',
      });
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleSearchUsers = async (q) => {
    setUserQuery(q);
    if (!q.trim()) {
      setUserResults([]);
      return;
    }
    try {
      setSearchingUsers(true);
      const res = await usersAPI.search(q.trim());
      const existingIds = new Set([event.createdById, event.createdBy?.id, ...managers.map((m) => m.id)]);
      setUserResults((res.data.users || []).filter((u) => !existingIds.has(u.id)));
    } catch {
      setUserResults([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleAddManager = async (targetUserId) => {
    try {
      setAddingManagerId(targetUserId);
      const res = await eventsAPI.addManager(event.id, targetUserId);
      setManagers(res.data.managers || []);
      setUserResults((prev) => prev.filter((u) => u.id !== targetUserId));
      toast.success(res.data.message || 'Event Manager assigned!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign manager.');
    } finally {
      setAddingManagerId(null);
    }
  };

  const handleRemoveManager = async (targetUserId) => {
    try {
      setAddingManagerId(targetUserId);
      const res = await eventsAPI.removeManager(event.id, targetUserId);
      setManagers(res.data.managers || []);
      toast.success('Event Manager removed.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove manager.');
    } finally {
      setAddingManagerId(null);
    }
  };

  const pendingCount = tickets.filter((t) => t.status === 'PENDING').length;
  const approvedCount = tickets.filter((t) => t.status === 'VALID' || t.status === 'USED').length;
  const rejectedCount = tickets.filter((t) => t.status === 'REJECTED').length;

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === 'PENDING') return t.status === 'PENDING';
    if (statusFilter === 'APPROVED') return t.status === 'VALID' || t.status === 'USED';
    if (statusFilter === 'REJECTED') return t.status === 'REJECTED';
    return true;
  });

  return (
    <Modal
      open={!!event}
      onClose={onClose}
      title={`Event Manager Panel — ${event.title}`}
      subtitle="Verify attached payment slips, approve unique Ticket IDs, check in attendees & assign co-managers"
      icon={ShieldCheck}
      iconColor="bg-gradient-to-br from-[#0c1a4a] to-[#2251b8]"
      size="lg"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              activeTab === 'tickets' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <TicketIcon size={13} />
            Slips &amp; Approvals ({tickets.length})
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
                {pendingCount} Pending
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('verify')}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              activeTab === 'verify' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <KeyRound size={13} />
            Verify Unique ID ({approvedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('managers')}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              activeTab === 'managers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <Users size={13} />
            Event Managers ({managers.length + 1})
          </button>
        </div>

        {/* TAB 1: SLIPS & APPROVALS */}
        {activeTab === 'tickets' && (
          <div className="space-y-3">
            {/* Sub-filter pills */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { key: 'ALL', label: `All (${tickets.length})` },
                  { key: 'PENDING', label: `Pending Slips (${pendingCount})` },
                  { key: 'APPROVED', label: `Approved (${approvedCount})` },
                  { key: 'REJECTED', label: `Rejected (${rejectedCount})` },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setStatusFilter(f.key)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all border',
                      statusFilter === f.key
                        ? 'bg-[#1a2b6b] text-white border-[#1a2b6b]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-400">
                Click <strong>View Slip</strong> to inspect receipt before approving
              </span>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  No ticket requests in this category.
                </div>
              ) : (
                filteredTickets.map((t) => {
                  const isPending = t.status === 'PENDING';
                  const isValid = t.status === 'VALID';
                  const isUsed = t.status === 'USED';
                  const isRejected = t.status === 'REJECTED';

                  return (
                    <div
                      key={t.id}
                      className={cn(
                        'p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                        isPending
                          ? 'bg-amber-50/40 border-amber-200'
                          : isValid || isUsed
                          ? 'bg-emerald-50/30 border-emerald-200'
                          : 'bg-red-50/30 border-red-200'
                      )}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Clickable Payment Slip Thumbnail */}
                        {t.paymentSlipUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewSlipTicket(t)}
                            className="relative h-14 w-14 rounded-xl overflow-hidden border-2 border-indigo-200 bg-white flex-shrink-0 group cursor-pointer shadow-sm"
                            title="Click to inspect full payment slip"
                          >
                            <img
                              src={t.paymentSlipUrl}
                              alt="Slip"
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye size={14} className="text-white" />
                            </div>
                          </button>
                        ) : (
                          <Avatar name={t.user?.name || ''} src={t.user?.avatarUrl} size="sm" />
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-slate-900">{t.user?.name}</p>
                            <Badge
                              variant={
                                isPending ? 'amber' : isValid ? 'green' : isUsed ? 'blue' : 'red'
                              }
                              size="xs"
                            >
                              {isPending
                                ? 'Pending Slip Verification'
                                : isValid
                                ? 'Approved'
                                : isUsed
                                ? 'Checked In'
                                : 'Slip Rejected'}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {t.user?.email} · {t.user?.department || 'Campus'}
                            {t.user?.semester ? ` (Sem ${t.user.semester})` : ''}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5 text-[11px] text-slate-500">
                            <span>
                              Submitted: <strong>{formatDate(t.issuedAt, true)}</strong>
                            </span>
                            {t.paymentRef && (
                              <span>
                                · Ref: <strong className="font-mono text-slate-700">{t.paymentRef}</strong>
                              </span>
                            )}
                          </div>
                          {t.code && (
                            <p className="text-xs font-bold text-indigo-700 mt-1">
                              Unique Ticket ID:{' '}
                              <span className="font-mono bg-indigo-100 px-2 py-0.5 rounded-md tracking-wider">
                                {t.code}
                              </span>
                            </p>
                          )}
                          {isRejected && t.rejectionReason && (
                            <p className="text-[11px] text-red-600 font-medium mt-1">
                              Reason: {t.rejectionReason}
                            </p>
                          )}
                          {t.approvedBy && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {isRejected ? 'Rejected' : 'Verified'} by {t.approvedBy.name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap flex-shrink-0">
                        {t.paymentSlipUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewSlipTicket(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <Eye size={13} /> View Slip
                          </button>
                        )}
                        {isPending && (
                          <>
                            <button
                              type="button"
                              disabled={actionId === t.id}
                              onClick={() => handleApprove(t.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50 shadow-sm"
                            >
                              {actionId === t.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                              Approve &amp; Issue ID
                            </button>
                            <button
                              type="button"
                              disabled={actionId === t.id}
                              onClick={() => openRejectPrompt(t)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 cursor-pointer disabled:opacity-50"
                            >
                              <X size={13} /> Reject
                            </button>
                          </>
                        )}
                        {isRejected && (
                          <button
                            type="button"
                            disabled={actionId === t.id}
                            onClick={() => handleApprove(t.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer disabled:opacity-50"
                            title="Re-approve this slip and issue a Unique Ticket ID"
                          >
                            {actionId === t.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                            Approve Anyway
                          </button>
                        )}
                        {isValid && (
                          <>
                            <button
                              type="button"
                              disabled={actionId === t.id}
                              onClick={() => handleCheckIn(t.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer disabled:opacity-50"
                            >
                              {actionId === t.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={13} />}
                              Check In
                            </button>
                            <button
                              type="button"
                              disabled={actionId === t.id}
                              onClick={() => openRejectPrompt(t)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 cursor-pointer"
                              title="Revoke approval if slip was invalid"
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DAY-OF UNIQUE TICKET ID VERIFICATION */}
        {activeTab === 'verify' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Enter Attendee&apos;s Unique Ticket ID (e.g. RK-XXXX-XXXX)
              </label>
              <form onSubmit={(e) => handleVerifyByCode(e, false)} className="flex gap-2">
                <input
                  type="text"
                  value={verifyCodeInput}
                  onChange={(e) => setVerifyCodeInput(e.target.value.toUpperCase())}
                  placeholder="RK-7F9A-3K2M"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono font-bold uppercase tracking-wider focus:border-indigo-500 focus:outline-none"
                />
                <Button type="submit" loading={verifyingCode} icon={Search}>
                  Verify ID
                </Button>
              </form>
            </div>

            {verifyResult && (
              <div
                className={cn(
                  'p-4 rounded-xl border',
                  verifyResult.valid
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                    : 'bg-red-50 border-red-200 text-red-800'
                )}
              >
                {verifyResult.valid && verifyResult.ticket ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={verifyResult.ticket.user?.name || ''} src={verifyResult.ticket.user?.avatarUrl} size="md" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-extrabold">{verifyResult.ticket.user?.name}</p>
                          <Badge variant={verifyResult.ticket.status === 'USED' ? 'blue' : 'green'} size="xs">
                            {verifyResult.ticket.status === 'USED' ? 'Checked In' : 'Authentic Valid Ticket'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600">{verifyResult.ticket.user?.email}</p>
                        <p className="text-xs text-slate-500">
                          {verifyResult.ticket.user?.department || 'Campus'}{' '}
                          {verifyResult.ticket.user?.semester ? `· Semester ${verifyResult.ticket.user.semester}` : ''}
                        </p>
                        <p className="text-xs font-mono font-bold text-indigo-700 mt-1">
                          Ticket ID: {verifyResult.ticket.code}
                        </p>
                      </div>
                    </div>
                    {verifyResult.ticket.status === 'VALID' && (
                      <Button
                        type="button"
                        onClick={() => handleCheckIn(verifyResult.ticket.id)}
                        loading={actionId === verifyResult.ticket.id}
                        icon={CheckCircle2}
                      >
                        Confirm Entry Check-In
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs font-bold">{verifyResult.error || 'Invalid Ticket ID.'}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ASSIGN / MANAGE CO-MANAGERS (Teacher, Coordinator, Admin, or Student Faculty) */}
        {activeTab === 'managers' && (
          <div className="space-y-4">
            {canEditManagers && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Assign Teacher, Coordinator, Admin, or Student Faculty as Event Manager
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    placeholder="Search user by name, email, or department..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {searchingUsers ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={18} className="animate-spin text-indigo-600" />
                  </div>
                ) : userResults.length > 0 ? (
                  <div className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto bg-white">
                    {userResults.map((u) => (
                      <div key={u.id} className="flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{u.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {u.email} · {u.role} {u.department ? `(${u.department})` : ''}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={addingManagerId === u.id}
                          onClick={() => handleAddManager(u.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer flex-shrink-0"
                        >
                          {addingManagerId === u.id ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
                          Make Manager
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Authorized Event Managers
              </p>
              {/* Primary Creator */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <Avatar name={event.createdBy?.name || 'Creator'} src={event.createdBy?.avatarUrl} size="sm" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">{event.createdBy?.name || 'Event Creator'}</p>
                    <p className="text-[11px] text-slate-500">Primary Event Creator &amp; Lead Manager</p>
                  </div>
                </div>
                <Badge variant="purple" size="xs">Lead Creator</Badge>
              </div>

              {/* Co-Managers */}
              {managers.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.name} src={m.avatarUrl} size="sm" />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{m.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {m.email} · {m.role === 'STUDENT' ? 'Student Faculty Manager' : m.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="blue" size="xs">Event Manager</Badge>
                    {canEditManagers && (
                      <button
                        type="button"
                        disabled={addingManagerId === m.id}
                        onClick={() => handleRemoveManager(m.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                        title="Remove Manager"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Slip Full Inspection Sub-Modal */}
        {previewSlipTicket && (
          <Modal
            open={!!previewSlipTicket}
            onClose={() => setPreviewSlipTicket(null)}
            title={`Payment Slip — ${previewSlipTicket.user?.name}`}
            subtitle={previewSlipTicket.paymentRef ? `Reference: ${previewSlipTicket.paymentRef}` : 'Verify payment receipt before issuing Unique Ticket ID'}
            icon={Eye}
            iconColor="bg-indigo-600"
          >
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950/5 max-h-[60vh] flex items-center justify-center">
                <img
                  src={previewSlipTicket.paymentSlipUrl}
                  alt="Attached Payment Slip"
                  className="max-h-[58vh] w-auto object-contain"
                />
              </div>
              <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
                <div className="text-xs text-slate-600">
                  Status: <span className="font-bold">{previewSlipTicket.status}</span>
                  {previewSlipTicket.code && (
                    <span className="ml-2 font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      ID: {previewSlipTicket.code}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(previewSlipTicket.status === 'PENDING' || previewSlipTicket.status === 'VALID') && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      loading={actionId === previewSlipTicket.id}
                      onClick={() => openRejectPrompt(previewSlipTicket)}
                    >
                      {previewSlipTicket.status === 'VALID' ? 'Revoke & Reject' : 'Reject Slip'}
                    </Button>
                  )}
                  {(previewSlipTicket.status === 'PENDING' || previewSlipTicket.status === 'REJECTED') && (
                    <Button
                      type="button"
                      size="sm"
                      loading={actionId === previewSlipTicket.id}
                      onClick={() => handleApprove(previewSlipTicket.id)}
                      icon={Check}
                    >
                      Approve &amp; Generate Unique ID
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Custom Rejection Reason Sub-Modal */}
        {rejectTarget && (
          <Modal
            open={!!rejectTarget}
            onClose={() => !actionId && setRejectTarget(null)}
            title={`Reject Payment Slip — ${rejectTarget.user?.name}`}
            subtitle="Provide a clear reason so the student knows what to fix and re-upload"
            icon={AlertTriangle}
            iconColor="bg-red-600"
            size="sm"
          >
            <form onSubmit={confirmRejectTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Reason for Rejection *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium focus:border-red-500 focus:outline-none resize-none"
                  placeholder="e.g. Receipt screenshot is blurry / amount does not match Rs. 500..."
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setRejectTarget(null)} disabled={Boolean(actionId)}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger" loading={actionId === rejectTarget.id}>
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. Create Event Modal (Includes Payment Account Details & Initial Co-Managers)
───────────────────────────────────────────────────────────────────────────── */
function CreateEventModal({ open, onClose, onCreated }) {
  const getNowLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [minDateTime, setMinDateTime] = useState(getNowLocal);
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    price: '',
    capacity: '',
    paymentDetails: '',
  });
  const [imagePreview, setImagePreview] = useState('');
  const [selectedManagers, setSelectedManagers] = useState([]);
  const [managerSearch, setManagerSearch] = useState('');
  const [managerResults, setManagerResults] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (open) {
      const currentMin = getNowLocal();
      setMinDateTime(currentMin);
      setForm((prev) => ({
        ...prev,
        startDate: prev.startDate && prev.startDate >= currentMin ? prev.startDate : currentMin,
      }));
    }
  }, [open]);

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.reason);
      e.target.value = '';
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setImagePreview(dataUrl);
    } catch {
      toast.error('Failed to read image file.');
    }
  };

  const handleSearchManagers = async (q) => {
    setManagerSearch(q);
    if (!q.trim()) {
      setManagerResults([]);
      return;
    }
    try {
      const res = await usersAPI.search(q.trim());
      const pickedIds = new Set(selectedManagers.map((m) => m.id));
      setManagerResults((res.data.users || []).filter((u) => !pickedIds.has(u.id)));
    } catch {
      setManagerResults([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const titleCheck = checkTextContent(form.title, { minLength: 3, fieldName: 'Event title' });
    if (!titleCheck.clean) { toast.error(titleCheck.reason); return; }

    const descCheck = checkTextContent(form.description, { minLength: 10, fieldName: 'Event description' });
    if (!descCheck.clean) { toast.error(descCheck.reason); return; }

    const locCheck = checkTextContent(form.location, { minLength: 2, fieldName: 'Event location' });
    if (!locCheck.clean) { toast.error(locCheck.reason); return; }

    if (!form.startDate) { toast.error('Start date and time are required.'); return; }

    const startObj = new Date(form.startDate);
    if (Number.isNaN(startObj.getTime())) {
      toast.error('Please enter a valid start date and time.');
      return;
    }
    if (startObj < new Date(Date.now() - 2 * 60 * 1000)) {
      toast.error('Event start date and time cannot be in the past. Please choose a present or future date.');
      return;
    }
    if (form.endDate) {
      const endObj = new Date(form.endDate);
      if (Number.isNaN(endObj.getTime()) || endObj < startObj) {
        toast.error('Event end date and time cannot be earlier than the start date.');
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await eventsAPI.create({
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        price: form.price ? parseFloat(form.price) : 0,
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
        paymentDetails: form.paymentDetails.trim() || undefined,
        managerIds: selectedManagers.map((m) => m.id),
        ...(imagePreview ? { imageUrl: imagePreview } : {}),
      });
      onCreated(res.data.event);
      setForm({
        title: '',
        description: '',
        location: '',
        startDate: '',
        endDate: '',
        price: '',
        capacity: '',
        paymentDetails: '',
      });
      setImagePreview('');
      setSelectedManagers([]);
      setManagerSearch('');
      setManagerResults([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all';

  return (
    <Modal open={open} onClose={onClose} title="Create Campus Event" subtitle="Configure event details, payment slip instructions & assign Event Managers" icon={Sparkles} iconColor="bg-gradient-to-br from-violet-500 to-indigo-600">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Title *</label>
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Annual Tech Symposium 2026"
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Description * <span className="text-[10px] text-slate-400 normal-case">(min 10 chars)</span></label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Describe the event agenda, speakers, and details..."
            rows={2}
            className={`${inputCls} resize-none`}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Location *</label>
          <input
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="e.g. Main Auditorium"
            className={inputCls}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Start Date *</label>
            <input
              type="datetime-local"
              min={minDateTime}
              value={form.startDate}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  startDate: val,
                  endDate: prev.endDate && prev.endDate < val ? val : prev.endDate,
                }));
              }}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">End Date</label>
            <input
              type="datetime-local"
              min={form.startDate || minDateTime}
              value={form.endDate}
              onChange={(e) => set('endDate', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Ticket Price (Rs.)</label>
            <input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0 for Free" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Seat Capacity</label>
            <input type="number" min="1" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="Unlimited" className={inputCls} />
          </div>
        </div>

        {/* Payment Account / Slip Instructions */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
            Payment Account / Slip Instructions <span className="text-[10px] text-slate-400 normal-case">(Shown when student attaches payment slip)</span>
          </label>
          <input
            value={form.paymentDetails}
            onChange={(e) => set('paymentDetails', e.target.value)}
            placeholder="e.g. EasyPaisa/JazzCash: 0300-1234567 (Dr. Ahmed) or Student Service Desk Room 102"
            className={inputCls}
          />
        </div>

        {/* Assign Additional Event Managers (Teacher, Coordinator, Admin, or Student Faculty) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
            Assign Co-Managers <span className="text-[10px] text-slate-400 normal-case">(Teachers, Coordinators, Admins, or Student Faculty)</span>
          </label>
          {selectedManagers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedManagers.map((m) => (
                <span key={m.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                  {m.name} ({m.role === 'STUDENT' ? 'Student Faculty' : m.role})
                  <button
                    type="button"
                    onClick={() => setSelectedManagers((prev) => prev.filter((x) => x.id !== m.id))}
                    className="hover:text-red-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            value={managerSearch}
            onChange={(e) => handleSearchManagers(e.target.value)}
            placeholder="Search campus users by name or email to assign as Event Manager..."
            className={inputCls}
          />
          {managerResults.length > 0 && (
            <div className="mt-1.5 border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-32 overflow-y-auto bg-white shadow-sm">
              {managerResults.slice(0, 6).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedManagers((prev) => [...prev, u]);
                    setManagerSearch('');
                    setManagerResults([]);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 text-xs cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-slate-900">{u.name}</span>
                    <span className="text-slate-400 ml-1.5">({u.role} · {u.department || u.email})</span>
                  </div>
                  <span className="text-indigo-600 font-bold">+ Assign</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Event Picture Upload */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Event Picture (Optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageSelect}
            className="hidden"
          />
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-40">
              <img src={imagePreview} alt="Event preview" className="w-full max-h-40 object-cover" />
              <button
                type="button"
                onClick={() => {
                  setImagePreview('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/75 text-white hover:bg-red-600 transition-colors cursor-pointer"
                title="Remove picture"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 text-slate-500 hover:text-indigo-600 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ImageIcon size={16} />
              <span>Upload Event Banner / Poster Picture (JPEG, PNG, WEBP)</span>
            </button>
          )}
        </div>

        <Button
          type="submit"
          loading={submitting}
          disabled={!form.title.trim() || !form.description.trim() || !form.location.trim() || !form.startDate}
          className="w-full"
        >
          Create Event
        </Button>
      </form>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. Edit Event Modal (Update Event Title, Description, Location, Dates, Price, Capacity, Payment Details & Picture)
───────────────────────────────────────────────────────────────────────────── */
function EditEventModal({ event, onClose, onUpdated }) {
  const toLocalDateTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const getNowLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const minDateTime = getNowLocal();
  const originalStartLocal = toLocalDateTime(event.startDate);

  const [form, setForm] = useState({
    title: event.title || '',
    description: event.description || '',
    location: event.location || '',
    startDate: originalStartLocal,
    endDate: toLocalDateTime(event.endDate),
    price: event.price !== undefined && event.price !== null ? String(event.price) : '0',
    capacity: event.capacity !== undefined && event.capacity !== null ? String(event.capacity) : '',
    paymentDetails: event.paymentDetails || '',
  });
  const [imagePreview, setImagePreview] = useState(event.imageUrl || '');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.reason);
      e.target.value = '';
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setImagePreview(dataUrl);
    } catch {
      toast.error('Failed to read image file.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const titleCheck = checkTextContent(form.title, { minLength: 3, fieldName: 'Event title' });
    if (!titleCheck.clean) { toast.error(titleCheck.reason); return; }

    const descCheck = checkTextContent(form.description, { minLength: 10, fieldName: 'Event description' });
    if (!descCheck.clean) { toast.error(descCheck.reason); return; }

    const locCheck = checkTextContent(form.location, { minLength: 2, fieldName: 'Event location' });
    if (!locCheck.clean) { toast.error(locCheck.reason); return; }

    if (!form.startDate) { toast.error('Start date and time are required.'); return; }

    const startObj = new Date(form.startDate);
    if (Number.isNaN(startObj.getTime())) {
      toast.error('Please enter a valid start date and time.');
      return;
    }
    const isUnchangedStart = form.startDate === originalStartLocal;
    if (!isUnchangedStart && startObj < new Date(Date.now() - 2 * 60 * 1000)) {
      toast.error('Updated start date and time cannot be set in the past. Please choose a present or future date.');
      return;
    }
    if (form.endDate) {
      const endObj = new Date(form.endDate);
      if (Number.isNaN(endObj.getTime()) || endObj < startObj) {
        toast.error('Event end date and time cannot be earlier than the start date.');
        return;
      }
    }

    const activeTickets = event.ticketCount || 0;
    if (form.capacity !== '' && parseInt(form.capacity, 10) < activeTickets) {
      toast.error(`Seat capacity cannot be less than the ${activeTickets} tickets already reserved.`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await eventsAPI.update(event.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        startDate: form.startDate,
        endDate: form.endDate || null,
        price: form.price !== '' ? parseFloat(form.price) : 0,
        capacity: form.capacity !== '' ? parseInt(form.capacity, 10) : null,
        paymentDetails: form.paymentDetails.trim() || null,
        imageUrl: imagePreview || null,
      });
      onUpdated(res.data.event);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update event.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all';

  return (
    <Modal
      open={!!event}
      onClose={() => !submitting && onClose()}
      title="Edit Event Details"
      subtitle="Update event schedule, venue, capacity, payment instructions, or poster picture"
      icon={Edit3}
      iconColor="bg-gradient-to-br from-indigo-600 to-blue-600"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Title *</label>
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Event title"
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Description * <span className="text-[10px] text-slate-400 normal-case">(min 10 chars)</span></label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
            className={`${inputCls} resize-none`}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Location *</label>
          <input
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            className={inputCls}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Start Date *</label>
            <input
              type="datetime-local"
              min={originalStartLocal && originalStartLocal < minDateTime ? originalStartLocal : minDateTime}
              value={form.startDate}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  startDate: val,
                  endDate: prev.endDate && prev.endDate < val ? val : prev.endDate,
                }));
              }}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">End Date</label>
            <input
              type="datetime-local"
              min={form.startDate || minDateTime}
              value={form.endDate}
              onChange={(e) => set('endDate', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Ticket Price (Rs.)</label>
            <input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0 for Free" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
              Seat Capacity {event.ticketCount > 0 ? `(min ${event.ticketCount})` : ''}
            </label>
            <input
              type="number"
              min={Math.max(1, event.ticketCount || 1)}
              value={form.capacity}
              onChange={(e) => set('capacity', e.target.value)}
              placeholder="Unlimited"
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Payment Account / Slip Instructions</label>
          <input
            value={form.paymentDetails}
            onChange={(e) => set('paymentDetails', e.target.value)}
            placeholder="e.g. EasyPaisa/JazzCash: 0300-1234567 or Student Service Desk"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Event Picture</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageSelect}
            className="hidden"
          />
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-40">
              <img src={imagePreview} alt="Event preview" className="w-full max-h-40 object-cover" />
              <button
                type="button"
                onClick={() => {
                  setImagePreview('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/75 text-white hover:bg-red-600 transition-colors cursor-pointer"
                title="Remove picture"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 text-slate-500 hover:text-indigo-600 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ImageIcon size={16} />
              <span>Upload / Replace Event Picture</span>
            </button>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={submitting}
            disabled={!form.title.trim() || !form.description.trim() || !form.location.trim() || !form.startDate}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
