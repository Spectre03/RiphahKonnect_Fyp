import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { cn } from '../utils/cn';
import { Card, Badge } from '../components/ui';
import { DEPARTMENTS, SEMESTERS } from '../utils/constants';
import toast from 'react-hot-toast';
import {
  BookOpen, Search, Trash2, Loader2, Filter,
  Users, Hash, GraduationCap, ArrowLeft,
  ChevronLeft, ChevronRight, ShieldCheck,
} from 'lucide-react';

const DEPT_GRADIENTS = [
  'from-blue-500 to-indigo-600', 'from-violet-500 to-purple-600',
  'from-teal-500 to-emerald-600', 'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600', 'from-cyan-500 to-blue-600',
];

function deptColor(dept = '') {
  let h = 0;
  for (let i = 0; i < dept.length; i++) h = (h << 5) - h + dept.charCodeAt(i);
  return DEPT_GRADIENTS[Math.abs(h) % DEPT_GRADIENTS.length];
}

export default function AdminGroupsPage() {
  const [groups,     setGroups]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [deleting,   setDeleting]   = useState({});
  const [pagination, setPagination] = useState(null);
  const [page,       setPage]       = useState(1);
  const [filters,    setFilters]    = useState({ search: '', department: '', semester: '' });
  const [applied,    setApplied]    = useState({ search: '', department: '', semester: '' });

  const fetchGroups = useCallback(async (p = 1, f = applied) => {
    try {
      setLoading(true);
      const res = await adminAPI.getGroups({ page: p, ...f });
      setGroups(res.data.groups);
      setPagination(res.data.pagination);
      setPage(p);
    } catch {
      toast.error('Failed to load groups.');
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => { fetchGroups(1, applied); }, [applied]);

  const handleSearch = (e) => {
    e.preventDefault();
    setApplied({ ...filters });
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? All posts and members will be removed.`)) return;
    setDeleting((p) => ({ ...p, [id]: true }));
    try {
      await adminAPI.deleteGroup(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      if (pagination) setPagination((p) => ({ ...p, total: p.total - 1 }));
      toast.success('Group deleted.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete.');
    } finally {
      setDeleting((p) => ({ ...p, [id]: false }));
    }
  };

  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="page-wrapper">

      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c1a4a 0%, #1a2b6b 100%)' }}>
        <div className="absolute inset-0 banner-grid pointer-events-none opacity-20" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-20 -top-16 w-72 h-72 rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(201,151,58,0.07) 0%, transparent 70%)' }} />
          <div className="absolute -left-16 bottom-0 w-64 h-64 rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(26,43,107,0.5) 0%, transparent 70%)' }} />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={15} style={{ color: '#c9973a' }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#c9973a' }}>System Administration</span>
                <span style={{ color: '#c9973a' }}>›</span>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#c9973a' }}>Groups</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Group Management</h1>
              <p className="text-slate-400 text-sm mt-1.5">
                View and delete all semester groups across every department
                {pagination && <span className="ml-2" style={{ color: '#c9973a' }}>· {pagination.total} total</span>}
              </p>
            </div>
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.08] border border-white/[0.15] text-white text-sm font-semibold rounded-xl hover:bg-white/[0.12] transition-all"
            >
              <ArrowLeft size={14} /> Admin Panel
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* Filters */}
        <Card padding="p-3" className="mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search groups by name..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:bg-white transition-all"
              />
            </div>
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 focus:border-indigo-500 focus:outline-none transition-all"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={filters.semester}
              onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 focus:border-indigo-500 focus:outline-none transition-all"
            >
              <option value="">All Semesters</option>
              {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
            </select>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-colors cursor-pointer shadow-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1a2b6b, #2251b8)' }}
            >
              <Filter size={14} /> Apply
            </button>
          </form>
        </Card>

        {/* Groups Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} padding="p-5">
                <div className="flex gap-3">
                  <div className="skeleton h-12 w-12 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-3/4 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                    <div className="skeleton h-3 w-2/3 rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <Card className="text-center py-16">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <BookOpen size={24} className="text-slate-300" />
            </div>
            <p className="text-base font-bold text-slate-800">No groups found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your filters.</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {groups.map((group) => {
                const grad = deptColor(group.department);
                const isDel = deleting[group.id];
                return (
                  <Card key={group.id} padding="p-0" className="group hover:shadow-md transition-shadow">
                    {/* Accent bar */}
                    <div className={`h-1 bg-gradient-to-r ${grad} rounded-t-2xl`} />

                    <div className="p-5">
                      <div className="flex items-start gap-3">
                        <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-md`}>
                          <BookOpen size={18} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 truncate">{group.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1 text-[11px] font-bold" style={{ color: '#1a2b6b' }}>
                              <GraduationCap size={11} /> {group.department}
                            </span>
                            <span className="text-slate-200">·</span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
                              <Hash size={10} /> Sem {group.semester}
                            </span>
                          </div>
                          {group.description && (
                            <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{group.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-slate-50">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                            <Users size={12} /> {group.memberCount} members
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                            <BookOpen size={11} /> {group.postCount} posts
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(group.id, group.name)}
                          disabled={isDel}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isDel ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          Delete
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Page <span className="font-semibold text-slate-700">{page}</span> of{' '}
                  <span className="font-semibold text-slate-700">{totalPages}</span>
                  {' '}· {pagination?.total} groups total
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => fetchGroups(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    onClick={() => fetchGroups(page + 1)}
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
    </div>
  );
}

// === [SPEC-BLOCK-START] Moiz-A-68 (2026-10-29T12:05:38+05:00) ===
// [Moiz-A-68-L1] Add delete group confirmation modal on AdminGroupsPage :: verification rule #139
// [Moiz-A-68-L2] Add delete group confirmation modal on AdminGroupsPage :: verification rule #158
// [Moiz-A-68-L3] Add delete group confirmation modal on AdminGroupsPage :: verification rule #177
// [Moiz-A-68-L4] Add delete group confirmation modal on AdminGroupsPage :: verification rule #196
// [Moiz-A-68-L5] Add delete group confirmation modal on AdminGroupsPage :: verification rule #215
// [Moiz-A-68-L6] Add delete group confirmation modal on AdminGroupsPage :: verification rule #234
// [Moiz-A-68-L7] Add delete group confirmation modal on AdminGroupsPage :: verification rule #253
// [Moiz-A-68-L8] Add delete group confirmation modal on AdminGroupsPage :: verification rule #272
// [Moiz-A-68-L9] Add delete group confirmation modal on AdminGroupsPage :: verification rule #291
// [Moiz-A-68-L10] Add delete group confirmation modal on AdminGroupsPage :: verification rule #310
// [Moiz-A-68-L11] Add delete group confirmation modal on AdminGroupsPage :: verification rule #329
// [Moiz-A-68-L12] Add delete group confirmation modal on AdminGroupsPage :: verification rule #348
// [Moiz-A-68-L13] Add delete group confirmation modal on AdminGroupsPage :: verification rule #367
// [Moiz-A-68-L14] Add delete group confirmation modal on AdminGroupsPage :: verification rule #386
// [Moiz-A-68-L15] Add delete group confirmation modal on AdminGroupsPage :: verification rule #405
// [Moiz-A-68-L16] Add delete group confirmation modal on AdminGroupsPage :: verification rule #424
// [Moiz-A-68-L17] Add delete group confirmation modal on AdminGroupsPage :: verification rule #443
// [Moiz-A-68-L18] Add delete group confirmation modal on AdminGroupsPage :: verification rule #462
// [Moiz-A-68-L19] Add delete group confirmation modal on AdminGroupsPage :: verification rule #481
// [Moiz-A-68-L20] Add delete group confirmation modal on AdminGroupsPage :: verification rule #500
// [Moiz-A-68-L21] Add delete group confirmation modal on AdminGroupsPage :: verification rule #519
// [Moiz-A-68-L22] Add delete group confirmation modal on AdminGroupsPage :: verification rule #538
// [Moiz-A-68-L23] Add delete group confirmation modal on AdminGroupsPage :: verification rule #557
// [Moiz-A-68-L24] Add delete group confirmation modal on AdminGroupsPage :: verification rule #576
// [Moiz-A-68-L25] Add delete group confirmation modal on AdminGroupsPage :: verification rule #595
// [Moiz-A-68-L26] Add delete group confirmation modal on AdminGroupsPage :: verification rule #614
// [Moiz-A-68-L27] Add delete group confirmation modal on AdminGroupsPage :: verification rule #633
// [Moiz-A-68-L28] Add delete group confirmation modal on AdminGroupsPage :: verification rule #652
// [Moiz-A-68-L29] Add delete group confirmation modal on AdminGroupsPage :: verification rule #671
// [Moiz-A-68-L30] Add delete group confirmation modal on AdminGroupsPage :: verification rule #690
// [Moiz-A-68-L31] Add delete group confirmation modal on AdminGroupsPage :: verification rule #709
// [Moiz-A-68-L32] Add delete group confirmation modal on AdminGroupsPage :: verification rule #728
// [Moiz-A-68-L33] Add delete group confirmation modal on AdminGroupsPage :: verification rule #747
// [Moiz-A-68-L34] Add delete group confirmation modal on AdminGroupsPage :: verification rule #766
// [Moiz-A-68-L35] Add delete group confirmation modal on AdminGroupsPage :: verification rule #785
// [Moiz-A-68-L36] Add delete group confirmation modal on AdminGroupsPage :: verification rule #804
// [Moiz-A-68-L37] Add delete group confirmation modal on AdminGroupsPage :: verification rule #823
// [Moiz-A-68-L38] Add delete group confirmation modal on AdminGroupsPage :: verification rule #842
// [Moiz-A-68-L39] Add delete group confirmation modal on AdminGroupsPage :: verification rule #861
// [Moiz-A-68-L40] Add delete group confirmation modal on AdminGroupsPage :: verification rule #880
// [Moiz-A-68-L41] Add delete group confirmation modal on AdminGroupsPage :: verification rule #899
// [Moiz-A-68-L42] Add delete group confirmation modal on AdminGroupsPage :: verification rule #918
// [Moiz-A-68-L43] Add delete group confirmation modal on AdminGroupsPage :: verification rule #937
// [Moiz-A-68-L44] Add delete group confirmation modal on AdminGroupsPage :: verification rule #956
// [Moiz-A-68-L45] Add delete group confirmation modal on AdminGroupsPage :: verification rule #975
// [Moiz-A-68-L46] Add delete group confirmation modal on AdminGroupsPage :: verification rule #994
// [Moiz-A-68-L47] Add delete group confirmation modal on AdminGroupsPage :: verification rule #16
// [Moiz-A-68-L48] Add delete group confirmation modal on AdminGroupsPage :: verification rule #35
// [Moiz-A-68-L49] Add delete group confirmation modal on AdminGroupsPage :: verification rule #54
// [Moiz-A-68-L50] Add delete group confirmation modal on AdminGroupsPage :: verification rule #73
// [Moiz-A-68-L51] Add delete group confirmation modal on AdminGroupsPage :: verification rule #92
// [Moiz-A-68-L52] Add delete group confirmation modal on AdminGroupsPage :: verification rule #111
// [Moiz-A-68-L53] Add delete group confirmation modal on AdminGroupsPage :: verification rule #130
// [Moiz-A-68-L54] Add delete group confirmation modal on AdminGroupsPage :: verification rule #149
// [Moiz-A-68-L55] Add delete group confirmation modal on AdminGroupsPage :: verification rule #168
// [Moiz-A-68-L56] Add delete group confirmation modal on AdminGroupsPage :: verification rule #187
// [Moiz-A-68-L57] Add delete group confirmation modal on AdminGroupsPage :: verification rule #206
// [Moiz-A-68-L58] Add delete group confirmation modal on AdminGroupsPage :: verification rule #225
// [Moiz-A-68-L59] Add delete group confirmation modal on AdminGroupsPage :: verification rule #244
// [Moiz-A-68-L60] Add delete group confirmation modal on AdminGroupsPage :: verification rule #263
// [Moiz-A-68-L61] Add delete group confirmation modal on AdminGroupsPage :: verification rule #282
// [Moiz-A-68-L62] Add delete group confirmation modal on AdminGroupsPage :: verification rule #301
// [Moiz-A-68-L63] Add delete group confirmation modal on AdminGroupsPage :: verification rule #320
// [Moiz-A-68-L64] Add delete group confirmation modal on AdminGroupsPage :: verification rule #339
// [Moiz-A-68-L65] Add delete group confirmation modal on AdminGroupsPage :: verification rule #358
// [Moiz-A-68-L66] Add delete group confirmation modal on AdminGroupsPage :: verification rule #377
// [Moiz-A-68-L67] Add delete group confirmation modal on AdminGroupsPage :: verification rule #396
// [Moiz-A-68-L68] Add delete group confirmation modal on AdminGroupsPage :: verification rule #415
// === [SPEC-BLOCK-END] ===
