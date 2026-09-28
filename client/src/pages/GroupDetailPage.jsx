import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupsAPI, postsAPI } from '../services/api';
import { useOnlineUsers } from '../services/socket';
import { timeAgo } from '../utils/brand';
import { cn } from '../utils/cn';
import { Card, Button, Badge, Avatar } from '../components/ui';
import GroupChat from '../components/groups/GroupChat';
import toast from 'react-hot-toast';
import {
  Users, ArrowLeft, Send, Heart, MessageCircle, Trash2,
  Loader2, BookOpen, Crown, User, GraduationCap, X,
} from 'lucide-react';

const CAN_JOIN = ['STUDENT', 'TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'];
const CAN_POST = ['STUDENT', 'TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'];

export default function GroupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const onlineUsers = useOnlineUsers();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [tab, setTab] = useState('posts');

  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [groupRes, postsRes] = await Promise.all([
          groupsAPI.get(id),
          groupsAPI.getPosts(id),
        ]);
        setGroup(groupRes.data.group);
        setPosts(postsRes.data.posts);
        setEditName(groupRes.data.group.name);
        setEditDesc(groupRes.data.group.description || '');
      } catch {
        toast.error('Failed to load group.');
        navigate('/groups');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    try {
      setPosting(true);
      const res = await postsAPI.create({ content: newPost, groupId: id });
      setPosts([{ ...res.data.post, likesCount: 0, commentsCount: 0, isLiked: false }, ...posts]);
      setNewPost('');
      toast.success('Posted!');
    } catch {
      toast.error('Failed to post.');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await postsAPI.toggleLike(postId);
      setPosts(posts.map((p) =>
        p.id === postId
          ? { ...p, isLiked: res.data.liked, likesCount: p.likesCount + (res.data.liked ? 1 : -1) }
          : p
      ));
    } catch {
      toast.error('Failed to like.');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Delete this post?')) return;
    try {
      await postsAPI.delete(postId);
      setPosts(posts.filter((p) => p.id !== postId));
      toast.success('Post deleted.');
    } catch {
      toast.error('Failed to delete.');
    }
  };

  const handleJoin = async () => {
    try {
      await groupsAPI.join(id);
      setGroup({ ...group, isMember: true, memberCount: group.memberCount + 1 });
      toast.success('Joined!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to join.');
    }
  };

  const handleLeave = async () => {
    if (!confirm('Leave this group?')) return;
    try {
      await groupsAPI.leave(id);
      setGroup({ ...group, isMember: false, myRole: null, memberCount: group.memberCount - 1 });
      toast.success('Left the group.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to leave.');
    }
  };

  const handleArchive = async () => {
    if (!confirm(`Are you sure you want to ${group.isArchived ? 'unarchive' : 'archive'} this group?`)) return;
    try {
      const res = await groupsAPI.archive(id);
      setGroup({ ...group, isArchived: res.data.group.isArchived });
      toast.success(res.data.group.isArchived ? 'Group archived.' : 'Group unarchived.');
    } catch {
      toast.error('Failed to toggle archive status.');
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm('Are you ABSOLUTELY sure you want to delete this group? All posts and chats will be permanently lost.')) return;
    try {
      await groupsAPI.delete(id);
      toast.success('Group deleted.');
      navigate('/groups');
    } catch {
      toast.error('Failed to delete group.');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      const res = await groupsAPI.update(id, { name: editName, description: editDesc });
      setGroup({ ...group, name: res.data.group.name, description: res.data.group.description });
      setShowEdit(false);
      toast.success('Group updated.');
    } catch {
      toast.error('Failed to update group.');
    }
  };

  const handleRemoveMember = async (e, userId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Remove this user from the group?')) return;
    try {
      await groupsAPI.removeMember(id, userId);
      setGroup({
        ...group,
        members: group.members.filter(m => m.userId !== userId),
        memberCount: group.memberCount - 1
      });
      toast.success('User removed.');
    } catch {
      toast.error('Failed to remove user.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-sm text-slate-400 mt-3">Loading group...</p>
      </div>
    );
  }

  if (!group) return null;

  const canJoin = CAN_JOIN.includes(user?.role);
  const canPost = CAN_POST.includes(user?.role) && group.isMember;
  const isMember = group.isMember;
  const isCoordinator = group.myRole === 'COORDINATOR';

  return (
    <div className="page-wrapper">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate('/groups')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 cursor-pointer transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Groups
        </button>

        {/* Group Header */}
        <Card padding="p-0" className="mb-6">
          <div className="h-28 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c1a4a 0%, #1a2b6b 100%)' }}>
            <div className="absolute inset-0 banner-grid" />
            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(201,151,58,0.15) 0%, transparent 70%)' }} />
            <div className="absolute -left-10 bottom-0 w-40 h-32 rounded-full blur-2xl" style={{ background: 'radial-gradient(ellipse, rgba(26,43,107,0.5) 0%, transparent 70%)' }} />
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-start gap-4 min-w-0">
                <div className="h-20 w-20 rounded-2xl bg-white shadow-lg border-4 border-white flex items-center justify-center flex-shrink-0 -mt-10">
                  <BookOpen className="h-10 w-10 text-blue-600" />
                </div>
                <div className="pt-3 min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-900 truncate">{group.name}</h1>
                    {group.isArchived && <Badge variant="slate" size="sm">Archived</Badge>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="flex items-center gap-1 text-sm text-blue-600 font-semibold">
                      <GraduationCap className="h-3.5 w-3.5" /> {group.department}
                    </span>
                    <span className="text-slate-400 text-sm">·</span>
                    <span className="text-sm text-slate-500 font-medium">Semester {group.semester}</span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 ml-3 flex items-center gap-2 pt-3">
                {isMember ? (
                  isCoordinator ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="violet" size="sm">Coordinator</Badge>
                      <button onClick={() => setShowEdit(true)} className="text-sm font-semibold text-slate-400 hover:text-indigo-600 cursor-pointer ml-1">Edit</button>
                      <button onClick={handleArchive} className="text-sm font-semibold text-slate-400 hover:text-amber-600 cursor-pointer">{group.isArchived ? 'Unarchive' : 'Archive'}</button>
                      <button onClick={handleDeleteGroup} className="text-sm font-semibold text-slate-400 hover:text-red-600 cursor-pointer">Delete</button>
                    </div>
                  ) : canJoin ? (
                    <Button variant="secondary" size="sm" onClick={handleLeave}>Leave</Button>
                  ) : null
                ) : canJoin ? (
                  <Button onClick={handleJoin}>Join Group</Button>
                ) : null}
              </div>
            </div>
            {group.description && (
              <p className="text-sm text-slate-500 mt-4 leading-relaxed break-words">{group.description}</p>
            )}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
              <span className="text-sm text-slate-500 flex items-center gap-1.5 font-medium">
                <Users className="h-4 w-4 text-slate-400" /> {group._count?.members || group.memberCount} members
              </span>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200/60 p-1 mb-6 shadow-sm">
          {[{ key: 'posts', label: 'Posts' }, { key: 'chat', label: 'Chat' }, { key: 'members', label: 'Members' }].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex-1 py-2.5 text-sm font-semibold rounded-lg cursor-pointer transition-all',
                tab === t.key ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'posts' ? (
          <>
            {/* Post composer — members who can post */}
            {canPost && !group.isArchived && (
              <Card padding="p-0" className="mb-5">
                <form onSubmit={handlePost}>
                  <div className="p-4">
                    <div className="flex gap-3">
                      <Avatar name={user?.name || ''} size="sm" className="mt-1 flex-shrink-0" />
                      <textarea
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        placeholder="Share with the group..."
                        rows={3}
                        className="w-full min-w-0 rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm placeholder-slate-400 focus:bg-slate-100 focus:outline-none resize-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end px-4 py-3 border-t border-slate-100">
                    <Button type="submit" disabled={posting || !newPost.trim()} loading={posting} icon={Send} size="sm">Post</Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Must be member to view posts (backend enforces this too) */}
            {!isMember && canJoin && (
              <Card className="text-center py-12">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-900">Join to see group posts</p>
                <p className="text-xs text-slate-500 mt-1">Members-only content</p>
                <Button className="mt-4" onClick={handleJoin}>Join Group</Button>
              </Card>
            )}

            {isMember && (
              posts.length === 0 ? (
                <Card className="text-center py-16">
                  <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="h-7 w-7 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-900">No posts yet</p>
                  {canPost && <p className="text-xs text-slate-500 mt-1">Be the first to post!</p>}
                </Card>
              ) : (
                <div className="space-y-4 stagger">
                  {posts.map((post) => (
                    <Card key={post.id} hover padding="p-0">
                      <div className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <Link to={`/profile/${post.author?.id}`} className="flex-shrink-0">
                              <Avatar name={post.author?.name || ''} size="md" />
                            </Link>
                            <div className="min-w-0">
                              <Link to={`/profile/${post.author?.id}`} className="text-sm font-bold text-slate-900 hover:text-teal-600 transition-colors truncate block">
                                {post.author?.name}
                              </Link>
                              <p className="text-xs text-slate-400">{timeAgo(post.createdAt)}</p>
                            </div>
                          </div>
                          {post.author?.id === user?.id && (
                            <button onClick={() => handleDeletePost(post.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors flex-shrink-0">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <p className="mt-3 text-[15px] text-slate-800 whitespace-pre-wrap leading-relaxed break-words">{post.content}</p>
                      </div>
                      <div className="flex items-center gap-1 px-5 py-2.5 border-t border-slate-100 bg-slate-50/30">
                        {canPost ? (
                          <button
                            onClick={() => handleLike(post.id)}
                            className={cn(
                              'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all',
                              post.isLiked ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                            )}
                          >
                            <Heart className={cn('h-4 w-4', post.isLiked && 'fill-current')} /> {post.likesCount}
                          </button>
                        ) : (
                          <span className="flex items-center gap-1.5 px-3.5 py-2 text-sm text-slate-400">
                            <Heart className="h-4 w-4" /> {post.likesCount}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 px-3.5 py-2 text-sm text-slate-400 font-medium">
                          <MessageCircle className="h-4 w-4" /> {post.commentsCount}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )
            )}
          </>
        ) : tab === 'chat' ? (
          <div className="animate-fadeIn">
            {!isMember ? (
              <Card className="text-center py-12">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-900">Join to chat</p>
                <p className="text-xs text-slate-500 mt-1">Members-only content</p>
                <Button className="mt-4" onClick={handleJoin}>Join Group</Button>
              </Card>
            ) : group.conversationId ? (
              <GroupChat conversationId={group.conversationId} />
            ) : (
              <Card className="text-center py-12">
                <p className="text-sm font-semibold text-slate-900">Chat not available</p>
                <p className="text-xs text-slate-500 mt-1">This group doesn't have an active chat room yet.</p>
              </Card>
            )}
          </div>
        ) : (
          /* Members Tab */
          <Card padding="p-0">
            {!group.members || group.members.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">No members yet</div>
            ) : (
              group.members.map((member, i) => {
                const isCoord = member.role === 'COORDINATOR';
                const memberId = member.user?.id || member.userId;
                const isMemberOnline = memberId === user?.id || onlineUsers.includes(memberId);
                return (
                  <Link
                    key={member.id}
                    to={`/profile/${memberId}`}
                    className={cn(
                      'flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors',
                      i !== 0 && 'border-t border-slate-100'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        name={member.user?.name || ''}
                        src={member.user?.avatarUrl}
                        size="md"
                        online={isMemberOnline}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 truncate">{member.user?.name}</p>
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                            isMemberOnline
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          )}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', isMemberOnline ? 'bg-emerald-500' : 'bg-slate-400')} />
                            {isMemberOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        {member.user?.department && (
                          <p className="text-xs text-slate-500 truncate">{member.user.department}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={isCoord ? 'violet' : 'slate'} size="sm">
                        {isCoord ? <Crown className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {isCoord ? 'Coordinator' : 'Member'}
                      </Badge>
                      {isCoordinator && !isCoord && (
                        <button
                          onClick={(e) => handleRemoveMember(e, member.userId)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </Card>
        )}
      </div>

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slideUp border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">Edit Group Settings</h2>
              <button onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Group Name</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all" style={{ '--tw-ring-color': 'rgba(26,43,107,0.15)' }} onFocus={(e) => { e.target.style.borderColor='#1a2b6b'; }} onBlur={(e) => { e.target.style.borderColor=''; }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent resize-none transition-all" style={{ '--tw-ring-color': 'rgba(26,43,107,0.15)' }} onFocus={(e) => { e.target.style.borderColor='#1a2b6b'; }} onBlur={(e) => { e.target.style.borderColor=''; }}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setShowEdit(false)} type="button">Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
