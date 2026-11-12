import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { eventsAPI } from '../services/api';
import { formatDate } from '../utils/brand';
import { cn } from '../utils/cn';
import { checkTextContent, validateImageFile, fileToDataUrl } from '../utils/moderation';
import { Card, Button, Badge, Modal } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Calendar, MapPin, Clock, Users, Plus, Loader2,
  Check, Star, XCircle, CalendarDays, Trash2, Sparkles,
  Image as ImageIcon, X, AlertTriangle,
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
    setEvents([{ ...event, attendeeCount: 0, interestedCount: 0, myRsvp: null }, ...events]);
    setShowCreate(false);
    toast.success('Event created!');
  };

  const canCreate  = CAN_CREATE.includes(user?.role);
  const canDelAny  = CAN_DEL_ANY.includes(user?.role);


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
                {canCreate ? 'Create and share events with the campus' : 'Discover and RSVP to events'}
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
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-all cursor-pointer" style={{ background: 'rgba(201,151,58,0.15)' }}>
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
              const isCreator = event.createdBy?.id === user?.id;
              const showDelete = isCreator || canDelAny;

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
                          </div>
                          {event.description && (
                            <p className="text-xs text-slate-500 leading-relaxed mb-2 whitespace-pre-wrap">{event.description}</p>
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
                          </div>
                        </div>
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

                      {/* RSVP */}
                      {user && (
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50 flex-wrap">
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
              Are you sure you want to delete <span className="font-bold text-slate-900">"{deleteTarget?.title}"</span>?
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
      </div>
    </div>
  );
}

function CreateEventModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', location: '', startDate: '', endDate: '' });
  const [imagePreview, setImagePreview] = useState('');
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

    const descCheck = checkTextContent(form.description, { minLength: 5, fieldName: 'Event description' });
    if (!descCheck.clean) { toast.error(descCheck.reason); return; }

    const locCheck = checkTextContent(form.location, { minLength: 2, fieldName: 'Event location' });
    if (!locCheck.clean) { toast.error(locCheck.reason); return; }

    if (!form.startDate) { toast.error('Start date and time are required.'); return; }

    try {
      setSubmitting(true);
      const res = await eventsAPI.create({
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        ...(imagePreview ? { imageUrl: imagePreview } : {}),
      });
      onCreated(res.data.event);
      setForm({ title: '', description: '', location: '', startDate: '', endDate: '' });
      setImagePreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
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
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Description *</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Describe the event agenda, speakers, and details..."
            rows={3}
            className={`${inputCls} resize-none`}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Location *</label>
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
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Start Date *</label>
            <input type="datetime-local" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">End Date</label>
            <input type="datetime-local" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className={inputCls} />
          </div>
        </div>

        {/* Event Picture Upload */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Event Picture (Optional)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageSelect}
            className="hidden"
          />
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-48">
              <img src={imagePreview} alt="Event preview" className="w-full max-h-48 object-cover" />
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
              className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 text-slate-500 hover:text-indigo-600 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
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
