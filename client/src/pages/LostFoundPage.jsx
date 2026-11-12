import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { lostFoundAPI } from '../services/api';
import { Card, Button, Modal } from '../components/ui';
import { cn } from '../utils/cn';
import { checkTextContent, validateImageFile, fileToDataUrl } from '../utils/moderation';
import toast from 'react-hot-toast';
import {
  Search, Plus, MapPin, Tag,
  CheckCircle2, PackageSearch, Trash2, Phone,
  Filter, AlertCircle, Clock, Image as ImageIcon, MessageSquare, ShieldCheck,
} from 'lucide-react';

const CATEGORIES  = ['ELECTRONICS', 'BOOKS', 'CLOTHING', 'DOCUMENTS', 'ACCESSORIES', 'OTHER'];
const CAN_REPORT  = ['STUDENT', 'TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'];
const CAN_RESOLVE = ['TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'];

const STATUS_CONFIG = {
  LOST:     { variant: 'red',   label: 'Lost',     dot: true,  bg: 'bg-red-50',   icon: AlertCircle,  iconColor: 'text-red-500' },
  FOUND:    { variant: 'teal',  label: 'Found',    dot: true,  bg: 'bg-teal-50',  icon: CheckCircle2, iconColor: 'text-teal-600' },
  RESOLVED: { variant: 'slate', label: 'Resolved', dot: false, bg: 'bg-slate-50', icon: CheckCircle2, iconColor: 'text-slate-400' },
};

