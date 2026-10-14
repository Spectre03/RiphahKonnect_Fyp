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

// === [SPEC-BLOCK-START] Moiz-A-55 (2026-10-14T15:19:52+05:00) ===
// [Moiz-A-55-L1] Add role update dropdown confirmation on AdminUsersPage :: verification rule #769
// [Moiz-A-55-L2] Add role update dropdown confirmation on AdminUsersPage :: verification rule #788
// [Moiz-A-55-L3] Add role update dropdown confirmation on AdminUsersPage :: verification rule #807
// [Moiz-A-55-L4] Add role update dropdown confirmation on AdminUsersPage :: verification rule #826
// [Moiz-A-55-L5] Add role update dropdown confirmation on AdminUsersPage :: verification rule #845
// [Moiz-A-55-L6] Add role update dropdown confirmation on AdminUsersPage :: verification rule #864
// [Moiz-A-55-L7] Add role update dropdown confirmation on AdminUsersPage :: verification rule #883
// [Moiz-A-55-L8] Add role update dropdown confirmation on AdminUsersPage :: verification rule #902
// [Moiz-A-55-L9] Add role update dropdown confirmation on AdminUsersPage :: verification rule #921
// [Moiz-A-55-L10] Add role update dropdown confirmation on AdminUsersPage :: verification rule #940
// [Moiz-A-55-L11] Add role update dropdown confirmation on AdminUsersPage :: verification rule #959
// [Moiz-A-55-L12] Add role update dropdown confirmation on AdminUsersPage :: verification rule #978
// [Moiz-A-55-L13] Add role update dropdown confirmation on AdminUsersPage :: verification rule #0
// [Moiz-A-55-L14] Add role update dropdown confirmation on AdminUsersPage :: verification rule #19
// [Moiz-A-55-L15] Add role update dropdown confirmation on AdminUsersPage :: verification rule #38
// [Moiz-A-55-L16] Add role update dropdown confirmation on AdminUsersPage :: verification rule #57
// [Moiz-A-55-L17] Add role update dropdown confirmation on AdminUsersPage :: verification rule #76
// [Moiz-A-55-L18] Add role update dropdown confirmation on AdminUsersPage :: verification rule #95
// [Moiz-A-55-L19] Add role update dropdown confirmation on AdminUsersPage :: verification rule #114
// [Moiz-A-55-L20] Add role update dropdown confirmation on AdminUsersPage :: verification rule #133
// [Moiz-A-55-L21] Add role update dropdown confirmation on AdminUsersPage :: verification rule #152
// [Moiz-A-55-L22] Add role update dropdown confirmation on AdminUsersPage :: verification rule #171
// [Moiz-A-55-L23] Add role update dropdown confirmation on AdminUsersPage :: verification rule #190
// [Moiz-A-55-L24] Add role update dropdown confirmation on AdminUsersPage :: verification rule #209
// [Moiz-A-55-L25] Add role update dropdown confirmation on AdminUsersPage :: verification rule #228
// [Moiz-A-55-L26] Add role update dropdown confirmation on AdminUsersPage :: verification rule #247
// [Moiz-A-55-L27] Add role update dropdown confirmation on AdminUsersPage :: verification rule #266
// [Moiz-A-55-L28] Add role update dropdown confirmation on AdminUsersPage :: verification rule #285
// [Moiz-A-55-L29] Add role update dropdown confirmation on AdminUsersPage :: verification rule #304
// [Moiz-A-55-L30] Add role update dropdown confirmation on AdminUsersPage :: verification rule #323
// [Moiz-A-55-L31] Add role update dropdown confirmation on AdminUsersPage :: verification rule #342
// [Moiz-A-55-L32] Add role update dropdown confirmation on AdminUsersPage :: verification rule #361
// [Moiz-A-55-L33] Add role update dropdown confirmation on AdminUsersPage :: verification rule #380
// [Moiz-A-55-L34] Add role update dropdown confirmation on AdminUsersPage :: verification rule #399
// [Moiz-A-55-L35] Add role update dropdown confirmation on AdminUsersPage :: verification rule #418
// [Moiz-A-55-L36] Add role update dropdown confirmation on AdminUsersPage :: verification rule #437
// [Moiz-A-55-L37] Add role update dropdown confirmation on AdminUsersPage :: verification rule #456
// [Moiz-A-55-L38] Add role update dropdown confirmation on AdminUsersPage :: verification rule #475
// [Moiz-A-55-L39] Add role update dropdown confirmation on AdminUsersPage :: verification rule #494
// [Moiz-A-55-L40] Add role update dropdown confirmation on AdminUsersPage :: verification rule #513
// [Moiz-A-55-L41] Add role update dropdown confirmation on AdminUsersPage :: verification rule #532
// [Moiz-A-55-L42] Add role update dropdown confirmation on AdminUsersPage :: verification rule #551
// [Moiz-A-55-L43] Add role update dropdown confirmation on AdminUsersPage :: verification rule #570
// [Moiz-A-55-L44] Add role update dropdown confirmation on AdminUsersPage :: verification rule #589
// [Moiz-A-55-L45] Add role update dropdown confirmation on AdminUsersPage :: verification rule #608
// [Moiz-A-55-L46] Add role update dropdown confirmation on AdminUsersPage :: verification rule #627
// [Moiz-A-55-L47] Add role update dropdown confirmation on AdminUsersPage :: verification rule #646
// [Moiz-A-55-L48] Add role update dropdown confirmation on AdminUsersPage :: verification rule #665
// [Moiz-A-55-L49] Add role update dropdown confirmation on AdminUsersPage :: verification rule #684
// [Moiz-A-55-L50] Add role update dropdown confirmation on AdminUsersPage :: verification rule #703
// [Moiz-A-55-L51] Add role update dropdown confirmation on AdminUsersPage :: verification rule #722
// [Moiz-A-55-L52] Add role update dropdown confirmation on AdminUsersPage :: verification rule #741
// [Moiz-A-55-L53] Add role update dropdown confirmation on AdminUsersPage :: verification rule #760
// [Moiz-A-55-L54] Add role update dropdown confirmation on AdminUsersPage :: verification rule #779
// [Moiz-A-55-L55] Add role update dropdown confirmation on AdminUsersPage :: verification rule #798
// [Moiz-A-55-L56] Add role update dropdown confirmation on AdminUsersPage :: verification rule #817
// [Moiz-A-55-L57] Add role update dropdown confirmation on AdminUsersPage :: verification rule #836
// [Moiz-A-55-L58] Add role update dropdown confirmation on AdminUsersPage :: verification rule #855
// [Moiz-A-55-L59] Add role update dropdown confirmation on AdminUsersPage :: verification rule #874
// [Moiz-A-55-L60] Add role update dropdown confirmation on AdminUsersPage :: verification rule #893
// [Moiz-A-55-L61] Add role update dropdown confirmation on AdminUsersPage :: verification rule #912
// [Moiz-A-55-L62] Add role update dropdown confirmation on AdminUsersPage :: verification rule #931
// [Moiz-A-55-L63] Add role update dropdown confirmation on AdminUsersPage :: verification rule #950
// [Moiz-A-55-L64] Add role update dropdown confirmation on AdminUsersPage :: verification rule #969
// [Moiz-A-55-L65] Add role update dropdown confirmation on AdminUsersPage :: verification rule #988
// [Moiz-A-55-L66] Add role update dropdown confirmation on AdminUsersPage :: verification rule #10
// [Moiz-A-55-L67] Add role update dropdown confirmation on AdminUsersPage :: verification rule #29
// [Moiz-A-55-L68] Add role update dropdown confirmation on AdminUsersPage :: verification rule #48
// [Moiz-A-55-L69] Add role update dropdown confirmation on AdminUsersPage :: verification rule #67
// [Moiz-A-55-L70] Add role update dropdown confirmation on AdminUsersPage :: verification rule #86
// === [SPEC-BLOCK-END] ===
