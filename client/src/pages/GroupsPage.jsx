import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { groupsAPI } from '../services/api';
import { Card, Button, Badge, Modal } from '../components/ui';
import toast from 'react-hot-toast';
import { Users, Plus, Search, Loader2, Lock, Globe, BookOpen } from 'lucide-react';

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);

  const fetchGroups = async (p = 1, q = search) => {
    try {
      setLoading(true);
      const res = await groupsAPI.getAll(p, q);
      setGroups(p === 1 ? res.data.groups : [...groups, ...res.data.groups]);
      setPagination(res.data.pagination);
      setPage(p);
    } catch {
      toast.error('Failed to load groups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  const handleSearch = (e) => { e.preventDefault(); fetchGroups(1, search); };

  const handleJoin = async (groupId) => {
    try {
      await groupsAPI.join(groupId);
      setGroups(groups.map((g) => (g.id === groupId ? { ...g, isMember: true, memberCount: g.memberCount + 1 } : g)));
      toast.success('Joined the group!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to join.');
    }
  };

  const handleLeave = async (groupId) => {
    try {
      await groupsAPI.leave(groupId);
      setGroups(groups.map((g) => (g.id === groupId ? { ...g, isMember: false, myRole: null, memberCount: g.memberCount - 1 } : g)));
      toast.success('Left the group.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to leave.');
    }
  };

  const handleCreated = (newGroup) => {
    setGroups([{ ...newGroup, isMember: true, myRole: 'OWNER', postCount: 0 }, ...groups]);
    setShowCreate(false);
    toast.success('Group created!');
  };

  return (
    <div className="rc-fade-in">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Study Groups</h1>
              <p className="text-xs text-slate-500">Join or create groups to study together</p>
            </div>
          </div>
          <Button icon={Plus} onClick={() => setShowCreate(true)}>New Group</Button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search groups by name or subject..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200/80 bg-white text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
            />
          </div>
        </form>

        {/* Groups Grid */}
        {loading && page === 1 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
            <p className="text-sm text-slate-400 mt-3">Loading groups...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Users className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-base font-semibold text-slate-900">No groups found</p>
            <p className="text-sm text-slate-500 mt-1">Create the first study group!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 rc-stagger">
            {groups.map((group) => (
              <Card key={group.id} hover padding="p-0">
                <div className="p-5">
                  <Link to={`/groups/${group.id}`} className="block min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-slate-900 hover:text-teal-600 transition-colors truncate">{group.name}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          {group.isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                          {group.subject && <span className="text-teal-600 font-medium truncate">{group.subject}</span>}
                        </div>
                      </div>
                    </div>
                    {group.description && <p className="text-sm text-slate-500 mt-3 line-clamp-2 leading-relaxed break-words">{group.description}</p>}
                  </Link>
                </div>
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                    <Users className="h-3.5 w-3.5" /> {group.memberCount} members
                  </span>
                  {group.isMember ? (
                    group.myRole === 'OWNER' ? (
                      <Badge variant="teal" size="sm">Owner</Badge>
                    ) : (
                      <button onClick={() => handleLeave(group.id)} className="text-xs text-red-500 hover:text-red-600 font-semibold px-2.5 py-1 hover:bg-red-50 rounded-full cursor-pointer transition-colors">
                        Leave
                      </button>
                    )
                  ) : (
                    <Button size="sm" onClick={() => handleJoin(group.id)}>Join</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {pagination && page < pagination.totalPages && (
          <div className="flex justify-center pt-8">
            <Button variant="secondary" onClick={() => fetchGroups(page + 1)} loading={loading}>Load More</Button>
          </div>
        )}

        <CreateGroupModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      </div>
    </div>
  );
}

function CreateGroupModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      const res = await groupsAPI.create({ name, description, subject, isPrivate });
      onCreated(res.data.group);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create group.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Study Group">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Group Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CS301 Study Group" className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Data Structures" className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this group about?" rows={3} className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none transition-all" />
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
          <span className="text-sm text-slate-700">Private group (invite only)</span>
        </label>
        <Button type="submit" loading={submitting} disabled={!name.trim()} className="w-full">
          Create Group
        </Button>
      </form>
    </Modal>
  );
}
