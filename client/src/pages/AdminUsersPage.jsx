import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usersAPI, adminAPI, authAPI } from '../services/api';
import { useOnlineUsers } from '../services/socket';
import { getAvatarGradient } from '../utils/brand';
import { cn } from '../utils/cn';
import { Card, Badge, Button, Modal, Avatar } from '../components/ui';
import { DEPARTMENTS, SEMESTERS } from '../utils/constants';
import toast from 'react-hot-toast';
import {
  UserCog, Search, Loader2, ShieldOff, ShieldCheck,
  ChevronLeft, ChevronRight, Filter, Users, Trash2, ArrowLeft, Plus, UserPlus,
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
  const onlineUsers = useOnlineUsers();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', role: '', department: '' });
  const [appliedFilters, setAppliedFilters] = useState({ search: '', role: '', department: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showCreateUser, setShowCreateUser] = useState(false);

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

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    const userId = deleteTarget.id;
    setActionLoading((p) => ({ ...p, [`del-${userId}`]: true }));
    try {
      await adminAPI.deleteUser(userId);
      setUsers(users.filter((u) => u.id !== userId));
      setDeleteTarget(null);
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
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c1a4a 0%, #1a2b6b 100%)' }}>
        <div className="absolute inset-0 banner-grid pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-20 -top-16 w-72 h-72 rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(201,151,58,0.07) 0%, transparent 70%)' }} />
          <div className="absolute -left-16 bottom-0 w-64 h-64 rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(26,43,107,0.5) 0%, transparent 70%)' }} />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 relative z-10">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#c9973a' }}>System Administration</span>
                <span style={{ color: '#c9973a' }}>›</span>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#c9973a' }}>Users</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">User Management</h1>
              <p className="text-slate-400 text-sm mt-1.5">Create accounts, monitor online status, block, delete &amp; manage roles</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {pagination && (
                <div className="flex items-center gap-2 backdrop-blur-sm border rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  <Users className="h-5 w-5" style={{ color: '#c9973a' }} />
                  <div>
                    <span className="text-2xl font-extrabold text-white leading-none">{pagination.total}</span>
                    <p className="text-[11px] font-medium" style={{ color: '#c9973a' }}>Total Users</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => setShowCreateUser(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-md"
                style={{ background: '#c9973a', color: '#0c1a4a' }}
              >
                <UserPlus size={15} /> Create User
              </button>
            </div>
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
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-colors cursor-pointer shadow-sm flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #1a2b6b, #2251b8)' }}
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
                      const isOnline  = onlineUsers.has(u.id);

                      return (
                        <tr key={u.id} className={cn('hover:bg-slate-50/60 transition-colors', u.isBlocked && 'opacity-60')}>
                          <td className="px-5 py-3.5">
                            <Link to={`/profile/${u.id}`} className="flex items-center gap-3 min-w-0 group">
                              <Avatar name={u.name || ''} src={u.avatarUrl} size="sm" online={isOnline} />
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {u.isBlocked
                                ? <Badge variant="red" size="sm" dot>Blocked</Badge>
                                : <Badge variant="green" size="sm" dot>Active</Badge>
                              }
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border',
                                  isOnline
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                )}
                              >
                                <span className={cn('h-1.5 w-1.5 rounded-full', isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400')} />
                                {isOnline ? 'Online' : 'Offline'}
                              </span>
                            </div>
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
                                  onClick={() => setDeleteTarget(u)}
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
                  const isOnline   = onlineUsers.has(u.id);

                  return (
                    <div key={u.id} className={cn('p-4', u.isBlocked && 'opacity-60')}>
                      <div className="flex items-start justify-between gap-3">
                        <Link to={`/profile/${u.id}`} className="flex items-center gap-3 min-w-0">
                          <Avatar name={u.name || ''} src={u.avatarUrl} size="md" online={isOnline} />
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
                              onClick={() => setDeleteTarget(u)}
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
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border',
                            isOnline
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', isOnline ? 'bg-emerald-500' : 'bg-slate-400')} />
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
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

        {/* Delete User Confirmation Modal */}
        <Modal
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete User Account"
          subtitle="This action cannot be undone"
          icon={Trash2}
          iconColor="bg-gradient-to-br from-red-500 to-rose-600"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <span className="font-bold text-slate-900">{deleteTarget?.name}</span> ({deleteTarget?.email})?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={confirmDeleteUser}
                loading={!!actionLoading[`del-${deleteTarget?.id}`]}
                icon={Trash2}
              >
                Delete User
              </Button>
            </div>
          </div>
        </Modal>

        {/* Create User Modal */}
        <CreateUserModal
          open={showCreateUser}
          onClose={() => setShowCreateUser(false)}
          onCreated={() => {
            setShowCreateUser(false);
            fetchUsers(1, appliedFilters);
          }}
        />
      </div>
    </div>
  );
}

function CreateUserModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    department: '',
    semester: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await authAPI.registerUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        department: form.department || undefined,
        semester: form.role === 'STUDENT' && form.semester ? parseInt(form.semester) : undefined,
      });
      toast.success('User account created successfully!');
      setForm({ name: '', email: '', password: '', role: 'STUDENT', department: '', semester: '' });
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium placeholder-slate-400 focus:border-[#1a2b6b] focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all';

  return (
    <Modal open={open} onClose={onClose} title="Create Campus User" subtitle="Register a new student, teacher, coordinator, or admin" icon={UserPlus} iconColor="bg-gradient-to-br from-indigo-500 to-blue-600">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Full Name *</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Muhammad Ali" className={inputCls} required />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">University Email *</label>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="user@students.riphah.edu.pk or user@riphah.edu.pk" className={inputCls} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Password *</label>
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min 6 characters" className={inputCls} required minLength={6} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Role *</label>
            <select value={form.role} onChange={(e) => set('role', e.target.value)} className={inputCls}>
              <option value="STUDENT">Student</option>
              <option value="TEACHER">Teacher</option>
              <option value="COORDINATION">Coordination</option>
              <option value="UNIVERSITY_ADMIN">University Admin</option>
            </select>
          </div>
        </div>
        <div className={form.role === 'STUDENT' ? 'grid grid-cols-2 gap-3' : ''}>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Department</label>
            <select value={form.department} onChange={(e) => set('department', e.target.value)} className={inputCls}>
              <option value="">Select Department</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {form.role === 'STUDENT' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wide">Semester</label>
              <select value={form.semester} onChange={(e) => set('semester', e.target.value)} className={inputCls}>
                <option value="">Select Semester</option>
                {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
          )}
        </div>
        <Button type="submit" loading={submitting} disabled={!form.name.trim() || !form.email.trim() || form.password.length < 6} className="w-full">
          Create Account
        </Button>
      </form>
    </Modal>
  );
}
