// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { announcementsAPI, uploadAPI } from '../services/api';
import { timeAgo, formatDate } from '../utils/brand';
import { cn } from '../utils/cn';
import { Card, Button, Badge, Modal, Avatar } from '../components/ui';
import { SEMESTERS, getDepartmentsForUser } from '../utils/constants';
import { checkTextContent } from '../utils/moderation';
import toast from 'react-hot-toast';
import {
  Megaphone, Plus, Loader2, Trash2, Shield,
  BookOpen, Bell, Sparkles, Paperclip, FileText, X,
  Calendar, AlertTriangle, Download, ExternalLink
} from 'lucide-react';

const CAN_CREATE = ['UNIVERSITY_ADMIN', 'COORDINATION', 'TEACHER', 'SYSTEM_ADMIN'];

const TYPE_CONFIG = {
  GENERAL: { variant: 'amber', label: 'General', icon: Shield, bg: 'bg-amber-50', iconColor: 'text-amber-600', gradient: 'from-amber-500 to-orange-500' },
  CLASS: { variant: 'blue', label: 'Class', icon: BookOpen, bg: 'bg-blue-50', iconColor: 'text-blue-600', gradient: 'from-blue-500 to-indigo-500' },
};

/**
 * @typedef {Object} AnnouncementAuthor
 * @property {string|number} [id]
 * @property {string} [name]
 * @property {string} [department]
 */

/**
 * @typedef {Object} Announcement
 * @property {string|number} id
 * @property {string} title
 * @property {string} content
 * @property {'GENERAL'|'CLASS'|string} [type]
 * @property {string} [createdAt]
 * @property {AnnouncementAuthor} [author]
 * @property {string} [fileUrl]
 * @property {string} [fileName]
 * @property {string} [fileType]
 * @property {string} [attachmentUrl]
 * @property {string} [attachmentName]
 * @property {string} [publishDate]
 */

/**
 * @typedef {Object} AnnouncementForm
 * @property {string} title
 * @property {string} content
 * @property {'GENERAL'|'CLASS'} type
 * @property {string[]} targetDepartments
 * @property {(string|number)[]} targetSemesters
 */

const FILTER_TABS = [
  { value: 'ALL', label: 'All' },
  { value: 'GENERAL', label: 'General' },
  { value: 'CLASS', label: 'Class' },
];

/**
 * @param {Announcement} ann
 */
