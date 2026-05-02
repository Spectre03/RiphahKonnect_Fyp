import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { announcementsAPI } from '../services/api';
import { timeAgo } from '../utils/brand';
import { cn } from '../utils/cn';
import { Card, Button, Badge, Modal, Avatar } from '../components/ui';
import { DEPARTMENTS, SEMESTERS, getDepartmentsForUser } from '../utils/constants';
import toast from 'react-hot-toast';
import {
  Megaphone, Plus, Loader2, Trash2, Shield,
  BookOpen, Bell, Sparkles,
} from 'lucide-react';

const CAN_CREATE = ['UNIVERSITY_ADMIN', 'COORDINATION', 'TEACHER', 'SYSTEM_ADMIN'];

const TYPE_CONFIG = {
  OFFICIAL: {
    variant: 'amber',
    label: 'Official',
    icon: Shield,
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    gradient: 'from-amber-500 to-orange-500',
    border: 'border-amber-100',
  },
  CLASS: {
    variant: 'blue',
    label: 'Class',
    icon: BookOpen,
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    gradient: 'from-blue-500 to-indigo-500',
    border: 'border-blue-100',
  },
};

const FILTER_TABS = [
  { value: 'ALL',      label: 'All' },
  { value: 'OFFICIAL', label: 'Official' },
  { value: 'CLASS',    label: 'Class' },
];

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchAnnouncements = async (p = 1) => {
    try {
      setLoading(true);
      const res = await announcementsAPI.getAll({
        page: p,
        type: filterType !== 'ALL' ? filterType : undefined,
      });
      setAnnouncements(p === 1 ? res.data.announcements : [...announcements, ...res.data.announcements]);
      setPagination(res.data.pagination);
      setPage(p);
    } catch { toast.error('Failed to load announcements.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAnnouncements(1); }, [filterType]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await announcementsAPI.delete(id);
      setAnnouncements(announcements.filter((a) => a.id !== id));
      toast.success('Announcement deleted.');
    } catch { toast.error('Failed to delete.'); }
  };

  const handleCreated = (ann) => {
    setAnnouncements([ann, ...announcements]);
    setShowCreate(false);
    toast.success('Announcement posted!');
  };

  const canCreate = CAN_CREATE.includes(user?.role);
  const isOwnerOrAdmin = (ann) =>
    ann.author?.id === user?.id || ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN'].includes(user?.role);

  return (
    <div className="page-wrapper">
      {/* ── Gradient Banner ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)' }}>
        <div className="absolute inset-0 banner-grid pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-20 -top-16 w-72 h-72 rounded-full bg-white/[0.07] blur-3xl" />
          <div className="absolute -left-16 bottom-0 w-64 h-64 rounded-full bg-white/[0.05] blur-3xl" />
          <div className="absolute top-0 left-1/2 w-72 h-40 rounded-full bg-orange-300/[0.12] blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-amber-200 block mb-2">University</span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Announcements</h1>
              <p className="text-amber-100 text-sm mt-2">
                {canCreate ? 'Post and manage announcements' : 'Official notices and university updates'}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {pagination && (
                <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 animate-popIn">
                  <Megaphone className="h-5 w-5 text-amber-200" />
                  <div>
                    <span className="text-2xl font-extrabold text-white leading-none">{pagination.total}</span>
                    <p className="text-[11px] text-amber-300 font-medium">Announcements</p>
                  </div>
                </div>
              )}
              {canCreate && (
                <Button icon={Plus} onClick={() => setShowCreate(true)} className="bg-white text-amber-700 hover:bg-amber-50 border-0 shadow-lg">Post Announcement</Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Filter Tabs ── */}
        <div className="flex gap-1 mb-6 bg-white rounded-2xl border border-slate-900/[0.06] p-1 max-w-xs shadow-sm">
          {FILTER_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={cn(
                'flex-1 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all',
                filterType === t.value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Announcements ── */}
        {loading && page === 1 ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} padding="p-5">
                <div className="flex gap-3">
                  <div className="skeleton h-10 w-10 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-1/2 rounded" />
                    <div className="skeleton h-3 w-full rounded" />
                    <div className="skeleton h-3 w-3/4 rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <Card className="text-center py-16">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Bell size={24} className="text-amber-300" />
            </div>
            <p className="text-base font-bold text-slate-800">No announcements</p>
            <p className="text-sm text-slate-400 mt-1">
              {canCreate ? 'Post the first announcement.' : 'Nothing to show yet. Check back later.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4 stagger">
            {announcements.map((ann) => {
              const tc = TYPE_CONFIG[ann.type] || TYPE_CONFIG.OFFICIAL;
              const TypeIcon = tc.icon;
              return (
                <Card key={ann.id} padding="p-0">
                  {/* Top accent bar */}
                  <div className={`h-1 bg-gradient-to-r ${tc.gradient} rounded-t-2xl`} />

                  <div className="p-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0', tc.bg)}>
                          <TypeIcon size={18} className={tc.iconColor} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <h3 className="text-sm font-bold text-slate-900">{ann.title}</h3>
                            <Badge variant={tc.variant} size="xs">{tc.label}</Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="font-semibold text-slate-600">{ann.author?.name}</span>
                            {ann.author?.department && (
                              <><span className="text-slate-200">·</span><span>{ann.author.department}</span></>
                            )}
                            <span className="text-slate-200">·</span>
                            <span>{timeAgo(ann.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      {isOwnerOrAdmin(ann) && (
                        <button
                          onClick={() => handleDelete(ann.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-all flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{ann.content}</p>

                    {/* Target info */}
                    {(ann.targetDepartment || ann.targetSemester) && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                        <span className="text-[11px] text-slate-400 font-medium">Targeted to:</span>
                        {ann.targetDepartment && <Badge variant="blue" size="xs">{ann.targetDepartment}</Badge>}
                        {ann.targetSemester && <Badge variant="violet" size="xs">Semester {ann.targetSemester}</Badge>}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}

            {pagination && page < pagination.totalPages && (
              <div className="flex justify-center pt-2">
                <Button variant="secondary" onClick={() => fetchAnnouncements(page + 1)} loading={loading}>
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}

        {canCreate && (
          <CreateAnnouncementModal
            open={showCreate}
            onClose={() => setShowCreate(false)}
            onCreated={handleCreated}
            userRole={user?.role}
          />
        )}
      </div>
    </div>
  );
}

function CreateAnnouncementModal({ open, onClose, onCreated, userRole }) {
  const { user } = useAuth();
  const availableDepts = getDepartmentsForUser(user);
  const defaultType = userRole === 'TEACHER' ? 'CLASS' : 'OFFICIAL';
  const [form, setForm] = useState({
    title: '', content: '',
    type: defaultType,
    targetDepartment: '', targetSemester: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    try {
      setSubmitting(true);
      const payload = {
        ...form,
        targetSemester: form.targetSemester ? parseInt(form.targetSemester) : undefined,
        targetDepartment: form.targetDepartment || undefined,
      };
      const res = await announcementsAPI.create(payload);
      onCreated(res.data.announcement);
      setForm({ title: '', content: '', type: defaultType, targetDepartment: '', targetSemester: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post announcement.');
    } finally { setSubmitting(false); }
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all';

  return (
    <Modal open={open} onClose={onClose} title="Post Announcement" subtitle="Reach your audience" icon={Sparkles} iconColor="bg-gradient-to-br from-amber-500 to-orange-600">
      <form onSubmit={handleSubmit} className="space-y-4">
        {userRole !== 'TEACHER' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Type</label>
            <div className="flex gap-2">
              {['OFFICIAL', 'CLASS'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all',
                    form.type === t
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  )}
                >
                  {t === 'OFFICIAL' ? 'Official' : 'Class'}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Title *</label>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Announcement title" className={inputCls} required />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Content *</label>
          <textarea value={form.content} onChange={(e) => set('content', e.target.value)} placeholder="Write your announcement..." rows={4} className={`${inputCls} resize-none`} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Department <span className="text-slate-400 normal-case font-medium">(optional)</span></label>
            <select value={form.targetDepartment} onChange={(e) => set('targetDepartment', e.target.value)} className={inputCls}>
              <option value="">All departments</option>
              {availableDepts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Semester <span className="text-slate-400 normal-case font-medium">(optional)</span></label>
            <select value={form.targetSemester} onChange={(e) => set('targetSemester', e.target.value)} className={inputCls}>
              <option value="">All semesters</option>
              {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
        </div>
        <Button type="submit" loading={submitting} disabled={!form.title.trim() || !form.content.trim()} className="w-full">
          Post Announcement
        </Button>
      </form>
    </Modal>
  );
}
