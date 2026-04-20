import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { eventsAPI } from '../services/api';
import { cn } from '../utils/cn';
import { Card, Button, Badge, Modal } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Plus,
  Loader2,
  X,
  Check,
  Star,
  XCircle,
  CalendarDays,
} from 'lucide-react';

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
    } catch {
      toast.error('Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(1);
  }, [filter]);

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
            : wasRsvp
              ? e.attendeeCount
              : e.attendeeCount + 1,
        };
      }));
    } catch {
      toast.error('Failed to RSVP.');
    }
  };

  const handleDelete = async (eventId) => {
    if (!confirm('Delete this event?')) return;
    try {
      await eventsAPI.delete(eventId);
      setEvents(events.filter((e) => e.id !== eventId));
      toast.success('Event deleted.');
    } catch {
      toast.error('Failed to delete event.');
    }
  };

  const handleCreated = (event) => {
    setEvents([{ ...event, attendeeCount: 0, myRsvp: null }, ...events]);
    setShowCreate(false);
    toast.success('Event created!');
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDateParts = (date) => {
    const d = new Date(date);
    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: d.getDate(),
    };
  };

  const isUpcoming = (date) => new Date(date) > new Date();

  return (
    <div className="rc-fade-in">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/20 flex-shrink-0">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900">Campus Events</h1>
              <p className="text-xs text-slate-500">Discover and attend events on campus</p>
            </div>
          </div>
          <Button icon={Plus} onClick={() => setShowCreate(true)}>Create Event</Button>
        </div>

        {/* Filter */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border border-slate-200/60 p-1 max-w-xs shadow-sm">
          {['upcoming', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'flex-1 py-2 text-sm font-semibold rounded-lg cursor-pointer transition-all',
                filter === f
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              {f === 'upcoming' ? 'Upcoming' : 'All Events'}
            </button>
          ))}
        </div>

        {/* Events */}
        {loading && page === 1 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
            <p className="text-sm text-slate-400 mt-3">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <Card className="text-center py-16">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-base font-semibold text-slate-900">No events found</p>
            <p className="text-sm text-slate-500 mt-1">Create an event to get started!</p>
          </Card>
        ) : (
          <div className="space-y-4 rc-stagger">
            {events.map((event) => {
              const dp = getDateParts(event.startDate);
              const upcoming = isUpcoming(event.startDate);
              return (
                <Card key={event.id} hover padding="p-0">
                  <div className="flex">
                    {/* Date Badge */}
                    <div className={cn(
                      'flex-shrink-0 w-20 flex flex-col items-center justify-center border-r border-slate-100',
                      upcoming ? 'bg-gradient-to-b from-violet-50 to-violet-100/50' : 'bg-slate-50'
                    )}>
                      <span className={cn('text-[10px] font-bold tracking-wider', upcoming ? 'text-violet-500' : 'text-slate-400')}>{dp.month}</span>
                      <span className={cn('text-2xl font-bold', upcoming ? 'text-violet-700' : 'text-slate-500')}>{dp.day}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="text-base font-bold text-slate-900 truncate">{event.title}</h3>
                            {!upcoming && <Badge variant="slate" size="sm">Past</Badge>}
                          </div>
                          {event.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed break-words">{event.description}</p>}
                          <div className="flex flex-wrap gap-3 mt-2.5 text-xs text-slate-400">
                            <span className="flex items-center gap-1 min-w-0">
                              <Clock className="h-3.5 w-3.5 flex-shrink-0" /> <span className="truncate">{formatDate(event.startDate)}</span>
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1 min-w-0">
                                <MapPin className="h-3.5 w-3.5 flex-shrink-0" /> <span className="truncate">{event.location}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 flex-shrink-0" /> {event.attendeeCount} attending
                            </span>
                          </div>
                        </div>
                        {event.createdBy?.id === user?.id && (
                          <button onClick={() => handleDelete(event.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors ml-2 flex-shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* RSVP */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                        <span className="text-xs text-slate-400 font-semibold mr-1">RSVP:</span>
                        {[
                          { status: 'GOING', icon: Check, label: 'Going', activeColor: 'teal' },
                          { status: 'INTERESTED', icon: Star, label: 'Interested', activeColor: 'amber' },
                          { status: 'NOT_GOING', icon: XCircle, label: "Can't go", activeColor: 'slate' },
                        ].map(({ status, icon: Icon, label, activeColor }) => {
                          const isActive = event.myRsvp === status;
                          const activeColors = {
                            teal: 'bg-teal-100 text-teal-700 border-teal-200',
                            amber: 'bg-amber-100 text-amber-700 border-amber-200',
                            slate: 'bg-slate-200 text-slate-700 border-slate-300',
                          };
                          return (
                            <button
                              key={status}
                              onClick={() => handleRsvp(event.id, isActive ? 'REMOVE' : status)}
                              className={cn(
                                'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all border',
                                isActive
                                  ? activeColors[activeColor]
                                  : 'border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" /> {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {pagination && page < pagination.totalPages && (
          <div className="flex justify-center pt-6">
            <Button variant="secondary" onClick={() => fetchEvents(page + 1)} loading={loading}>Load More</Button>
          </div>
        )}

        <CreateEventModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      </div>
    </div>
  );
}

function CreateEventModal({ open, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !startDate) return;
    try {
      setSubmitting(true);
      const res = await eventsAPI.create({ title, description, location, startDate, endDate: endDate || undefined });
      onCreated(res.data.event);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Event">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all" required />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Event details..." rows={3} className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none transition-all" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Room 101, Main Campus" className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Date *</label>
            <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Date</label>
            <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all" />
          </div>
        </div>
        <Button type="submit" loading={submitting} disabled={!title.trim() || !startDate} className="w-full">
          Create Event
        </Button>
      </form>
    </Modal>
  );
}
