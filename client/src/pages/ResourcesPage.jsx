import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { Card, Button, Badge, Modal } from '../components/ui';
import { DEPARTMENTS, SEMESTERS, getDepartmentsForUser } from '../utils/constants';
import toast from 'react-hot-toast';
import {
  FileText, BookOpen, Upload, Search, Download,
  Trash2, Filter, Plus, Loader2, File, Link2,
  GraduationCap, Hash, ChevronLeft, ChevronRight,
  BookMarked, Presentation, ClipboardList, Newspaper,
} from 'lucide-react';

const RESOURCE_TYPES = [
  { key: '',          label: 'All',          icon: BookOpen },
  { key: 'NOTES',     label: 'Notes',        icon: FileText },
  { key: 'PAST_PAPER',label: 'Past Papers',  icon: ClipboardList },
  { key: 'SLIDES',    label: 'Slides',       icon: Presentation },
  { key: 'BOOK',      label: 'Books',        icon: BookMarked },
  { key: 'OTHER',     label: 'Other',        icon: File },
];

const TYPE_META = {
  NOTES:      { label: 'Notes',       color: 'bg-blue-100 text-blue-700',    icon: FileText,      border: 'border-blue-200' },
  PAST_PAPER: { label: 'Past Paper',  color: 'bg-amber-100 text-amber-700',  icon: ClipboardList, border: 'border-amber-200' },
  SLIDES:     { label: 'Slides',      color: 'bg-violet-100 text-violet-700',icon: Presentation,  border: 'border-violet-200' },
  BOOK:       { label: 'Book',        color: 'bg-teal-100 text-teal-700',    icon: BookMarked,    border: 'border-teal-200' },
  OTHER:      { label: 'Other',       color: 'bg-slate-100 text-slate-600',  icon: File,          border: 'border-slate-200' },
};

const DEPT_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-teal-500 to-emerald-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600',
];

function deptGrad(dept = '') {
  let h = 0;
  for (let i = 0; i < dept.length; i++) h = (h << 5) - h + dept.charCodeAt(i);
  return DEPT_GRADIENTS[Math.abs(h) % DEPT_GRADIENTS.length];
}

const CAN_UPLOAD = ['STUDENT', 'TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN'];

// Simulated local resource store (replaces API until backend is wired)
let _store = [];
let _nextId = 1;

function storeAdd(resource) {
  const item = { ...resource, id: String(_nextId++), createdAt: new Date().toISOString(), downloads: 0 };
  _store = [item, ..._store];
  return item;
}
function storeDelete(id) { _store = _store.filter((r) => r.id !== id); }
function storeQuery({ search, department, semester, type, page = 1, limit = 12 }) {
  let list = [..._store];
  if (search)     list = list.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()) || r.subject.toLowerCase().includes(search.toLowerCase()));
  if (department) list = list.filter((r) => r.department === department);
  if (semester)   list = list.filter((r) => String(r.semester) === String(semester));
  if (type)       list = list.filter((r) => r.type === type);
  const total = list.length;
  const totalPages = Math.ceil(total / limit) || 1;
  return { items: list.slice((page - 1) * limit, page * limit), total, totalPages };
}

