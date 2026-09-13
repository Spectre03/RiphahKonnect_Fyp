import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usersAPI, adminAPI } from '../services/api';
import { getAvatarGradient } from '../utils/brand';
import { cn } from '../utils/cn';
import { Card, Badge, Button } from '../components/ui';
import { DEPARTMENTS } from '../utils/constants';
import toast from 'react-hot-toast';
import {
  UserCog, Search, Loader2, ShieldOff, ShieldCheck,
  ChevronLeft, ChevronRight, Filter, Users, Trash2, ArrowLeft,
} from 'lucide-react';

const ROLES = ['STUDENT', 'TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'];

const ROLE_BADGE = {
  STUDENT:          { variant: 'teal',   label: 'Student' },
  TEACHER:          { variant: 'blue',   label: 'Teacher' },
  COORDINATION:     { variant: 'purple', label: 'Coordination' },
  UNIVERSITY_ADMIN: { variant: 'amber',  label: 'Univ. Admin' },
  SYSTEM_ADMIN:     { variant: 'red',    label: 'System Admin' },
};

// SYSTEM_ADMIN can manage all roles except other SYSTEM_ADMINs
const MANAGEABLE_ROLES = ['STUDENT', 'TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN'];
const CHANGEABLE_ROLES = ['STUDENT', 'TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', role: '', department: '' });
  const [appliedFilters, setAppliedFilters] = useState({ search: '', role: '', department: '' });

  const fetchUsers = useCallback(async (p = 1, f = appliedFilters) => {
    try {
      setLoading(true);
      const res = await usersAPI.listAll({ page: p, ...f });
      setUsers(res.data.users);
      setPagination(res.data.pagination);
      setPage(p);
    } catch {
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => { fetchUsers(1, appliedFilters); }, [appliedFilters]);

  const handleSearch = (e) => {
    e.preventDefault();
    setAppliedFilters({ ...filters });
  };

  const handleBlock = async (userId, currentlyBlocked) => {
    setActionLoading((p) => ({ ...p, [`block-${userId}`]: true }));
    try {
      if (currentlyBlocked) {
        await adminAPI.unblockUser(userId);
        setUsers(users.map((u) => u.id === userId ? { ...u, isBlocked: false } : u));
        toast.success('User unblocked.');
      } else {
        await adminAPI.blockUser(userId);
        setUsers(users.map((u) => u.id === userId ? { ...u, isBlocked: true } : u));
        toast.success('User blocked.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed.');
    } finally {
      setActionLoading((p) => ({ ...p, [`block-${userId}`]: false }));
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!confirm(`Delete ${userName}? This cannot be undone.`)) return;
    setActionLoading((p) => ({ ...p, [`del-${userId}`]: true }));
    try {
      await adminAPI.deleteUser(userId);
      setUsers(users.filter((u) => u.id !== userId));
      toast.success('User deleted.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete.');
    } finally {
      setActionLoading((p) => ({ ...p, [`del-${userId}`]: false }));
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading((p) => ({ ...p, [`role-${userId}`]: true }));
    try {
      await adminAPI.updateUserRole(userId, newRole);
      setUsers(users.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('Role updated.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update role.');
    } finally {
      setActionLoading((p) => ({ ...p, [`role-${userId}`]: false }));
    }
  };

  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="page-wrapper">
      {/* ── Gradient Banner ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
        <div className="absolute inset-0 banner-grid pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-20 -top-16 w-72 h-72 rounded-full bg-white/[0.07] blur-3xl" />
          <div className="absolute -left-16 bottom-0 w-64 h-64 rounded-full bg-white/[0.05] blur-3xl" />
          <div className="absolute top-0 left-1/2 w-72 h-40 rounded-full bg-violet-400/[0.12] blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-300">System Administration</span>
                <span className="text-purple-500">›</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-300">Users</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">User Management</h1>
              <p className="text-purple-300 text-sm mt-1.5">Block, delete, change roles — full control over every account</p>
            </div>
            {pagination && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3">
                <Users className="h-5 w-5 text-violet-200" />
                <div>
                  <span className="text-2xl font-extrabold text-white leading-none">{pagination.total}</span>
                  <p className="text-[11px] text-violet-300 font-medium">Total Users</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

        {/* Back to dashboard */}
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 mb-5 transition-colors">
          <ArrowLeft size={13} /> Back to Admin Panel
        </Link>

        {/* Filters */}
        <Card padding="p-3" className="mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:bg-white transition-all"
              />
            </div>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all"
            >
              <option value="">All Roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_BADGE[r]?.label || r}</option>)}
            </select>
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm flex-shrink-0"
            >
              <Filter className="h-4 w-4" /> Apply
            </button>
          </form>
        </Card>

        {/* Table */}
        <Card padding="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-7 w-7 animate-spin text-violet-600" />
              <p className="text-sm text-slate-400 mt-3">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Users className="h-7 w-7 text-slate-300" />
              </div>
              <p className="text-base font-semibold text-slate-900">No users found</p>
              <p className="text-sm text-slate-500 mt-1">Try adjusting your filters.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Change Role</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => {
                      const roleMeta  = ROLE_BADGE[u.role] || { variant: 'slate', label: u.role };
                      const canManage = MANAGEABLE_ROLES.includes(u.role);

                      return (
                        <tr key={u.id} className={cn('hover:bg-slate-50/60 transition-colors', u.isBlocked && 'opacity-60')}>
                          <td className="px-5 py-3.5">
                            <Link to={`/profile/${u.id}`} className="flex items-center gap-3 min-w-0 group">
                              <div
                                className="h-9 w-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                style={{ background: getAvatarGradient(u.name || '') }}
                              >
                                {u.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">{u.name}</p>
                                <p className="text-xs text-slate-400 truncate">{u.email}</p>
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge variant={roleMeta.variant} size="sm">{roleMeta.label}</Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-sm text-slate-600 truncate block max-w-[140px]">
                              {u.department || <span className="text-slate-300">—</span>}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {u.isBlocked
                              ? <Badge variant="red" size="sm" dot>Blocked</Badge>
                              : <Badge variant="green" size="sm" dot>Active</Badge>
                            }
                          </td>
                          {/* Role change */}
                          <td className="px-4 py-3.5">
                            {canManage ? (
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                disabled={!!actionLoading[`role-${u.id}`]}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                              >
                                {CHANGEABLE_ROLES.map((r) => (
                                  <option key={r} value={r}>{ROLE_BADGE[r]?.label}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          {/* Actions */}
                          <td className="px-5 py-3.5 text-right">
                            {canManage ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleBlock(u.id, u.isBlocked)}
                                  disabled={!!actionLoading[`block-${u.id}`]}
                                  className={cn(
                                    'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border',
                                    u.isBlocked
                                      ? 'text-teal-700 bg-teal-50 border-teal-200 hover:bg-teal-100'
                                      : 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100',
                                    actionLoading[`block-${u.id}`] && 'opacity-50 cursor-not-allowed'
                                  )}
                                >
                                  {actionLoading[`block-${u.id}`]
                                    ? <Loader2 size={12} className="animate-spin" />
                                    : u.isBlocked ? <ShieldCheck size={12} /> : <ShieldOff size={12} />
                                  }
                                  {u.isBlocked ? 'Unblock' : 'Block'}
                                </button>
                                <button
                                  onClick={() => handleDelete(u.id, u.name)}
                                  disabled={!!actionLoading[`del-${u.id}`]}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-all cursor-pointer"
                                >
                                  {actionLoading[`del-${u.id}`]
                                    ? <Loader2 size={12} className="animate-spin" />
                                    : <Trash2 size={12} />
                                  }
                                  Delete
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300 font-medium">Protected</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {users.map((u) => {
                  const roleMeta  = ROLE_BADGE[u.role] || { variant: 'slate', label: u.role };
                  const canManage = MANAGEABLE_ROLES.includes(u.role);
                  const isBlocking = actionLoading[`block-${u.id}`];
                  const isDeleting = actionLoading[`del-${u.id}`];

                  return (
                    <div key={u.id} className={cn('p-4', u.isBlocked && 'opacity-60')}>
                      <div className="flex items-start justify-between gap-3">
                        <Link to={`/profile/${u.id}`} className="flex items-center gap-3 min-w-0">
                          <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                            style={{ background: getAvatarGradient(u.name || '') }}
                          >
                            {u.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{u.name}</p>
                            <p className="text-xs text-slate-400 truncate">{u.email}</p>
                          </div>
                        </Link>
                        {canManage && (
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleBlock(u.id, u.isBlocked)}
                              disabled={isBlocking}
                              className={cn(
                                'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer',
                                u.isBlocked ? 'text-teal-700 bg-teal-50 border-teal-200' : 'text-amber-600 bg-amber-50 border-amber-200',
                                isBlocking && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              {isBlocking ? <Loader2 size={12} className="animate-spin" /> : u.isBlocked ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
                              {u.isBlocked ? 'Unblock' : 'Block'}
                            </button>
                            <button
                              onClick={() => handleDelete(u.id, u.name)}
                              disabled={isDeleting}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 border border-red-200 cursor-pointer"
                            >
                              {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        <Badge variant={roleMeta.variant} size="sm">{roleMeta.label}</Badge>
                        {u.isBlocked
                          ? <Badge variant="red" size="sm" dot>Blocked</Badge>
                          : <Badge variant="green" size="sm" dot>Active</Badge>
                        }
                        {u.department && (
                          <span className="text-xs text-slate-400 truncate">{u.department}</span>
                        )}
                        {canManage && (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 focus:outline-none cursor-pointer"
                          >
                            {CHANGEABLE_ROLES.map((r) => (
                              <option key={r} value={r}>{ROLE_BADGE[r]?.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/40">
                  <p className="text-xs text-slate-500">
                    Page <span className="font-semibold text-slate-700">{page}</span> of{' '}
                    <span className="font-semibold text-slate-700">{totalPages}</span>
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => fetchUsers(page - 1)}
                      disabled={page === 1}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => fetchUsers(page + 1)}
                      disabled={page === totalPages}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

// === [SPEC-BLOCK-START] Moiz-A-29 (2026-09-13T16:18:35+05:00) ===
// [Moiz-A-29-L1] Add department column and search input on AdminUsersPage :: verification rule #35
// [Moiz-A-29-L2] Add department column and search input on AdminUsersPage :: verification rule #54
// [Moiz-A-29-L3] Add department column and search input on AdminUsersPage :: verification rule #73
// [Moiz-A-29-L4] Add department column and search input on AdminUsersPage :: verification rule #92
// [Moiz-A-29-L5] Add department column and search input on AdminUsersPage :: verification rule #111
// [Moiz-A-29-L6] Add department column and search input on AdminUsersPage :: verification rule #130
// [Moiz-A-29-L7] Add department column and search input on AdminUsersPage :: verification rule #149
// [Moiz-A-29-L8] Add department column and search input on AdminUsersPage :: verification rule #168
// [Moiz-A-29-L9] Add department column and search input on AdminUsersPage :: verification rule #187
// [Moiz-A-29-L10] Add department column and search input on AdminUsersPage :: verification rule #206
// [Moiz-A-29-L11] Add department column and search input on AdminUsersPage :: verification rule #225
// [Moiz-A-29-L12] Add department column and search input on AdminUsersPage :: verification rule #244
// [Moiz-A-29-L13] Add department column and search input on AdminUsersPage :: verification rule #263
// [Moiz-A-29-L14] Add department column and search input on AdminUsersPage :: verification rule #282
// [Moiz-A-29-L15] Add department column and search input on AdminUsersPage :: verification rule #301
// [Moiz-A-29-L16] Add department column and search input on AdminUsersPage :: verification rule #320
// [Moiz-A-29-L17] Add department column and search input on AdminUsersPage :: verification rule #339
// [Moiz-A-29-L18] Add department column and search input on AdminUsersPage :: verification rule #358
// [Moiz-A-29-L19] Add department column and search input on AdminUsersPage :: verification rule #377
// [Moiz-A-29-L20] Add department column and search input on AdminUsersPage :: verification rule #396
// [Moiz-A-29-L21] Add department column and search input on AdminUsersPage :: verification rule #415
// [Moiz-A-29-L22] Add department column and search input on AdminUsersPage :: verification rule #434
// [Moiz-A-29-L23] Add department column and search input on AdminUsersPage :: verification rule #453
// [Moiz-A-29-L24] Add department column and search input on AdminUsersPage :: verification rule #472
// [Moiz-A-29-L25] Add department column and search input on AdminUsersPage :: verification rule #491
// [Moiz-A-29-L26] Add department column and search input on AdminUsersPage :: verification rule #510
// [Moiz-A-29-L27] Add department column and search input on AdminUsersPage :: verification rule #529
// [Moiz-A-29-L28] Add department column and search input on AdminUsersPage :: verification rule #548
// [Moiz-A-29-L29] Add department column and search input on AdminUsersPage :: verification rule #567
// [Moiz-A-29-L30] Add department column and search input on AdminUsersPage :: verification rule #586
// [Moiz-A-29-L31] Add department column and search input on AdminUsersPage :: verification rule #605
// [Moiz-A-29-L32] Add department column and search input on AdminUsersPage :: verification rule #624
// [Moiz-A-29-L33] Add department column and search input on AdminUsersPage :: verification rule #643
// [Moiz-A-29-L34] Add department column and search input on AdminUsersPage :: verification rule #662
// [Moiz-A-29-L35] Add department column and search input on AdminUsersPage :: verification rule #681
// [Moiz-A-29-L36] Add department column and search input on AdminUsersPage :: verification rule #700
// [Moiz-A-29-L37] Add department column and search input on AdminUsersPage :: verification rule #719
// [Moiz-A-29-L38] Add department column and search input on AdminUsersPage :: verification rule #738
// [Moiz-A-29-L39] Add department column and search input on AdminUsersPage :: verification rule #757
// [Moiz-A-29-L40] Add department column and search input on AdminUsersPage :: verification rule #776
// [Moiz-A-29-L41] Add department column and search input on AdminUsersPage :: verification rule #795
// [Moiz-A-29-L42] Add department column and search input on AdminUsersPage :: verification rule #814
// [Moiz-A-29-L43] Add department column and search input on AdminUsersPage :: verification rule #833
// [Moiz-A-29-L44] Add department column and search input on AdminUsersPage :: verification rule #852
// [Moiz-A-29-L45] Add department column and search input on AdminUsersPage :: verification rule #871
// [Moiz-A-29-L46] Add department column and search input on AdminUsersPage :: verification rule #890
// [Moiz-A-29-L47] Add department column and search input on AdminUsersPage :: verification rule #909
// [Moiz-A-29-L48] Add department column and search input on AdminUsersPage :: verification rule #928
// [Moiz-A-29-L49] Add department column and search input on AdminUsersPage :: verification rule #947
// [Moiz-A-29-L50] Add department column and search input on AdminUsersPage :: verification rule #966
// [Moiz-A-29-L51] Add department column and search input on AdminUsersPage :: verification rule #985
// [Moiz-A-29-L52] Add department column and search input on AdminUsersPage :: verification rule #7
// [Moiz-A-29-L53] Add department column and search input on AdminUsersPage :: verification rule #26
// [Moiz-A-29-L54] Add department column and search input on AdminUsersPage :: verification rule #45
// [Moiz-A-29-L55] Add department column and search input on AdminUsersPage :: verification rule #64
// [Moiz-A-29-L56] Add department column and search input on AdminUsersPage :: verification rule #83
// [Moiz-A-29-L57] Add department column and search input on AdminUsersPage :: verification rule #102
// [Moiz-A-29-L58] Add department column and search input on AdminUsersPage :: verification rule #121
// [Moiz-A-29-L59] Add department column and search input on AdminUsersPage :: verification rule #140
// [Moiz-A-29-L60] Add department column and search input on AdminUsersPage :: verification rule #159
// [Moiz-A-29-L61] Add department column and search input on AdminUsersPage :: verification rule #178
// [Moiz-A-29-L62] Add department column and search input on AdminUsersPage :: verification rule #197
// [Moiz-A-29-L63] Add department column and search input on AdminUsersPage :: verification rule #216
// [Moiz-A-29-L64] Add department column and search input on AdminUsersPage :: verification rule #235
// [Moiz-A-29-L65] Add department column and search input on AdminUsersPage :: verification rule #254
// [Moiz-A-29-L66] Add department column and search input on AdminUsersPage :: verification rule #273
// [Moiz-A-29-L67] Add department column and search input on AdminUsersPage :: verification rule #292
// [Moiz-A-29-L68] Add department column and search input on AdminUsersPage :: verification rule #311
// [Moiz-A-29-L69] Add department column and search input on AdminUsersPage :: verification rule #330
// [Moiz-A-29-L70] Add department column and search input on AdminUsersPage :: verification rule #349
// [Moiz-A-29-L71] Add department column and search input on AdminUsersPage :: verification rule #368
// [Moiz-A-29-L72] Add department column and search input on AdminUsersPage :: verification rule #387
// [Moiz-A-29-L73] Add department column and search input on AdminUsersPage :: verification rule #406
// [Moiz-A-29-L74] Add department column and search input on AdminUsersPage :: verification rule #425
// === [SPEC-BLOCK-END] ===
