import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupsAPI } from '../services/api';
import { cn } from '../utils/cn';
import { Card, Button, Badge, Modal } from '../components/ui';
import { DEPARTMENTS, SEMESTERS, getDepartmentsForUser } from '../utils/constants';
import toast from 'react-hot-toast';
import {
  Users, Plus, Search, Loader2, BookOpen, ArrowRight,
  GraduationCap, Filter, Hash,
} from 'lucide-react';

const CAN_JOIN   = ['STUDENT', 'TEACHER', 'UNIVERSITY_ADMIN', 'COORDINATION', 'SYSTEM_ADMIN'];
const CAN_CREATE = ['COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN', 'TEACHER'];

const DEPT_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-teal-500 to-emerald-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600',
];

function deptColor(dept) {
  let h = 0;
  for (let i = 0; i < dept.length; i++) h = (h << 5) - h + dept.charCodeAt(i);
  return DEPT_COLORS[Math.abs(h) % DEPT_COLORS.length];
}

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter,  setSemFilter]  = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');

  const fetchGroups = async (p = 1) => {
    try {
      setLoading(true);
      const res = await groupsAPI.getAll({ page: p, search, department: deptFilter, semester: semFilter });
      setGroups(p === 1 ? res.data.groups : [...groups, ...res.data.groups]);
      setPagination(res.data.pagination);
      setPage(p);
    } catch { toast.error('Failed to load groups.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGroups(1); }, [deptFilter, semFilter]);

  const handleSearch = (e) => { e.preventDefault(); fetchGroups(1); };

  const handleJoin = async (groupId) => {
    try {
      await groupsAPI.join(groupId);
      setGroups(groups.map((g) => g.id === groupId ? { ...g, isMember: true, memberCount: g.memberCount + 1 } : g));
      toast.success('Joined successfully!');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to join.'); }
  };

  const handleLeave = async (groupId) => {
    if (!confirm('Leave this group?')) return;
    try {
      await groupsAPI.leave(groupId);
      setGroups(groups.map((g) => g.id === groupId ? { ...g, isMember: false, myRole: null, memberCount: g.memberCount - 1 } : g));
      toast.success('Left the group.');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to leave.'); }
  };

  const handleCreated = (newGroup) => {
    setGroups([{ ...newGroup, isMember: true, myRole: 'COORDINATOR', postCount: 0 }, ...groups]);
    setShowCreate(false);
    toast.success('Group created!');
  };

  const canJoin   = CAN_JOIN.includes(user?.role);
  const canCreate = CAN_CREATE.includes(user?.role);

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
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest block mb-2" style={{ color: '#c9973a' }}>Academic</span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Semester Groups</h1>
              <p className="text-slate-400 text-sm mt-2">
                {canCreate ? 'Create and manage academic semester groups' : 'Find and join groups for your courses'}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {pagination && (
                <div className="hidden sm:flex items-center gap-2 backdrop-blur-sm border rounded-2xl px-4 py-3 animate-popIn" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  <Users className="h-5 w-5" style={{ color: '#c9973a' }} />
                  <div>
                    <span className="text-2xl font-extrabold text-white leading-none">{pagination.total}</span>
                    <p className="text-[11px] font-medium" style={{ color: '#c9973a' }}>Groups</p>
                  </div>
                </div>
              )}
              {canCreate && (
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-all cursor-pointer" style={{ background: 'rgba(201,151,58,0.15)' }}>
                  <Plus size={14} /> New Group
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

        {/* Tabs */}
        {canJoin && (
          <div className="flex gap-1 bg-white rounded-xl border border-slate-200/60 p-1 mb-6 shadow-sm w-fit">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-5 py-2 text-sm font-semibold rounded-lg cursor-pointer transition-all',
                activeTab === 'all' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              All Groups
            </button>
            <button
              onClick={() => setActiveTab('mine')}
              className={cn(
                'px-5 py-2 text-sm font-semibold rounded-lg cursor-pointer transition-all',
                activeTab === 'mine' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              My Groups
            </button>
          </div>
        )}

        {/* ── Search & Filters ── */}
        <Card padding="p-3" className="mb-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search groups..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-all" style={{ '--tw-ring-color': 'rgba(26,43,107,0.10)' }} onFocus={(e) => { e.target.style.borderColor='#1a2b6b'; }} onBlur={(e) => { e.target.style.borderColor=''; }}
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
              className="flex-shrink-0 h-10 w-10 rounded-xl text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-sm"
              style={{ background: 'linear-gradient(135deg, #1a2b6b, #2251b8)' }}
            >
              <Filter size={15} />
            </button>
          </form>
        </Card>

        {/* ── Groups Grid ── */}
        {loading && page === 1 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} padding="p-5">
                <div className="flex gap-3">
                  <div className="skeleton h-12 w-12 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-3/4 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                    <div className="skeleton h-3 w-full rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <Card className="text-center py-16">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Users size={24} className="text-blue-300" />
            </div>
            <p className="text-base font-bold text-slate-800">No groups found</p>
            <p className="text-sm text-slate-400 mt-1">
              {canCreate ? 'Create the first semester group.' : 'No groups match your filters.'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
            {groups.filter(g => activeTab === 'all' || g.isMember).map((group) => {
              const grad = deptColor(group.department || '');
              return (
                <Card key={group.id} hover padding="p-0">
                  <Link to={`/groups/${group.id}`} className="block p-5 pb-3">
                    <div className="flex items-start gap-3.5">
                      <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0 shadow-md`}>
                        <BookOpen size={20} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 flex items-center gap-2">
                          {group.name}
                          {group.isArchived && <Badge variant="slate" size="sm">Archived</Badge>}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1 text-[11px] text-indigo-600 font-bold">
                            <GraduationCap size={11} /> {group.department}
                          </span>
                          <span className="text-slate-200">·</span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold">
                            <Hash size={10} /> Semester {group.semester}
                          </span>
                        </div>
                        {group.description && (
                          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">{group.description}</p>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center justify-between px-5 py-3 border-t border-slate-50 bg-slate-50/40 rounded-b-2xl">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-semibold">
                      <Users size={12} /> {group.memberCount} members
                    </span>
                    {group.isMember ? (
                      group.myRole === 'COORDINATOR' ? (
                        <Badge variant="violet" size="sm">Coordinator</Badge>
                      ) : canJoin ? (
                        <button
                          onClick={(e) => { e.preventDefault(); handleLeave(group.id); }}
                          className="text-[11px] text-red-500 hover:text-red-600 font-bold px-2.5 py-1 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
                        >
                          Leave
                        </button>
                      ) : (
                        <Badge variant="teal" size="sm">Member</Badge>
                      )
                    ) : canJoin ? (
                      <button
                        onClick={(e) => { e.preventDefault(); handleJoin(group.id); }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-white text-[11px] font-bold active:scale-95 transition-all cursor-pointer shadow-sm" style={{ background: 'linear-gradient(135deg, #1a2b6b, #2251b8)' }}
                      >
                        Join
                      </button>
                    ) : (
                      <Link to={`/groups/${group.id}`} className="flex items-center gap-1 text-[11px] text-indigo-600 font-bold hover:text-indigo-800">
                        View <ArrowRight size={11} />
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {pagination && page < pagination.totalPages && (
          <div className="flex justify-center pt-6">
            <Button variant="secondary" onClick={() => fetchGroups(page + 1)} loading={loading}>Load More</Button>
          </div>
        )}

        {canCreate && (
          <CreateGroupModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
        )}
      </div>
    </div>
  );
}

function CreateGroupModal({ open, onClose, onCreated }) {
  const { user } = useAuth();
  const availableDepts = getDepartmentsForUser(user);
  const [form, setForm] = useState({ name: '', description: '', department: '', semester: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.department || !form.semester) return;
    try {
      setSubmitting(true);
      const res = await groupsAPI.create({ ...form, semester: parseInt(form.semester) });
      onCreated(res.data.group);
      setForm({ name: '', description: '', department: '', semester: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create group.');
    } finally { setSubmitting(false); }
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all';

  return (
    <Modal open={open} onClose={onClose} title="Create Semester Group" subtitle="Set up a new academic group" icon={Users} iconColor="bg-gradient-to-br from-blue-500 to-indigo-600">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Group Name *</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. CS – Semester 3 Group" className={inputCls} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Department *</label>
            <select value={form.department} onChange={(e) => set('department', e.target.value)} className={inputCls} required>
              <option value="">Select dept.</option>
              {availableDepts.map((d) => <option key={d} value={d}>{d}</option>)}
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
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Description</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What's this group for?" rows={3} className={`${inputCls} resize-none`} />
        </div>
        <Button type="submit" loading={submitting} disabled={!form.name.trim() || !form.department || !form.semester} className="w-full">
          Create Group
        </Button>
      </form>
    </Modal>
  );
}
