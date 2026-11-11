import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { eventsAPI, ticketsAPI } from '../services/api';
import { formatDate } from '../utils/brand';
import { cn } from '../utils/cn';
import { Card, Button, Badge, Modal } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Calendar, MapPin, Clock, Users, Plus, Loader2,
  Check, Star, XCircle, CalendarDays, Trash2, Sparkles,
  Ticket as TicketIcon, CreditCard, Lock
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
  
  // Payment Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isPaying, setIsPaying] = useState(false);

  // Attendees Modal State
  const [viewingAttendees, setViewingAttendees] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  const fetchEvents = async (p = 1) => {
    try {
      setLoading(true);
      const res = await eventsAPI.getAll(p, filter === 'upcoming');
      setEvents(p === 1 ? res.data.events : [...events, ...res.data.events]);
      setPagination(res.data.pagination);
      setPage(p);
    } catch { toast.error('Failed to load events.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(1); }, [filter]);

  const handleRsvp = async (eventId, status) => {
    try {
      await eventsAPI.rsvp(eventId, status);
      setEvents(events.map((e) => {
        if (e.id !== eventId) return e;
        const wasRsvp = e.myRsvp;
        return {
          ...e,
          myRsvp: status === 'REMOVE' ? null : status,
          attendeeCount: status === 'REMOVE'
            ? e.attendeeCount - 1
            : wasRsvp ? e.attendeeCount : e.attendeeCount + 1,
        };
      }));
    } catch { toast.error('Failed to RSVP.'); }
  };

  const handleDelete = async (eventId) => {
    if (!confirm('Delete this event?')) return;
    try {
      await eventsAPI.delete(eventId);
      setEvents(events.filter((e) => e.id !== eventId));
      toast.success('Event deleted.');
    } catch { toast.error('Failed to delete.'); }
  };

  const handleCreated = (event) => {
    setEvents([{ ...event, attendeeCount: 0, myRsvp: null, ticketCount: 0, hasTicket: false }, ...events]);
    setShowCreate(false);
    toast.success('Event created!');
  };

  // Simulate Payment & Buy Ticket
  const confirmPurchase = async (e) => {
    e.preventDefault();
    if (!selectedEvent) return;
    
    try {
      setIsPaying(true);
      // Fake delay to simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      
      await ticketsAPI.buy(selectedEvent.id);
      
      // Update event in list
      setEvents(events.map(ev => 
        ev.id === selectedEvent.id 
          ? { ...ev, ticketCount: (ev.ticketCount || 0) + 1, hasTicket: true } 
          : ev
      ));
      
      toast.success('Payment successful! Ticket generated 🎟️');
      setSelectedEvent(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to buy ticket.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleViewAttendees = async (event) => {
    setViewingAttendees(event);
    setLoadingAttendees(true);
    try {
      const res = await ticketsAPI.getEventTickets(event.id);
      setAttendees(res.data.tickets);
    } catch {
      toast.error('Failed to load attendees.');
    } finally {
      setLoadingAttendees(false);
    }
  };

  const canCreate  = CAN_CREATE.includes(user?.role);
  const canDelAny  = CAN_DEL_ANY.includes(user?.role);

  return (
    <div className="page-wrapper">
      {/* ── Gradient Banner ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>
        <div className="absolute inset-0 banner-grid pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-white/[0.07] blur-3xl" />
          <div className="absolute -left-16 bottom-0 w-64 h-64 rounded-full bg-white/[0.05] blur-3xl" />
          <div className="absolute top-0 left-1/3 w-80 h-40 rounded-full bg-indigo-400/[0.1] blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-violet-300 block mb-2">Campus Life</span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Campus Events</h1>
              <p className="text-violet-200 text-sm mt-2">
                {canCreate ? 'Create and share events with the campus' : 'Discover and RSVP to events'}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {pagination && (
                <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 animate-popIn">
                  <CalendarDays className="h-5 w-5 text-violet-200" />
                  <div>
                    <span className="text-2xl font-extrabold text-white leading-none">{pagination.total}</span>
                    <p className="text-[11px] text-violet-300 font-medium">Events</p>
                  </div>
                </div>
              )}
              {canCreate && (
                <Button icon={Plus} onClick={() => setShowCreate(true)} className="bg-white text-violet-700 hover:bg-violet-50 border-0 shadow-lg">Create Event</Button>
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
                filter === f ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )}
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
              const isCreator = event.createdBy?.id === user?.id;
              const showDelete = isCreator || canDelAny;
              
              // Ticket Logic
              const isSoldOut = event.capacity && (event.ticketCount || 0) >= event.capacity;
              const hasTicket = event.hasTicket;

              return (
                <Card key={event.id} hover padding="p-0">
                  <div className="flex">
                    {/* Date Column */}
                    <div className={cn(
                      'flex-shrink-0 w-20 flex flex-col items-center justify-center border-r border-slate-100 rounded-l-2xl',
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
                            
                            {/* Price Badge */}
                            {event.price > 0 ? (
                              <Badge variant="amber" size="xs">Rs. {event.price}</Badge>
                            ) : (
                              <Badge variant="emerald" size="xs">Free</Badge>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2">{event.description}</p>
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
                            <span className="flex items-center gap-1">
                              <Users size={11} className="flex-shrink-0" />
                              {event.attendeeCount} attending
                            </span>
                            
                            {/* Ticket Capacity */}
                            {event.capacity && (
                              <span className="flex items-center gap-1 font-bold text-violet-600">
                                <TicketIcon size={11} className="flex-shrink-0" />
                                {event.ticketCount || 0} / {event.capacity} seats
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {(isCreator || canDelAny) && (
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              onClick={() => handleViewAttendees(event)}
                              className="text-[11px] h-7 px-2"
                            >
                              Attendees
                            </Button>
                          )}
                          {showDelete && (
                            <button
                              onClick={() => handleDelete(event.id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-all flex-shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* RSVP & Buy Ticket */}
                      {user && upcoming && (
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50 flex-wrap gap-2">
                          
                          {/* RSVP Buttons */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] text-slate-400 font-bold">RSVP:</span>
                            {[
                              { status: 'GOING',      icon: Check,   label: 'Going',   active: 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/30' },
                              { status: 'INTERESTED', icon: Star,    label: 'Maybe',   active: 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/30' },
                              { status: 'NOT_GOING',  icon: XCircle, label: "Can't go", active: 'bg-slate-600 text-white border-slate-600' },
                            ].map(({ status, icon: RsvpIcon, label, active }) => {
                              const isActive = event.myRsvp === status;
                              return (
                                <button
                                  key={status}
                                  onClick={() => handleRsvp(event.id, isActive ? 'REMOVE' : status)}
                                  className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-all border',
                                    isActive ? active : 'border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300'
                                  )}
                                >
                                  <RsvpIcon size={11} /> {label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Buy Ticket Button */}
                          <div>
                            {hasTicket ? (
                              <Badge variant="emerald" size="sm" className="py-1.5 px-3">
                                <Check size={12} className="mr-1" /> Ticket Acquired
                              </Badge>
                            ) : isSoldOut ? (
                              <Button variant="secondary" size="sm" disabled>Sold Out</Button>
                            ) : (
                              <Button 
                                onClick={() => setSelectedEvent(event)} 
                                size="sm" 
                                icon={TicketIcon}
                                className="bg-violet-600 hover:bg-violet-700 shadow-md shadow-violet-500/20"
                              >
                                {event.price > 0 ? 'Buy Ticket' : 'Get Ticket'}
                              </Button>
                            )}
                          </div>
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

        {/* Attendees Modal */}
        {viewingAttendees && (
          <Modal 
            open={!!viewingAttendees} 
            onClose={() => setViewingAttendees(null)} 
            title="Event Attendees" 
            subtitle={`${attendees.length} tickets sold for ${viewingAttendees.title}`}
            icon={Users}
            iconColor="bg-gradient-to-br from-emerald-500 to-teal-600"
          >
            <div className="max-h-96 overflow-y-auto pr-1">
              {loadingAttendees ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
              ) : attendees.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No tickets sold yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {attendees.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{t.user.name}</p>
                        <p className="text-xs text-slate-500">{t.user.department} · Sem {t.user.semester || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded">{t.code}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(t.issuedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Simulated Payment Modal */}
        {selectedEvent && (
          <Modal 
            open={!!selectedEvent} 
            onClose={() => !isPaying && setSelectedEvent(null)} 
            title="Checkout" 
            subtitle="Complete payment to secure your ticket"
            icon={CreditCard}
            iconColor="bg-gradient-to-br from-violet-500 to-indigo-600"
          >
            <form onSubmit={confirmPurchase} className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Event</p>
                  <p className="text-sm font-bold text-slate-900">{selectedEvent.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium">Total</p>
                  <p className="text-lg font-extrabold text-violet-600">
                    {selectedEvent.price > 0 ? `Rs. ${selectedEvent.price}` : 'Free'}
                  </p>
                </div>
              </div>

              {selectedEvent.price > 0 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Card Number (Demo)</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input type="text" placeholder="4242 4242 4242 4242" required defaultValue="4242 4242 4242 4242" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:border-violet-500 focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Expiry</label>
                      <input type="text" placeholder="MM/YY" required defaultValue="12/28" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:border-violet-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">CVC</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input type="text" placeholder="123" required defaultValue="123" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:border-violet-500 focus:outline-none" />
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-center text-slate-400 mt-2">This is a simulated payment gateway for FYP demo purposes.</p>
                </div>
              )}

              <Button type="submit" loading={isPaying} icon={Lock} className="w-full bg-violet-600 hover:bg-violet-700">
                {isPaying ? 'Processing Payment...' : `Pay ${selectedEvent.price > 0 ? `Rs. ${selectedEvent.price}` : ''} & Get Ticket`}
              </Button>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}

function CreateEventModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', location: '', startDate: '', endDate: '', price: '', capacity: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startDate) return;
    try {
      setSubmitting(true);
      const payload = {
        ...form,
        endDate: form.endDate || undefined,
        price: form.price ? parseFloat(form.price) : 0,
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
      };
      const res = await eventsAPI.create(payload);
      onCreated(res.data.event);
      setForm({ title: '', description: '', location: '', startDate: '', endDate: '', price: '', capacity: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all';

  return (
    <Modal open={open} onClose={onClose} title="Create Event" subtitle="Fill in the details for your event" icon={Sparkles} iconColor="bg-gradient-to-br from-violet-500 to-indigo-600">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Title *</label>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Annual Sports Day 2026" className={inputCls} required />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Description</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What's this event about?" rows={3} className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Location</label>
          <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Main Auditorium" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Start Date *</label>
            <input type="datetime-local" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">End Date</label>
            <input type="datetime-local" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Price (Rs.)</label>
            <input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0 for free" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Capacity</label>
            <input type="number" min="1" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} placeholder="Unlimited" className={inputCls} />
          </div>
        </div>
        <Button type="submit" loading={submitting} disabled={!form.title.trim() || !form.startDate} className="w-full">
          Create Event
        </Button>
      </form>
    </Modal>
  );
}