export default function ResourcesPage() {
  const { user } = useAuth();
  const [resources,   setResources]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [pagination,  setPagination]  = useState(null);
  const [page,        setPage]        = useState(1);
  const [typeFilter,  setTypeFilter]  = useState('');
  const [deptFilter,  setDeptFilter]  = useState(
    user?.role === 'STUDENT' && user?.department ? user.department : ''
  );
  const [semFilter,   setSemFilter]   = useState(
    user?.role === 'STUDENT' && user?.semester ? String(user.semester) : ''
  );
  const [search,      setSearch]      = useState('');
  const [applied,     setApplied]     = useState({ search: '', department: deptFilter, semester: semFilter, type: '' });
  const [showUpload,  setShowUpload]  = useState(false);
  const [deleting,    setDeleting]    = useState({});

  const load = (p = 1, filters = applied) => {
    setLoading(true);
    setTimeout(() => {
      const res = storeQuery({ ...filters, page: p });
      setResources(res.items);
      setPagination({ total: res.total, totalPages: res.totalPages });
      setPage(p);
      setLoading(false);
    }, 200);
  };

  useEffect(() => { load(1, applied); }, [applied]);

  const handleSearch = (e) => {
    e.preventDefault();
    setApplied({ search, department: deptFilter, semester: semFilter, type: typeFilter });
  };

  const handleTypeTab = (key) => {
    setTypeFilter(key);
    setApplied((prev) => ({ ...prev, type: key }));
  };

  const handleUploaded = (resource) => {
    storeAdd({ ...resource, uploaderName: user?.name, uploaderId: user?.id, uploaderRole: user?.role });
    setShowUpload(false);
    toast.success('Resource uploaded!');
    load(1, applied);
  };

  const handleDelete = (id) => {
    if (!confirm('Remove this resource?')) return;
    setDeleting((p) => ({ ...p, [id]: true }));
    setTimeout(() => {
      storeDelete(id);
      toast.success('Resource removed.');
      setDeleting((p) => ({ ...p, [id]: false }));
      load(page, applied);
    }, 300);
  };

  const handleDownload = (resource) => {
    if (resource.link) {
      window.open(resource.link, '_blank', 'noopener,noreferrer');
    } else {
      toast('No download link attached.', { icon: 'ℹ️' });
    }
    _store = _store.map((r) => r.id === resource.id ? { ...r, downloads: r.downloads + 1 } : r);
  };

  const canUpload   = CAN_UPLOAD.includes(user?.role);
  const totalPages  = pagination?.totalPages || 1;

  return (
    <div className="page-wrapper">

      {/* Banner */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)' }}>
        <div className="absolute inset-0 banner-grid pointer-events-none opacity-30" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-white/[0.07] blur-3xl" />
          <div className="absolute -left-12 bottom-0 w-60 h-60 rounded-full bg-indigo-300/[0.08] blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-sky-200 block mb-2">Academic</span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Study Resources</h1>
              <p className="text-sky-100 text-sm mt-2">
                {canUpload ? 'Upload and share notes, past papers, and slides' : 'Browse shared academic resources'}
                {pagination && <span className="ml-2 text-sky-300">· {pagination.total} resources</span>}
              </p>
            </div>
            {canUpload && (
              <Button icon={Upload} onClick={() => setShowUpload(true)} className="bg-white text-sky-700 hover:bg-sky-50 border-0 shadow-lg flex-shrink-0">
                Upload
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* Type tabs */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {RESOURCE_TYPES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleTypeTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border',
                typeFilter === key
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <Card padding="p-3" className="mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or subject..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:bg-white transition-all"
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 focus:border-indigo-500 focus:outline-none transition-all"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={semFilter}
              onChange={(e) => setSemFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 focus:border-indigo-500 focus:outline-none transition-all"
            >
              <option value="">All Semesters</option>
              {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
            </select>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm flex-shrink-0"
            >
              <Filter size={14} /> Filter
            </button>
          </form>
        </Card>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} padding="p-5">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="skeleton h-10 w-10 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-3/4 rounded" />
                      <div className="skeleton h-3 w-1/2 rounded" />
                    </div>
                  </div>
                  <div className="skeleton h-3 w-full rounded" />
                  <div className="skeleton h-3 w-2/3 rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : resources.length === 0 ? (
          <Card className="text-center py-20">
            <div className="h-14 w-14 rounded-2xl bg-sky-50 flex items-center justify-center mx-auto mb-4">
              <BookOpen size={24} className="text-sky-300" />
            </div>
            <p className="text-base font-bold text-slate-800">No resources found</p>
            <p className="text-sm text-slate-400 mt-1">
              {canUpload ? 'Be the first to upload a resource.' : 'Try adjusting your filters.'}
            </p>
            {canUpload && (
              <button
                onClick={() => setShowUpload(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                <Upload size={14} /> Upload Resource
              </button>
            )}
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {resources.map((res) => {
                const meta  = TYPE_META[res.type] || TYPE_META.OTHER;
                const Icon  = meta.icon;
                const grad  = deptGrad(res.department);
                const isDel = deleting[res.id];
                const isOwn = res.uploaderId === user?.id;
                const canDel = isOwn || ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN'].includes(user?.role);

                return (
                  <Card key={res.id} padding="p-0" className="hover:shadow-md transition-shadow group">
                    <div className={`h-1 bg-gradient-to-r ${grad} rounded-t-2xl`} />
                    <div className="p-5">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow`}>
                          <Icon size={18} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 truncate leading-snug">{res.title}</h3>
                          <p className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">{res.subject}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border', meta.color, meta.border)}>
                          {meta.label}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-indigo-600 font-bold">
                          <GraduationCap size={10} /> {res.department}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                          <Hash size={9} /> Sem {res.semester}
                        </span>
                      </div>

                      {res.description && (
                        <p className="text-xs text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">{res.description}</p>
                      )}

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">{res.uploaderName}</p>
                          <p className="text-[10px] text-slate-300">{res.downloads} downloads</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDownload(res)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-all cursor-pointer"
                          >
                            <Download size={11} /> Open
                          </button>
                          {canDel && (
                            <button
                              onClick={() => handleDelete(res.id)}
                              disabled={isDel}
                              className="p-1.5 rounded-xl text-red-400 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isDel ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Page <span className="font-semibold text-slate-700">{page}</span> of{' '}
                  <span className="font-semibold text-slate-700">{totalPages}</span>
                  {' '}· {pagination?.total} resources
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => load(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    onClick={() => load(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {canUpload && (
        <UploadModal
          open={showUpload}
          onClose={() => setShowUpload(false)}
          onUploaded={handleUploaded}
          user={user}
        />
      )}
    </div>
  );
}

function UploadModal({ open, onClose, onUploaded, user }) {
  const availableDepts = getDepartmentsForUser(user);
  const [form, setForm] = useState({
    title: '', subject: '', description: '', link: '',
    type: 'NOTES', department: '', semester: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.subject.trim() || !form.department || !form.semester) return;
    setSubmitting(true);
    setTimeout(() => {
      onUploaded({ ...form, semester: parseInt(form.semester) });
      setForm({ title: '', subject: '', description: '', link: '', type: 'NOTES', department: '', semester: '' });
      setSubmitting(false);
    }, 400);
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all';

  return (
    <Modal open={open} onClose={onClose} title="Upload Resource" subtitle="Share notes, past papers or slides" icon={Upload} iconColor="bg-gradient-to-br from-sky-500 to-indigo-600">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Title *</label>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Data Structures Mid Notes" className={inputCls} required />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Subject *</label>
          <input value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="e.g. Data Structures & Algorithms" className={inputCls} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Type *</label>
            <select value={form.type} onChange={(e) => set('type', e.target.value)} className={inputCls}>
              <option value="NOTES">Notes</option>
              <option value="PAST_PAPER">Past Paper</option>
              <option value="SLIDES">Slides</option>
              <option value="BOOK">Book</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Semester *</label>
            <select value={form.semester} onChange={(e) => set('semester', e.target.value)} className={inputCls} required>
              <option value="">Select</option>
              {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Department *</label>
          <select value={form.department} onChange={(e) => set('department', e.target.value)} className={inputCls} required>
            <option value="">Select department</option>
            {availableDepts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            <span className="flex items-center gap-1"><Link2 size={11} /> Link / URL</span>
          </label>
          <input value={form.link} onChange={(e) => set('link', e.target.value)} placeholder="Google Drive, OneDrive, or any URL..." className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Description</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What does this cover?" rows={3} className={`${inputCls} resize-none`} />
        </div>
        <Button
          type="submit"
          loading={submitting}
          disabled={!form.title.trim() || !form.subject.trim() || !form.department || !form.semester}
          className="w-full"
        >
          Upload Resource
        </Button>
      </form>
    </Modal>
  );
}

