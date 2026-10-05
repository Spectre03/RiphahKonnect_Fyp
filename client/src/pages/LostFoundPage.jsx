import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { lostFoundAPI } from '../services/api';
import { Card, Button, Badge, Modal } from '../components/ui';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';
import {
  Search, Plus, MapPin, Tag,
  CheckCircle2, PackageSearch, Trash2, Phone,
  Filter, AlertCircle,
} from 'lucide-react';

const CATEGORIES   = ['ELECTRONICS', 'BOOKS', 'CLOTHING', 'DOCUMENTS', 'ACCESSORIES', 'OTHER'];
const CAN_REPORT   = ['STUDENT', 'TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN'];
const CAN_RESOLVE  = ['COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'];

const STATUS_CONFIG = {
  LOST:     { variant: 'red',    label: 'Lost',     dot: true,  bg: 'bg-red-50',     icon: AlertCircle, iconColor: 'text-red-500' },
  FOUND:    { variant: 'teal',   label: 'Found',    dot: true,  bg: 'bg-teal-50',    icon: CheckCircle2, iconColor: 'text-teal-600' },
  RESOLVED: { variant: 'slate',  label: 'Resolved', dot: false, bg: 'bg-slate-50',   icon: CheckCircle2, iconColor: 'text-slate-400' },
};

