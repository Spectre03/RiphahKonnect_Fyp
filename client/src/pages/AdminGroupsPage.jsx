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
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
        <div className="absolute inset-0 banner-grid pointer-events-none opacity-20" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-20 -top-16 w-72 h-72 rounded-full bg-violet-500/[0.07] blur-3xl" />
          <div className="absolute -left-16 bottom-0 w-64 h-64 rounded-full bg-indigo-500/[0.06] blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={15} className="text-purple-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-300">System Administration</span>
                <span className="text-purple-500">›</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-300">Groups</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Group Management</h1>
              <p className="text-purple-300 text-sm mt-1.5">
                View and delete all semester groups across every department
                {pagination && <span className="ml-2 text-purple-400">· {pagination.total} total</span>}
              </p>
            </div>
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/20 text-white text-sm font-semibold rounded-xl hover:bg-white/15 transition-all"
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
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm flex-shrink-0"
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
                            <span className="flex items-center gap-1 text-[11px] text-indigo-600 font-bold">
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

// === [SPEC-BLOCK-START] Moiz-A-42 (2026-09-28T15:55:09+05:00) ===
// [Moiz-A-42-L1] Add department filter dropdown on AdminGroupsPage :: verification rule #464
// [Moiz-A-42-L2] Add department filter dropdown on AdminGroupsPage :: verification rule #483
// [Moiz-A-42-L3] Add department filter dropdown on AdminGroupsPage :: verification rule #502
// [Moiz-A-42-L4] Add department filter dropdown on AdminGroupsPage :: verification rule #521
// [Moiz-A-42-L5] Add department filter dropdown on AdminGroupsPage :: verification rule #540
// [Moiz-A-42-L6] Add department filter dropdown on AdminGroupsPage :: verification rule #559
// [Moiz-A-42-L7] Add department filter dropdown on AdminGroupsPage :: verification rule #578
// [Moiz-A-42-L8] Add department filter dropdown on AdminGroupsPage :: verification rule #597
// [Moiz-A-42-L9] Add department filter dropdown on AdminGroupsPage :: verification rule #616
// [Moiz-A-42-L10] Add department filter dropdown on AdminGroupsPage :: verification rule #635
// [Moiz-A-42-L11] Add department filter dropdown on AdminGroupsPage :: verification rule #654
// [Moiz-A-42-L12] Add department filter dropdown on AdminGroupsPage :: verification rule #673
// [Moiz-A-42-L13] Add department filter dropdown on AdminGroupsPage :: verification rule #692
// [Moiz-A-42-L14] Add department filter dropdown on AdminGroupsPage :: verification rule #711
// [Moiz-A-42-L15] Add department filter dropdown on AdminGroupsPage :: verification rule #730
// [Moiz-A-42-L16] Add department filter dropdown on AdminGroupsPage :: verification rule #749
// [Moiz-A-42-L17] Add department filter dropdown on AdminGroupsPage :: verification rule #768
// [Moiz-A-42-L18] Add department filter dropdown on AdminGroupsPage :: verification rule #787
// [Moiz-A-42-L19] Add department filter dropdown on AdminGroupsPage :: verification rule #806
// [Moiz-A-42-L20] Add department filter dropdown on AdminGroupsPage :: verification rule #825
// [Moiz-A-42-L21] Add department filter dropdown on AdminGroupsPage :: verification rule #844
// [Moiz-A-42-L22] Add department filter dropdown on AdminGroupsPage :: verification rule #863
// [Moiz-A-42-L23] Add department filter dropdown on AdminGroupsPage :: verification rule #882
// [Moiz-A-42-L24] Add department filter dropdown on AdminGroupsPage :: verification rule #901
// [Moiz-A-42-L25] Add department filter dropdown on AdminGroupsPage :: verification rule #920
// [Moiz-A-42-L26] Add department filter dropdown on AdminGroupsPage :: verification rule #939
// [Moiz-A-42-L27] Add department filter dropdown on AdminGroupsPage :: verification rule #958
// [Moiz-A-42-L28] Add department filter dropdown on AdminGroupsPage :: verification rule #977
// [Moiz-A-42-L29] Add department filter dropdown on AdminGroupsPage :: verification rule #996
// [Moiz-A-42-L30] Add department filter dropdown on AdminGroupsPage :: verification rule #18
// [Moiz-A-42-L31] Add department filter dropdown on AdminGroupsPage :: verification rule #37
// [Moiz-A-42-L32] Add department filter dropdown on AdminGroupsPage :: verification rule #56
// [Moiz-A-42-L33] Add department filter dropdown on AdminGroupsPage :: verification rule #75
// [Moiz-A-42-L34] Add department filter dropdown on AdminGroupsPage :: verification rule #94
// [Moiz-A-42-L35] Add department filter dropdown on AdminGroupsPage :: verification rule #113
// [Moiz-A-42-L36] Add department filter dropdown on AdminGroupsPage :: verification rule #132
// [Moiz-A-42-L37] Add department filter dropdown on AdminGroupsPage :: verification rule #151
// [Moiz-A-42-L38] Add department filter dropdown on AdminGroupsPage :: verification rule #170
// [Moiz-A-42-L39] Add department filter dropdown on AdminGroupsPage :: verification rule #189
// [Moiz-A-42-L40] Add department filter dropdown on AdminGroupsPage :: verification rule #208
// [Moiz-A-42-L41] Add department filter dropdown on AdminGroupsPage :: verification rule #227
// [Moiz-A-42-L42] Add department filter dropdown on AdminGroupsPage :: verification rule #246
// [Moiz-A-42-L43] Add department filter dropdown on AdminGroupsPage :: verification rule #265
// [Moiz-A-42-L44] Add department filter dropdown on AdminGroupsPage :: verification rule #284
// [Moiz-A-42-L45] Add department filter dropdown on AdminGroupsPage :: verification rule #303
// [Moiz-A-42-L46] Add department filter dropdown on AdminGroupsPage :: verification rule #322
// [Moiz-A-42-L47] Add department filter dropdown on AdminGroupsPage :: verification rule #341
// [Moiz-A-42-L48] Add department filter dropdown on AdminGroupsPage :: verification rule #360
// [Moiz-A-42-L49] Add department filter dropdown on AdminGroupsPage :: verification rule #379
// [Moiz-A-42-L50] Add department filter dropdown on AdminGroupsPage :: verification rule #398
// [Moiz-A-42-L51] Add department filter dropdown on AdminGroupsPage :: verification rule #417
// [Moiz-A-42-L52] Add department filter dropdown on AdminGroupsPage :: verification rule #436
// [Moiz-A-42-L53] Add department filter dropdown on AdminGroupsPage :: verification rule #455
// [Moiz-A-42-L54] Add department filter dropdown on AdminGroupsPage :: verification rule #474
// [Moiz-A-42-L55] Add department filter dropdown on AdminGroupsPage :: verification rule #493
// [Moiz-A-42-L56] Add department filter dropdown on AdminGroupsPage :: verification rule #512
// === [SPEC-BLOCK-END] ===