function parseAnnouncementMeta(ann) {
  const raw = ann?.content || '';
  const match = raw.match(/\n?<!--RK_META:(\{[\s\S]*?\})-->$/);
  let meta = {};
  let cleanContent = raw;
  if (match) {
    cleanContent = raw.slice(0, match.index).trim();
    try { meta = JSON.parse(match[1]); } catch { meta = {}; }
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
  const [announcements, setAnnouncements] = useState(/** @type {Announcement[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(/** @type {{ total: number, totalPages: number } | null} */ (null));
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(/** @type {Announcement | null} */ (null));
  const [deleting, setDeleting] = useState(false);

  const fetchAnnouncements = useCallback(async (p = 1) => {
    try {
      setLoading(true);
      const res = await announcementsAPI.getAll({ page: p, type: filterType !== 'ALL' ? filterType : undefined });
      setAnnouncements((prev) => (p === 1 ? res.data.announcements : [...prev, ...res.data.announcements]));
      setPagination(res.data.pagination);
      setPage(p);
    } catch (/** @type {any} */ err) {
      console.error(err);
      toast.error('Failed to load announcements.');
    } finally { setLoading(false); }
  }, [filterType]);

  useEffect(() => { fetchAnnouncements(1); }, [fetchAnnouncements]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await announcementsAPI.delete(deleteTarget.id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast.success('Announcement deleted.');
      setDeleteTarget(null);
    } catch (/** @type {any} */ err) {
      console.error(err);
      toast.error('Failed to delete.');
    } finally { setDeleting(false); }
  };

  /**
   * @param {Announcement} ann
   */
  const handleCreated = (ann) => {
    setAnnouncements((prev) => [ann, ...prev]);
    setShowCreate(false);
    toast.success('Announcement posted!');
  };

  const canCreate = CAN_CREATE.includes(user?.role);
  /**
   * @param {Announcement} ann
   */
  const isOwnerOrAdmin = (ann) => ann.author?.id === user?.id || ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN'].includes(user?.role);

  return (
    <div className="page-wrapper">
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c1a4a 0%, #1a2b6b 100%)' }}>
        <div className="absolute inset-0 banner-grid pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest block mb-2" style={{ color: '#c9973a' }}>University</span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Announcements</h1>
              <p className="text-slate-400 text-sm mt-2">
                {canCreate ? 'Post and manage official announcements' : 'Official notices and university updates'}
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
        <div className="flex gap-1 mb-6 bg-white rounded-2xl border border-slate-900/[0.06] p-1 max-w-xs shadow-sm">
          {FILTER_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={cn('flex-1 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all', filterType === t.value ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50')}
              style={filterType === t.value ? { background: 'linear-gradient(135deg, #1a2b6b, #2251b8)' } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && page === 1 ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} padding="p-5"><div className="flex gap-3"><div className="skeleton h-10 w-10 rounded-xl flex-shrink-0" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-1/2 rounded" /><div className="skeleton h-3 w-full rounded" /></div></div></Card>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <Card className="text-center py-16">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Bell size={24} className="text-amber-300" />
            </div>
            <p className="text-base font-bold text-slate-800">No announcements</p>
            <p className="text-sm text-slate-400 mt-1">{canCreate ? 'Post the first announcement.' : 'Nothing to show yet. Check back later.'}</p>
          </Card>
        ) : (
          <div className="space-y-4 stagger">
            {announcements.map((ann) => {
              const tc = TYPE_CONFIG[ann.type] || TYPE_CONFIG.GENERAL;
              const TypeIcon = tc.icon;
              const { cleanContent, attachmentUrl, attachmentName, publishDate } = parseAnnouncementMeta(ann);
              const isImageAttachment = attachmentUrl && (attachmentUrl.startsWith('data:image/') || /\.(jpe?g|png|gif|webp)(\?|$)/i.test(attachmentUrl));

              return (
                <Card key={ann.id} padding="p-0" className="overflow-hidden">
                  <div className={`h-1 bg-gradient-to-r ${tc.gradient} rounded-t-2xl`} />
                  <div className="p-5">
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
                            {ann.author?.department && (<><span className="text-slate-200">·</span><span>{ann.author.department}</span></>)}
                            <span className="text-slate-200">·</span>
                            <span className="inline-flex items-center gap-1 text-indigo-600 font-semibold"><Calendar size={11} /> Published: {formatDate(publishDate, true)}</span>
                            <span className="text-slate-200">·</span>
                            <span>({timeAgo(ann.createdAt)})</span>
                          </div>
                        </div>
                      </div>
                      {isOwnerOrAdmin(ann) && (
                        <button onClick={() => setDeleteTarget(ann)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-all flex-shrink-0" title="Delete announcement">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{cleanContent}</p>

                    {attachmentUrl && (
                      <div className="mt-3.5">
                        {isImageAttachment ? (
                          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                            <img src={attachmentUrl} alt={attachmentName} className="w-full max-h-72 object-contain bg-slate-900/5" />
                            <div className="flex items-center justify-between px-3.5 py-2 bg-white border-t border-slate-100">
                              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 truncate"><Paperclip size={13} className="text-indigo-500 flex-shrink-0" />{attachmentName}</span>
                              <a href={attachmentUrl} download={attachmentName} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 flex-shrink-0"><Download size={13} /> Download</a>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-indigo-100 bg-indigo-50/50">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0"><FileText size={16} /></div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{attachmentName}</p>
                                <p className="text-[11px] text-slate-500">Official Attachment</p>
                              </div>
                            </div>
                            <a href={attachmentUrl} download={attachmentName} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 flex-shrink-0 transition-colors">
                              {attachmentUrl.startsWith('data:') ? <Download size={12} /> : <ExternalLink size={12} />}
                              {attachmentUrl.startsWith('data:') ? 'Download' : 'Open'}
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {ann.fileUrl && (
                      ann.fileType?.startsWith('image/') ? (
                        <a href={ann.fileUrl} target="_blank" rel="noopener noreferrer" className="block mt-3">
                          <img src={ann.fileUrl} alt={ann.fileName || 'attachment'} className="max-h-80 w-auto rounded-xl border border-slate-200 hover:opacity-90 transition-opacity" />
                        </a>
                      ) : (
                        <a href={ann.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded-xl text-xs font-medium text-slate-700 hover:text-amber-700 transition-colors">
                          <FileText className="h-4 w-4 text-amber-600 flex-shrink-0" />
                          <span className="truncate flex-1">{ann.fileName || 'Attachment'}</span>
                          <span className="text-amber-600 font-bold">Download</span>
                        </a>
                      )
                    )}
                  </div>
                </Card>
              );
            })}
            {pagination && page < pagination.totalPages && (
              <div className="flex justify-center pt-2">
                <Button variant="secondary" onClick={() => fetchAnnouncements(page + 1)} loading={loading}>Load more</Button>
              </div>
            )}
          </div>
        )}

        {canCreate && (<CreateAnnouncementModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={handleCreated} userRole={user?.role} />)}

        <Modal open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)} title="Delete Announcement" icon={AlertTriangle} iconColor="bg-red-500">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Are you sure you want to delete <span className="font-bold text-slate-900">"{deleteTarget?.title}"</span>?</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
              <Button variant="danger" onClick={confirmDelete} loading={deleting} icon={Trash2}>Delete</Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

/**
 * @param {{ open: boolean, onClose: () => void, onCreated: (ann: Announcement) => void, userRole?: string }} props
 */
function CreateAnnouncementModal({ open, onClose, onCreated, userRole }) {
  const { user } = useAuth();
  const availableDepts = getDepartmentsForUser(user);
  const defaultType = userRole === 'TEACHER' ? 'CLASS' : 'GENERAL';
  const [form, setForm] = useState(/** @type {AnnouncementForm} */ ({
    title: '',
    content: '',
    type: defaultType,
    targetDepartments: [],
    targetSemesters: [],
  }));
  const [submitting, setSubmitting] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);

  /**
   * @param {'title' | 'content' | 'type' | 'targetDepartments' | 'targetSemesters'} k
   * @param {any} v
   */
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  /**
   * @param {string} d
   */
  const toggleDept = (d) => {
    setForm((f) => {
      const depts = f.targetDepartments.includes(d)
        ? f.targetDepartments.filter((x) => x !== d)
        : [...f.targetDepartments, d];
      return { ...f, targetDepartments: depts };
    });
  };

  /**
   * @param {string|number} s
   */
  const toggleSemester = (s) => {
    setForm((f) => {
      const sems = f.targetSemesters.includes(s)
        ? f.targetSemesters.filter((x) => x !== s)
        : [...f.targetSemesters, s];
      return { ...f, targetSemesters: sems };
    });
  };

  /**
   * @param {Event & { target: HTMLInputElement }} e
   */
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const res = await uploadAPI.upload(file);
      setAttachment(res.data);
      toast.success('File uploaded!');
    } catch (/** @type {{ response?: { data?: { error?: string } } }} */ err) {
      toast.error(err.response?.data?.error || 'Upload failed.');
    } finally { setUploading(false); e.target.value = ''; }
  };

  /**
   * @param {Event} e
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const titleCheck = checkTextContent(form.title, { minLength: 3, fieldName: 'Announcement title' });
    if (!titleCheck.clean) return toast.error(titleCheck.reason || 'Announcement title is invalid.');

    const contentCheck = checkTextContent(form.content, { minLength: 5, fieldName: 'Announcement content' });
    if (!contentCheck.clean) return toast.error(contentCheck.reason || 'Announcement content is invalid.');
    
    if (form.type === 'CLASS') {
      if (form.targetDepartments.length === 0) return toast.error('Please select at least one department');
      if (form.targetSemesters.length === 0) return toast.error('Please select at least one semester');
    }

    try {
      setSubmitting(true);
      const payload = { ...form, fileUrl: attachment?.url, fileName: attachment?.fileName, fileType: attachment?.fileType };
      const res = await announcementsAPI.create(payload);
      onCreated(res.data.announcement);
      setForm({ title: '', content: '', type: defaultType, targetDepartments: [], targetSemesters: [] });
      setAttachment(null);
    } catch (/** @type {{ response?: { data?: { error?: string } } }} */ err) {
      toast.error(err.response?.data?.error || 'Failed to post announcement.');
    } finally { setSubmitting(false); }
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all';

  return (
    <Modal open={open} onClose={onClose} title="Post Announcement" subtitle="Reach your audience with attachments" icon={Sparkles} iconColor="bg-gradient-to-br from-amber-500 to-orange-600">
      <form onSubmit={handleSubmit} className="space-y-4">
        {userRole !== 'TEACHER' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Type</label>
            <div className="flex gap-2">
              {['GENERAL', 'CLASS'].map((t) => (
                <button key={t} type="button" onClick={() => set('type', t)} className={cn('flex-1 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all', form.type === t ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300')}>
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

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Attachment <span className="text-slate-400 normal-case font-medium">(optional)</span></label>
          {attachment ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
              <FileText className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="text-xs font-medium text-amber-700 truncate flex-1">{attachment.fileName}</span>
              <button type="button" onClick={() => setAttachment(null)} className="p-1 text-amber-600 hover:text-red-500 hover:bg-red-50 rounded cursor-pointer transition-colors"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-xl cursor-pointer transition-colors">
              <Paperclip className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500">{uploading ? 'Uploading...' : 'Click to attach a file'}</span>
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" />
            </label>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Departments *</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => toggleDept('All')} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer", form.targetDepartments.includes('All') ? "bg-blue-500 text-white border-blue-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100")}>All Departments</button>
              {availableDepts.map(d => (
                <button key={d} type="button" onClick={() => toggleDept(d)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer", form.targetDepartments.includes(d) ? "bg-blue-500 text-white border-blue-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100")}>{d}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Semesters *</label>
            <div className="flex flex-wrap gap-2">
              {SEMESTERS.map(s => (
                <button key={s} type="button" onClick={() => toggleSemester(s)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer", form.targetSemesters.includes(s) ? "bg-violet-500 text-white border-violet-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100")}>Semester {s}</button>
              ))}
            </div>
          </div>
        </div>

        <Button type="submit" loading={submitting} disabled={!form.title.trim() || !form.content.trim()} className="w-full mt-2">Post Announcement</Button>
      </form>
    </Modal>
  );
}