export default function LostFoundPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState({ status: '', category: '', search: '' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchItems = async (p = 1) => {
    try {
      setLoading(true);
      const res = await lostFoundAPI.getAll(p, filters);
      setItems(p === 1 ? res.data.items : [...items, ...res.data.items]);
      setPagination(res.data.pagination);
      setPage(p);
    } catch { toast.error('Failed to load items.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(1); }, [filters.status, filters.category]);

  const handleSearch = (e) => { e.preventDefault(); fetchItems(1); };

  const handleResolve = async (itemId) => {
    if (!confirm('Mark this item as resolved?')) return;
    try {
      await lostFoundAPI.resolve(itemId);
      setItems(items.map((i) => i.id === itemId ? { ...i, status: 'RESOLVED' } : i));
      toast.success('Item marked as resolved!');
    } catch { toast.error('Failed to resolve item.'); }
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Delete this item?')) return;
    try {
      await lostFoundAPI.delete(itemId);
      setItems(items.filter((i) => i.id !== itemId));
      toast.success('Item deleted.');
    } catch { toast.error('Failed to delete item.'); }
  };

  const handleCreated = (item) => {
    setItems([item, ...items]);
    setShowCreate(false);
    toast.success('Item reported!');
  };

  const canReport  = CAN_REPORT.includes(user?.role);
  const canResolve = CAN_RESOLVE.includes(user?.role);

  return (
    <div className="page-wrapper">
      {/* ── Gradient Banner ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)' }}>
        <div className="absolute inset-0 banner-grid pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-20 -top-16 w-72 h-72 rounded-full bg-white/[0.07] blur-3xl" />
          <div className="absolute -left-16 bottom-0 w-64 h-64 rounded-full bg-white/[0.05] blur-3xl" />
          <div className="absolute top-0 left-1/2 w-72 h-40 rounded-full bg-emerald-300/[0.12] blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-teal-200 block mb-2">Campus Services</span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Lost &amp; Found</h1>
              <p className="text-teal-100 text-sm mt-2">
                {canReport ? 'Report or find lost items on campus' : 'Review and resolve reports'}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {pagination && (
                <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 animate-popIn">
                  <PackageSearch className="h-5 w-5 text-teal-200" />
                  <div>
                    <span className="text-2xl font-extrabold text-white leading-none">{pagination.total}</span>
                    <p className="text-[11px] text-teal-300 font-medium">Reports</p>
                  </div>
                </div>
              )}
              {canReport && (
                <Button icon={Plus} onClick={() => setShowCreate(true)} className="bg-white text-teal-700 hover:bg-teal-50 border-0 shadow-lg">Report Item</Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Filters ── */}
        <Card padding="p-3" className="mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search items..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:bg-white transition-all"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 focus:border-indigo-500 focus:outline-none transition-all"
            >
              <option value="">All Status</option>
              <option value="LOST">Lost</option>
              <option value="FOUND">Found</option>
              <option value="RESOLVED">Resolved</option>
            </select>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 focus:border-indigo-500 focus:outline-none transition-all"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
              ))}
            </select>
            <button
              type="submit"
              className="flex-shrink-0 h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <Filter size={15} />
            </button>
          </form>
        </Card>

        {/* ── Items Grid ── */}
        {loading && page === 1 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} padding="p-5">
                <div className="space-y-2.5">
                  <div className="flex gap-2">
                    <div className="skeleton h-5 w-16 rounded-full" />
                    <div className="skeleton h-5 w-20 rounded-full" />
                  </div>
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-full rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="text-center py-16">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <PackageSearch size={24} className="text-amber-300" />
            </div>
            <p className="text-base font-bold text-slate-800">No items found</p>
            <p className="text-sm text-slate-400 mt-1">
              {canReport ? 'Report a lost or found item.' : 'No reports match your filters.'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
            {items.map((item) => {
              const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.LOST;
              const StatusIcon = sc.icon;
              const isOwner = item.reportedById === user?.id || item.reportedBy?.id === user?.id;
              const isResolved = item.status === 'RESOLVED';

              return (
                <Card key={item.id} hover padding="p-0">
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold', sc.bg, sc.iconColor)}>
                        <StatusIcon size={11} />
                        {sc.label}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                        <Tag size={11} />
                        {item.category.charAt(0) + item.category.slice(1).toLowerCase()}
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mb-1.5">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{item.description}</p>
                    )}

                    <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-slate-400 font-medium">
                      {item.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin size={11} className="flex-shrink-0" /> {item.location}
                        </span>
                      )}
                      {item.contactInfo && (
                        <span className="flex items-center gap-1 truncate">
                          <Phone size={11} className="flex-shrink-0" /> {item.contactInfo}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-3 text-[11px] text-slate-400">
                      <span>by</span>
                      <span className="font-bold text-slate-600">{item.reportedBy?.name}</span>
                      <span className="text-slate-200">·</span>
                      <span>{new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>

                  {!isResolved && (isOwner || canResolve) && (
                    <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-50 bg-slate-50/40 rounded-b-2xl flex-wrap">
                      {canResolve && (
                        <button
                          onClick={() => handleResolve(item.id)}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                        >
                          <CheckCircle2 size={13} /> Mark Resolved
                        </button>
                      )}
                      {isOwner && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg cursor-pointer transition-all ml-auto"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {pagination && page < pagination.totalPages && (
          <div className="flex justify-center pt-6">
            <Button variant="secondary" onClick={() => fetchItems(page + 1)} loading={loading}>Load More</Button>
          </div>
        )}

        {canReport && (
          <CreateItemModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
        )}
      </div>
    </div>
  );
}

function CreateItemModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', status: 'LOST', category: 'OTHER', location: '', contactInfo: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      setSubmitting(true);
      const res = await lostFoundAPI.create(form);
      onCreated(res.data.item);
      setForm({ title: '', description: '', status: 'LOST', category: 'OTHER', location: '', contactInfo: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to report item.');
    } finally { setSubmitting(false); }
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all';

  return (
    <Modal open={open} onClose={onClose} title="Report Item" subtitle="Help the community find lost items" icon={PackageSearch} iconColor="bg-gradient-to-br from-amber-500 to-orange-600">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Type *</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
              <option value="LOST">Lost</option>
              <option value="FOUND">Found</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Category</label>
            <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Title *</label>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Black iPhone 14 Pro" className={inputCls} required />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Description</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe the item in detail..." rows={3} className={`${inputCls} resize-none`} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Location</label>
            <input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Where lost/found?" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Contact</label>
            <input value={form.contactInfo} onChange={(e) => set('contactInfo', e.target.value)} placeholder="Phone or email" className={inputCls} />
          </div>
        </div>
        <Button type="submit" loading={submitting} disabled={!form.title.trim()} className="w-full">
          Report Item
        </Button>
      </form>
    </Modal>
  );
}

// === [SPEC-BLOCK-START] Moiz-A-48 (2026-10-05T13:20:19+05:00) ===
// [Moiz-A-48-L1] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #87
// [Moiz-A-48-L2] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #106
// [Moiz-A-48-L3] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #125
// [Moiz-A-48-L4] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #144
// [Moiz-A-48-L5] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #163
// [Moiz-A-48-L6] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #182
// [Moiz-A-48-L7] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #201
// [Moiz-A-48-L8] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #220
// [Moiz-A-48-L9] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #239
// [Moiz-A-48-L10] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #258
// [Moiz-A-48-L11] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #277
// [Moiz-A-48-L12] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #296
// [Moiz-A-48-L13] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #315
// [Moiz-A-48-L14] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #334
// [Moiz-A-48-L15] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #353
// [Moiz-A-48-L16] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #372
// [Moiz-A-48-L17] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #391
// [Moiz-A-48-L18] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #410
// [Moiz-A-48-L19] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #429
// [Moiz-A-48-L20] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #448
// [Moiz-A-48-L21] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #467
// [Moiz-A-48-L22] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #486
// [Moiz-A-48-L23] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #505
// [Moiz-A-48-L24] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #524
// [Moiz-A-48-L25] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #543
// [Moiz-A-48-L26] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #562
// [Moiz-A-48-L27] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #581
// [Moiz-A-48-L28] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #600
// [Moiz-A-48-L29] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #619
// [Moiz-A-48-L30] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #638
// [Moiz-A-48-L31] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #657
// [Moiz-A-48-L32] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #676
// [Moiz-A-48-L33] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #695
// [Moiz-A-48-L34] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #714
// [Moiz-A-48-L35] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #733
// [Moiz-A-48-L36] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #752
// [Moiz-A-48-L37] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #771
// [Moiz-A-48-L38] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #790
// [Moiz-A-48-L39] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #809
// [Moiz-A-48-L40] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #828
// [Moiz-A-48-L41] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #847
// [Moiz-A-48-L42] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #866
// [Moiz-A-48-L43] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #885
// [Moiz-A-48-L44] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #904
// [Moiz-A-48-L45] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #923
// [Moiz-A-48-L46] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #942
// [Moiz-A-48-L47] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #961
// [Moiz-A-48-L48] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #980
// [Moiz-A-48-L49] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #2
// [Moiz-A-48-L50] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #21
// [Moiz-A-48-L51] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #40
// [Moiz-A-48-L52] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #59
// [Moiz-A-48-L53] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #78
// [Moiz-A-48-L54] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #97
// [Moiz-A-48-L55] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #116
// [Moiz-A-48-L56] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #135
// [Moiz-A-48-L57] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #154
// [Moiz-A-48-L58] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #173
// [Moiz-A-48-L59] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #192
// [Moiz-A-48-L60] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #211
// [Moiz-A-48-L61] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #230
// [Moiz-A-48-L62] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #249
// [Moiz-A-48-L63] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #268
// [Moiz-A-48-L64] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #287
// [Moiz-A-48-L65] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #306
// [Moiz-A-48-L66] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #325
// [Moiz-A-48-L67] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #344
// [Moiz-A-48-L68] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #363
// [Moiz-A-48-L69] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #382
// [Moiz-A-48-L70] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #401
// [Moiz-A-48-L71] Add Resolved status badge and filter tab on LostFoundPage :: verification rule #420
// === [SPEC-BLOCK-END] ===
