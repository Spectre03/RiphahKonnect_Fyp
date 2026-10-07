import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { eventsAPI } from '../services/api';
import { formatDate } from '../utils/brand';
import { cn } from '../utils/cn';
import { Card, Button, Badge, Modal } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Calendar, MapPin, Clock, Users, Plus, Loader2,
  Check, Star, XCircle, CalendarDays, Trash2, Sparkles,
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
    setEvents([{ ...event, attendeeCount: 0, myRsvp: null }, ...events]);
    setShowCreate(false);
    toast.success('Event created!');
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
                          </div>
                        </div>
                        {showDelete && (
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-all flex-shrink-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      {/* RSVP */}
                      {user && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50 flex-wrap">
                          <span className="text-[11px] text-slate-400 font-bold">RSVP:</span>
                          {[
                            { status: 'GOING',      icon: Check,   label: 'Going',   active: 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/30' },
                            { status: 'INTERESTED', icon: Star,    label: 'Maybe',   active: 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/30' },
                            { status: 'NOT_GOING',  icon: XCircle, label: "Can't go", active: 'bg-slate-600 text-white border-slate-600' },
                          ].map(({ status, icon: Icon, label, active }) => {
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
                                <Icon size={11} /> {label}
                              </button>
                            );
                          })}
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
      </div>
    </div>
  );
}

function CreateEventModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', location: '', startDate: '', endDate: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startDate) return;
    try {
      setSubmitting(true);
      const res = await eventsAPI.create({ ...form, endDate: form.endDate || undefined });
      onCreated(res.data.event);
      setForm({ title: '', description: '', location: '', startDate: '', endDate: '' });
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
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Annual Sports Day 2026"
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="What's this event about?"
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Location</label>
          <input
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="e.g. Main Auditorium"
            className={inputCls}
          />
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
        <Button
          type="submit"
          loading={submitting}
          disabled={!form.title.trim() || !form.startDate}
          className="w-full"
        >
          Create Event
        </Button>
      </form>
    </Modal>
  );
}

// === [SPEC-BLOCK-START] Airaf-A-49 (2026-10-07T17:28:19+05:00) ===
// [Airaf-A-49-L1] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #273
// [Airaf-A-49-L2] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #292
// [Airaf-A-49-L3] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #311
// [Airaf-A-49-L4] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #330
// [Airaf-A-49-L5] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #349
// [Airaf-A-49-L6] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #368
// [Airaf-A-49-L7] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #387
// [Airaf-A-49-L8] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #406
// [Airaf-A-49-L9] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #425
// [Airaf-A-49-L10] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #444
// [Airaf-A-49-L11] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #463
// [Airaf-A-49-L12] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #482
// [Airaf-A-49-L13] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #501
// [Airaf-A-49-L14] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #520
// [Airaf-A-49-L15] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #539
// [Airaf-A-49-L16] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #558
// [Airaf-A-49-L17] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #577
// [Airaf-A-49-L18] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #596
// [Airaf-A-49-L19] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #615
// [Airaf-A-49-L20] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #634
// [Airaf-A-49-L21] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #653
// [Airaf-A-49-L22] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #672
// [Airaf-A-49-L23] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #691
// [Airaf-A-49-L24] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #710
// [Airaf-A-49-L25] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #729
// [Airaf-A-49-L26] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #748
// [Airaf-A-49-L27] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #767
// [Airaf-A-49-L28] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #786
// [Airaf-A-49-L29] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #805
// [Airaf-A-49-L30] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #824
// [Airaf-A-49-L31] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #843
// [Airaf-A-49-L32] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #862
// [Airaf-A-49-L33] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #881
// [Airaf-A-49-L34] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #900
// [Airaf-A-49-L35] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #919
// [Airaf-A-49-L36] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #938
// [Airaf-A-49-L37] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #957
// [Airaf-A-49-L38] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #976
// [Airaf-A-49-L39] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #995
// [Airaf-A-49-L40] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #17
// [Airaf-A-49-L41] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #36
// [Airaf-A-49-L42] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #55
// [Airaf-A-49-L43] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #74
// [Airaf-A-49-L44] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #93
// [Airaf-A-49-L45] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #112
// [Airaf-A-49-L46] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #131
// [Airaf-A-49-L47] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #150
// [Airaf-A-49-L48] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #169
// [Airaf-A-49-L49] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #188
// [Airaf-A-49-L50] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #207
// [Airaf-A-49-L51] Display remaining seat capacity and entry fee badge on EventsPage :: verification rule #226
// === [SPEC-BLOCK-END] ===