export default function LostFoundPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState({ status: '', category: '', search: '' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'resolve' | 'delete', item }
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const fetchItems = async (p = 1) => {
    try {
      setLoading(true);
      const res = await lostFoundAPI.getAll(p, filters);
      setItems(p === 1 ? res.data.items : [...items, ...res.data.items]);
      setPagination(res.data.pagination);
      setPage(p);
    } catch {
      toast.error('Failed to load items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(1); }, [filters.status, filters.category]);

  const handleSearch = (e) => { e.preventDefault(); fetchItems(1); };

  const executeConfirmAction = async () => {
    if (!confirmAction?.item) return;
    const { type, item } = confirmAction;
    try {
      setActionSubmitting(true);
      if (type === 'resolve') {
        await lostFoundAPI.resolve(item.id);
        setItems(items.map((i) => (i.id === item.id ? { ...i, status: 'RESOLVED' } : i)));
        toast.success('Item marked as resolved!');
      } else if (type === 'delete') {
        await lostFoundAPI.delete(item.id);
        setItems(items.filter((i) => i.id !== item.id));
        toast.success('Item deleted.');
      }
      setConfirmAction(null);
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to ${type} item.`);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleInquire = (item) => {
    const reporterId = item.reportedBy?.id || item.reportedById;
    if (!reporterId) {
      toast.error('Reporter user profile is unavailable.');
      return;
    }
    const actionText =
      item.status === 'LOST'
        ? `Assalam-o-Alaikum ${item.reportedBy?.name || ''}, I saw your Lost report for "${item.title}"${item.location ? ` near ${item.location}` : ''}. I have an update / found it — let's coordinate!`
        : `Assalam-o-Alaikum ${item.reportedBy?.name || ''}, I am inquiring about the Found item "${item.title}"${item.location ? ` (${item.location})` : ''}. Could we verify and coordinate its return?`;
    navigate(`/messages?userId=${reporterId}&inquire=${encodeURIComponent(actionText)}`);
  };

  const handleCreated = (item) => {
    setItems([item, ...items]);
    setShowCreate(false);
    toast.success('Item reported! Teachers & Coordinators have been notified.');
  };

  const canReport  = !user?.role || CAN_REPORT.includes(user?.role);
  const canResolve = CAN_RESOLVE.includes(user?.role);

  return (
    <div className="page-wrapper">
      {/* ── Gradient Banner ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c1a4a 0%, #1a2b6b 100%)' }}>
        <div className="absolute inset-0 banner-grid pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-20 -top-16 w-72 h-72 rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(201,151,58,0.08) 0%, transparent 70%)' }} />
          <div className="absolute -left-16 bottom-0 w-64 h-64 rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(26,43,107,0.5) 0%, transparent 70%)' }} />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 relative z-10">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest block mb-2" style={{ color: '#c9973a' }}>Campus Services</span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Lost &amp; Found</h1>
              <p className="text-slate-400 text-sm mt-2">
                Report lost or found items — teachers and coordinators are automatically notified
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {pagination && (
                <div className="hidden sm:flex items-center gap-2 backdrop-blur-sm border rounded-2xl px-4 py-3 animate-popIn" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  <PackageSearch className="h-5 w-5" style={{ color: '#c9973a' }} />
                  <div>
                    <span className="text-2xl font-extrabold text-white leading-none">{pagination.total}</span>
                    <p className="text-[11px] font-medium" style={{ color: '#c9973a' }}>Reports</p>
                  </div>
                </div>
              )}
              {canReport && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-md"
                  style={{ background: '#c9973a', color: '#0c1a4a' }}
                >
                  <Plus size={15} /> Report Lost / Found Item
                </button>
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
                placeholder="Search items by title, description, or location..."
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
              className="flex-shrink-0 h-10 w-10 rounded-xl text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-sm"
              style={{ background: 'linear-gradient(135deg, #1a2b6b, #2251b8)' }}
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
              <PackageSearch size={24} className="text-amber-400" />
            </div>
            <p className="text-base font-bold text-slate-800">No items found</p>
            <p className="text-sm text-slate-400 mt-1 mb-4">
              Report a lost or found item to alert campus staff and students.
            </p>
            {canReport && (
              <Button onClick={() => setShowCreate(true)} icon={Plus}>
                Report Lost or Found Item
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
            {items.map((item) => {
              const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.LOST;
              const StatusIcon = sc.icon;
              const isOwner = item.reportedById === user?.id || item.reportedBy?.id === user?.id;
              const isResolved = item.status === 'RESOLVED';

              return (
                <Card key={item.id} hover padding="p-0" className="flex flex-col justify-between">
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold', sc.bg, sc.iconColor)}>
                        <StatusIcon size={11} />
                        {sc.label}
                      </div>
                      <div className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold',
                        isResolved ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'
                      )}>
                        {isResolved ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                        {isResolved ? 'Resolved' : 'Active'}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold ml-auto">
                        <Tag size={11} />
                        {(item.category || 'OTHER').charAt(0) + (item.category || 'OTHER').slice(1).toLowerCase()}
                      </div>
                    </div>

                    {item.imageUrl && (
                      <div className="mb-3 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                        <img src={item.imageUrl} alt={item.title} className="w-full h-44 object-cover" />
                      </div>
                    )}

                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mb-1.5">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{item.description}</p>
                    )}

                    <div className="flex flex-wrap gap-3 mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
                      {item.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin size={11} className="flex-shrink-0 text-[#1a2b6b]" /> {item.location}
                        </span>
                      )}
                      {item.contactInfo && (
                        <span className="flex items-center gap-1 truncate">
                          <Phone size={11} className="flex-shrink-0 text-emerald-600" /> {item.contactInfo}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-slate-400">
                      <span>Reported by</span>
                      <span className="font-bold text-slate-700">{item.reportedBy?.name || 'Campus Member'}</span>
                      {item.reportedBy?.department && (
                        <span className="text-slate-400">({item.reportedBy.department})</span>
                      )}
                      <span className="text-slate-300">·</span>
                      <span>{new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Action Footer: Message/Inquire, Mark Resolved, Delete */}
                  <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl flex-wrap">
                    {!isOwner && !isResolved && (
                      <button
                        type="button"
                        onClick={() => handleInquire(item)}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-white px-3 py-1.5 rounded-lg cursor-pointer transition-all shadow-sm"
                        style={{ background: 'linear-gradient(135deg, #1a2b6b, #2251b8)' }}
                      >
                        <MessageSquare size={12} />
                        {item.status === 'LOST' ? 'I Found This / Inquire' : 'Claim / Message Reporter'}
                      </button>
                    )}

                    {!isResolved && (isOwner || canResolve) && (
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ type: 'resolve', item })}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                      >
                        <CheckCircle2 size={12} /> Mark Resolved
                      </button>
                    )}

                    {(isOwner || canResolve) && (
                      <button
                        type="button"
                        onClick={() => setConfirmAction({ type: 'delete', item })}
                        className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ml-auto"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </div>
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
          <CreateItemModal
            open={showCreate}
            onClose={() => setShowCreate(false)}
            onCreated={handleCreated}
            defaultContact={user?.email || ''}
          />
        )}

        {/* Confirmation Pop-up Modal for Resolve / Delete */}
        <Modal
          open={!!confirmAction}
          onClose={() => !actionSubmitting && setConfirmAction(null)}
          title={confirmAction?.type === 'resolve' ? 'Mark Item as Resolved' : 'Delete Lost & Found Report'}
          subtitle={
            confirmAction?.type === 'resolve'
              ? 'Confirm that this item has been returned or resolved'
              : 'This action will permanently remove this report'
          }
          icon={confirmAction?.type === 'resolve' ? CheckCircle2 : Trash2}
          iconColor={
            confirmAction?.type === 'resolve'
              ? 'bg-gradient-to-br from-teal-500 to-emerald-600'
              : 'bg-gradient-to-br from-red-500 to-rose-600'
          }
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              {confirmAction?.type === 'resolve' ? (
                <>
                  Are you sure you want to mark{' '}
                  <span className="font-bold text-slate-900">&ldquo;{confirmAction?.item?.title}&rdquo;</span> as{' '}
                  <span className="font-bold text-teal-700">Resolved</span>?
                </>
              ) : (
                <>
                  Are you sure you want to delete{' '}
                  <span className="font-bold text-slate-900">&ldquo;{confirmAction?.item?.title}&rdquo;</span>? This cannot be undone.
                </>
              )}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmAction(null)}
                disabled={actionSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={confirmAction?.type === 'resolve' ? 'primary' : 'danger'}
                onClick={executeConfirmAction}
                loading={actionSubmitting}
                icon={confirmAction?.type === 'resolve' ? CheckCircle2 : Trash2}
              >
                {confirmAction?.type === 'resolve' ? 'Confirm Resolved' : 'Delete Report'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

function CreateItemModal({ open, onClose, onCreated, defaultContact = '' }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'LOST',
    category: 'ELECTRONICS',
    location: '',
    contactInfo: defaultContact,
    imageUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (defaultContact && !form.contactInfo) {
      setForm((f) => ({ ...f, contactInfo: defaultContact }));
    }
  }, [defaultContact]);

  const handleImageChange = async (e) => {
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
      set('imageUrl', dataUrl);
    } catch {
      toast.error('Failed to read image file.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const titleCheck = checkTextContent(form.title, { minLength: 3, fieldName: 'Item title' });
    if (!titleCheck.clean) { toast.error(titleCheck.reason); return; }

    const descCheck = checkTextContent(form.description, { minLength: 10, fieldName: 'Description' });
    if (!descCheck.clean) { toast.error(descCheck.reason); return; }

    const locCheck = checkTextContent(form.location, { minLength: 2, fieldName: 'Location' });
    if (!locCheck.clean) { toast.error(locCheck.reason); return; }

    const contactCheck = checkTextContent(form.contactInfo, { minLength: 4, fieldName: 'Contact info' });
    if (!contactCheck.clean) { toast.error(contactCheck.reason); return; }

    try {
      setSubmitting(true);
      const res = await lostFoundAPI.create({
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        category: form.category,
        location: form.location.trim(),
        contactInfo: form.contactInfo.trim(),
        imageUrl: form.imageUrl || undefined,
      });
      onCreated(res.data.item);
      setForm({
        title: '',
        description: '',
        status: 'LOST',
        category: 'ELECTRONICS',
        location: '',
        contactInfo: defaultContact,
        imageUrl: '',
      });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to report item.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium placeholder-slate-400 focus:border-[#1a2b6b] focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all';

  return (
    <Modal open={open} onClose={onClose} title="Report Lost or Found Item" subtitle="Provide accurate details — teachers & coordinators are notified automatically" icon={PackageSearch} iconColor="bg-gradient-to-br from-amber-500 to-orange-600">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Report Type *</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
              <option value="LOST">🔴 I Lost an Item</option>
              <option value="FOUND">🟢 I Found an Item</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Category *</label>
            <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Item Title * <span className="text-[10px] text-slate-400 normal-case">(min 3 chars)</span></label>
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Black Dell Laptop Charger / Student ID Card"
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Detailed Description * <span className="text-[10px] text-slate-400 normal-case">(min 10 chars)</span></label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Describe color, brand, identifying marks, or time lost/found..."
            rows={3}
            className={`${inputCls} resize-none`}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Campus Location *</label>
            <input
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="e.g. Lab 3, Library, Cafeteria"
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Contact Info *</label>
            <input
              value={form.contactInfo}
              onChange={(e) => set('contactInfo', e.target.value)}
              placeholder="Email, Phone, or Room #"
              className={inputCls}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">
            Item Photo <span className="text-slate-400 normal-case font-medium">(optional, max 5MB)</span>
          </label>
          {form.imageUrl ? (
            <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200">
              <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => set('imageUrl', '')}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-20 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-indigo-300 transition-colors cursor-pointer">
              <ImageIcon size={18} className="text-slate-400 mb-1" />
              <span className="text-xs font-medium text-slate-500">Click to attach item photo (JPEG, PNG, WEBP)</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} className="hidden" />
            </label>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
          <ShieldCheck size={14} className="text-emerald-600 flex-shrink-0" />
          <span>Verified report: Teachers &amp; Coordinators receive an instant notification.</span>
        </div>
        <Button
          type="submit"
          loading={submitting}
          disabled={!form.title.trim() || !form.description.trim() || !form.location.trim() || !form.contactInfo.trim()}
          className="w-full"
        >
          Submit Report
        </Button>
      </form>
    </Modal>
  );
}
