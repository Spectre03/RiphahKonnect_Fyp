import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { announcementsAPI } from '../services/api';
import { timeAgo, formatDate } from '../utils/brand';
import { cn } from '../utils/cn';
import { Card, Button, Badge, Modal, Avatar } from '../components/ui';
import { DEPARTMENTS, SEMESTERS, getDepartmentsForUser } from '../utils/constants';
import { checkTextContent, fileToDataUrl } from '../utils/moderation';
import toast from 'react-hot-toast';
import {
  Megaphone, Plus, Loader2, Trash2, Shield,
  BookOpen, Bell, Sparkles, Paperclip, Calendar,
  Download, ExternalLink, FileText, X, AlertTriangle,
} from 'lucide-react';

const CAN_CREATE = ['UNIVERSITY_ADMIN', 'COORDINATION', 'TEACHER', 'SYSTEM_ADMIN'];

const TYPE_CONFIG = {
  GENERAL: {
    variant: 'amber',
    label: 'General',
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
  { value: 'GENERAL',  label: 'General' },
  { value: 'CLASS',    label: 'Class' },
];

/**
 * Extracts optional <!--RK_META:{...}--> metadata from announcement content
 */
function parseAnnouncementMeta(ann) {
  const raw = ann?.content || '';
  const match = raw.match(/\n?<!--RK_META:(\{[\s\S]*?\})-->$/);
  let meta = {};
  let cleanContent = raw;
  if (match) {
    cleanContent = raw.slice(0, match.index).trim();
    try {
      meta = JSON.parse(match[1]);
    } catch {
      meta = {};
    }
  }
  return {
    cleanContent,
    attachmentUrl: ann.attachmentUrl || meta.attachmentUrl || null,
    attachmentName: ann.attachmentName || meta.attachmentName || 'Attachment',
    publishDate: ann.publishDate || meta.publishDate || ann.createdAt,
  };
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await announcementsAPI.delete(deleteTarget.id);
      setAnnouncements(announcements.filter((a) => a.id !== deleteTarget.id));
      toast.success('Announcement deleted.');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete.');
    } finally {
      setDeleting(false);
    }
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
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c1a4a 0%, #1a2b6b 100%)' }}>
        <div className="absolute inset-0 banner-grid pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-20 -top-16 w-72 h-72 rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(201,151,58,0.08) 0%, transparent 70%)' }} />
          <div className="absolute -left-16 bottom-0 w-64 h-64 rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(26,43,107,0.5) 0%, transparent 70%)' }} />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest block mb-2" style={{ color: '#c9973a' }}>University</span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Announcements</h1>
              <p className="text-slate-400 text-sm mt-2">
                {canCreate ? 'Post and manage official announcements with attachments & publish dates' : 'Official notices and university updates'}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {pagination && (
                <div className="hidden sm:flex items-center gap-2 backdrop-blur-sm border rounded-2xl px-4 py-3 animate-popIn" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  <Megaphone className="h-5 w-5" style={{ color: '#c9973a' }} />
                  <div>
                    <span className="text-2xl font-extrabold text-white leading-none">{pagination.total}</span>
                    <p className="text-[11px] font-medium" style={{ color: '#c9973a' }}>Announcements</p>
                  </div>
                </div>
              )}
              {canCreate && (
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-all cursor-pointer" style={{ background: 'rgba(201,151,58,0.15)' }}>
                  <Plus size={14} /> Post Announcement
                </button>
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
                filterType === t.value ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              )}
              style={filterType === t.value ? { background: 'linear-gradient(135deg, #1a2b6b, #2251b8)' } : {}}
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
              const tc = TYPE_CONFIG[ann.type] || TYPE_CONFIG.GENERAL;
              const TypeIcon = tc.icon;
              const { cleanContent, attachmentUrl, attachmentName, publishDate } = parseAnnouncementMeta(ann);
              const isImageAttachment = attachmentUrl && (
                attachmentUrl.startsWith('data:image/') ||
                /\.(jpe?g|png|gif|webp)(\?|$)/i.test(attachmentUrl)
              );

              return (
                <Card key={ann.id} padding="p-0" className="overflow-hidden">
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
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
                            <span className="font-semibold text-slate-600">{ann.author?.name}</span>
                            {ann.author?.department && (
                              <><span className="text-slate-200">·</span><span>{ann.author.department}</span></>
                            )}
                            <span className="text-slate-200">·</span>
                            <span className="inline-flex items-center gap-1 text-indigo-600 font-semibold">
                              <Calendar size={11} />
                              Published: {formatDate(publishDate, true)}
                            </span>
                            <span className="text-slate-200">·</span>
                            <span>({timeAgo(ann.createdAt)})</span>
                          </div>
                        </div>
                      </div>
                      {isOwnerOrAdmin(ann) && (
                        <button
                          onClick={() => setDeleteTarget(ann)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-all flex-shrink-0"
                          title="Delete announcement"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{cleanContent}</p>

                    {/* Attachment Display */}
                    {attachmentUrl && (
                      <div className="mt-3.5">
                        {isImageAttachment ? (
                          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                            <img
                              src={attachmentUrl}
                              alt={attachmentName}
                              className="w-full max-h-72 object-contain bg-slate-900/5"
                            />
                            <div className="flex items-center justify-between px-3.5 py-2 bg-white border-t border-slate-100">
                              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 truncate">
                                <Paperclip size={13} className="text-indigo-500 flex-shrink-0" />
                                {attachmentName}
                              </span>
                              <a
                                href={attachmentUrl}
                                download={attachmentName}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 flex-shrink-0"
                              >
                                <Download size={13} /> Download
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-indigo-100 bg-indigo-50/50">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                                <FileText size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{attachmentName}</p>
                                <p className="text-[11px] text-slate-500">Official Attachment</p>
                              </div>
                            </div>
                            <a
                              href={attachmentUrl}
                              download={attachmentName}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 flex-shrink-0 transition-colors"
                            >
                              {attachmentUrl.startsWith('data:') ? <Download size={12} /> : <ExternalLink size={12} />}
                              {attachmentUrl.startsWith('data:') ? 'Download' : 'Open'}
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Target info */}
                    {(ann.targetDepartments?.length > 0 || ann.targetSemesters?.length > 0) && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50 flex-wrap">
                        <span className="text-[11px] text-slate-400 font-medium">Targeted to:</span>
                        {ann.targetDepartments?.map(d => (
                           <Badge key={d} variant="blue" size="xs">{d}</Badge>
                        ))}
                        {ann.targetSemesters?.map(s => (
                           <Badge key={s} variant="violet" size="xs">Semester {s}</Badge>
                        ))}
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

        {/* Delete Announcement Confirmation Modal */}
        <Modal
          open={Boolean(deleteTarget)}
          onClose={() => !deleting && setDeleteTarget(null)}
          title="Delete Announcement"
          subtitle="This action cannot be undone"
          icon={AlertTriangle}
          iconColor="bg-red-500"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete the announcement <span className="font-bold text-slate-900">"{deleteTarget?.title}"</span>?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDelete} loading={deleting} icon={Trash2}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

function CreateAnnouncementModal({ open, onClose, onCreated, userRole }) {
  const { user } = useAuth();
  const availableDepts = getDepartmentsForUser(user);
  const defaultType = userRole === 'TEACHER' ? 'CLASS' : 'GENERAL';
  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const fileInputRef = useRef(null);
  
  const [form, setForm] = useState({
    title: '', 
    content: '',
    type: defaultType,
    targetDepartments: [], 
    targetSemesters: [],
    publishDate: nowLocal,
    attachmentUrl: '',
    attachmentName: '',
  });
  
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Attachment file size must be under 5MB.');
      e.target.value = '';
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((prev) => ({
        ...prev,
        attachmentUrl: dataUrl,
        attachmentName: file.name,
      }));
    } catch {
      toast.error('Failed to read attachment file.');
    }
  };

  const toggleDept = (dept) => {
    if (dept === 'All') {
      if (form.targetDepartments.includes('All')) {
        set('targetDepartments', []);
      } else {
        set('targetDepartments', ['All']);
      }
      return;
    }

    setForm(f => {
      let depts = f.targetDepartments.filter(d => d !== 'All');
      if (depts.includes(dept)) {
        depts = depts.filter(d => d !== dept);
      } else {
        depts = [...depts, dept];
      }
      return { ...f, targetDepartments: depts };
    });
  };

  const toggleSemester = (sem) => {
    setForm(f => {
      let sems = [...f.targetSemesters];
      if (sems.includes(sem)) {
        sems = sems.filter(s => s !== sem);
      } else {
        sems = [...sems, sem];
      }
      return { ...f, targetSemesters: sems };
    });
  };

  const handleTypeChange = (t) => {
    setForm(f => ({ ...f, type: t, targetDepartments: [], targetSemesters: [] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const titleCheck = checkTextContent(form.title, { minLength: 3, fieldName: 'Announcement title' });
    if (!titleCheck.clean) return toast.error(titleCheck.reason);

    const contentCheck = checkTextContent(form.content, { minLength: 5, fieldName: 'Announcement content' });
    if (!contentCheck.clean) return toast.error(contentCheck.reason);
    
    const payload = { ...form };
    if (payload.type === 'CLASS') {
      if (payload.targetDepartments.length === 0) return toast.error('Please select at least one department for Class announcements');
      if (payload.targetSemesters.length === 0) return toast.error('Please select at least one semester for Class announcements');
      if (payload.targetDepartments.includes('All')) return toast.error('Class announcements cannot target All departments');
    } else {
      if (payload.targetDepartments.length === 0) {
        payload.targetDepartments = ['All'];
      }
    }

    try {
      setSubmitting(true);
      const res = await announcementsAPI.create(payload);
      onCreated(res.data.announcement);
      setForm({
        title: '',
        content: '',
        type: defaultType,
        targetDepartments: [],
        targetSemesters: [],
        publishDate: nowLocal,
        attachmentUrl: '',
        attachmentName: '',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post announcement.');
    } finally { setSubmitting(false); }
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all';

  return (
    <Modal open={open} onClose={onClose} title="Post Announcement" subtitle="Reach your audience with attachments & publish date" icon={Sparkles} iconColor="bg-gradient-to-br from-amber-500 to-orange-600">
      <form onSubmit={handleSubmit} className="space-y-4">
        {userRole !== 'TEACHER' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Type</label>
            <div className="flex gap-2">
              {['GENERAL', 'CLASS'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all',
                    form.type === t
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  )}
                >
                  {t === 'GENERAL' ? 'General' : 'Class'}
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
          <textarea value={form.content} onChange={(e) => set('content', e.target.value)} placeholder="Write your announcement..." rows={3} className={`${inputCls} resize-none`} required />
        </div>

        {/* Publish Date & Attachment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Publish Date *</label>
            <input
              type="datetime-local"
              value={form.publishDate}
              onChange={(e) => set('publishDate', e.target.value)}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Attachment (Optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            {form.attachmentUrl ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold">
                <span className="truncate flex items-center gap-1.5">
                  <Paperclip size={13} className="flex-shrink-0" />
                  {form.attachmentName || 'Attached file'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, attachmentUrl: '', attachmentName: '' }));
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-slate-400 hover:text-red-500 cursor-pointer flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-3 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/40 text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Paperclip size={14} />
                <span>Attach File / Image / PDF</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Targeting section */}
        <div className="space-y-3 pt-2">
          {form.type === 'GENERAL' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Departments</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => toggleDept('All')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                    form.targetDepartments.includes('All') ? "bg-blue-500 text-white border-blue-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  All Departments
                </button>
                {availableDepts.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDept(d)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                      form.targetDepartments.includes(d) ? "bg-blue-500 text-white border-blue-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.type === 'CLASS' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Departments *</label>
                <div className="flex flex-wrap gap-2">
                  {availableDepts.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDept(d)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                        form.targetDepartments.includes(d) ? "bg-blue-500 text-white border-blue-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Semesters *</label>
                <div className="flex flex-wrap gap-2">
                  {SEMESTERS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSemester(s)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                        form.targetSemesters.includes(s) ? "bg-violet-500 text-white border-violet-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      Semester {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <Button type="submit" loading={submitting} disabled={!form.title.trim() || !form.content.trim()} className="w-full mt-2">
          Post Announcement
        </Button>
      </form>
    </Modal>
  );
}
