import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { lostFoundAPI } from '../services/api';
import { Card, Button, Badge, Modal } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Search,
  Plus,
  Loader2,
  MapPin,
  Tag,
  CheckCircle,
  PackageSearch,
  Trash2,
} from 'lucide-react';

const CATEGORIES = ['ELECTRONICS', 'BOOKS', 'CLOTHING', 'DOCUMENTS', 'ACCESSORIES', 'OTHER'];

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
    } catch {
      toast.error('Failed to load items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(1);
  }, [filters.status, filters.category]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchItems(1);
  };

  const handleResolve = async (itemId) => {
    try {
      await lostFoundAPI.resolve(itemId);
      setItems(items.map((i) => (i.id === itemId ? { ...i, status: 'CLAIMED' } : i)));
      toast.success('Item marked as claimed!');
    } catch {
      toast.error('Failed to resolve item.');
    }
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Delete this item?')) return;
    try {
      await lostFoundAPI.delete(itemId);
      setItems(items.filter((i) => i.id !== itemId));
      toast.success('Item deleted.');
    } catch {
      toast.error('Failed to delete item.');
    }
  };

  const handleCreated = (item) => {
    setItems([item, ...items]);
    setShowCreate(false);
    toast.success('Item reported!');
  };

  const statusBadge = {
    LOST: { variant: 'red', dot: true },
    FOUND: { variant: 'teal', dot: true },
    CLAIMED: { variant: 'slate', dot: true },
  };

  return (
    <div className="rc-fade-in">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
              <PackageSearch className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900">Lost & Found</h1>
              <p className="text-xs text-slate-500">Report or find lost items on campus</p>
            </div>
          </div>
          <Button icon={Plus} onClick={() => setShowCreate(true)}>Report Item</Button>
        </div>

        {/* Filters */}
        <Card padding="p-3" className="mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search items..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all flex-shrink-0"
            >
              <option value="">All Status</option>
              <option value="LOST">Lost</option>
              <option value="FOUND">Found</option>
              <option value="CLAIMED">Claimed</option>
            </select>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all flex-shrink-0"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
              ))}
            </select>
            <Button variant="secondary" type="submit" className="flex-shrink-0">Search</Button>
          </form>
        </Card>

        {/* Items */}
        {loading && page === 1 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
            <p className="text-sm text-slate-400 mt-3">Loading items...</p>
          </div>
        ) : items.length === 0 ? (
          <Card className="text-center py-16">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <PackageSearch className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-base font-semibold text-slate-900">No items found</p>
            <p className="text-sm text-slate-500 mt-1">Report a lost or found item to get started.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rc-stagger">
            {items.map((item) => {
              const sb = statusBadge[item.status] || statusBadge.LOST;
              return (
                <Card key={item.id} hover padding="p-0">
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3 min-w-0">
                      <Badge variant={sb.variant} size="sm" dot={sb.dot}>{item.status}</Badge>
                      <span className="text-xs text-slate-400 flex items-center gap-1 min-w-0 truncate">
                        <Tag className="h-3 w-3 shrink-0" /> {item.category.charAt(0) + item.category.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-slate-900 break-words line-clamp-2">{item.title}</h3>
                      {item.description && <p className="text-sm text-slate-500 mt-1.5 line-clamp-2 leading-relaxed break-words">{item.description}</p>}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-400 min-w-0">
                      {item.location && (
                        <span className="flex items-center gap-1 min-w-0 truncate">
                          <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{item.location}</span>
                        </span>
                      )}
                      <span>{new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 min-w-0 truncate">
                      by <span className="font-semibold text-slate-600">{item.reportedBy?.name}</span>
                    </p>
                  </div>

                  {item.reportedById === user?.id && item.status !== 'CLAIMED' && (
                    <div className="flex gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/40">
                      <Button variant="ghost" size="sm" icon={CheckCircle} onClick={() => handleResolve(item.id)} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                        Mark as Claimed
                      </Button>
                      <Button variant="ghost" size="sm" icon={Trash2} onClick={() => handleDelete(item.id)} className="ml-auto text-red-500 hover:text-red-600 hover:bg-red-50">
                        Delete
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {pagination && page < pagination.totalPages && (
          <div className="flex justify-center pt-8">
            <Button variant="secondary" onClick={() => fetchItems(page + 1)} loading={loading}>Load More</Button>
          </div>
        )}

        <CreateItemModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      </div>
    </div>
  );
}

function CreateItemModal({ open, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('LOST');
  const [category, setCategory] = useState('OTHER');
  const [location, setLocation] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      setSubmitting(true);
      const res = await lostFoundAPI.create({ title, description, status, category, location, contactInfo });
      onCreated(res.data.item);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to report item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Report Item">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type *</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all">
              <option value="LOST">Lost</option>
              <option value="FOUND">Found</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Black iPhone 14" className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all" required />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the item..." rows={3} className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none transition-all" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Location</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where was it lost/found?" className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contact Info</label>
          <input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} placeholder="Phone or email to reach you" className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all" />
        </div>
        <Button type="submit" loading={submitting} disabled={!title.trim()} className="w-full">
          Report Item
        </Button>
      </form>
    </Modal>
  );
}
