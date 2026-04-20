import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupsAPI, postsAPI } from '../services/api';
import { timeAgo } from '../utils/brand';
import { cn } from '../utils/cn';
import { Card, Button, Badge, Avatar } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Users,
  ArrowLeft,
  Send,
  Heart,
  MessageCircle,
  Trash2,
  Loader2,
  Lock,
  Globe,
  BookOpen,
  Crown,
  Shield,
  User,
} from 'lucide-react';

export default function GroupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [tab, setTab] = useState('posts');

  useEffect(() => {
    const load = async () => {
      try {
        const [groupRes, postsRes] = await Promise.all([
          groupsAPI.get(id),
          groupsAPI.getPosts(id),
        ]);
        setGroup(groupRes.data.group);
        setPosts(postsRes.data.posts);
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
      toast.success('Posted to group!');
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
    try {
      await groupsAPI.leave(id);
      setGroup({ ...group, isMember: false, myRole: null, memberCount: group.memberCount - 1 });
      toast.success('Left the group.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to leave.');
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

  const roleIcon = { OWNER: Crown, ADMIN: Shield, MEMBER: User };
  const roleColor = {
    OWNER: 'bg-amber-50 text-amber-600 border-amber-200',
    ADMIN: 'bg-teal-50 text-teal-600 border-teal-200',
    MEMBER: 'bg-slate-50 text-slate-500 border-slate-200',
  };

  return (
    <div className="rc-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Back */}
        <button
          onClick={() => navigate('/groups')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 cursor-pointer transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Groups
        </button>

        {/* Group Header */}
        <Card padding="p-0" className="mb-6">
          <div className="h-24 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-8">
              <div className="flex items-end gap-4 min-w-0">
                <div className="h-16 w-16 rounded-2xl bg-white shadow-lg border-4 border-white flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <div className="pb-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h1 className="text-xl font-bold text-slate-900 truncate">{group.name}</h1>
                    {group.isPrivate ? <Lock className="h-4 w-4 text-slate-400 flex-shrink-0" /> : <Globe className="h-4 w-4 text-slate-400 flex-shrink-0" />}
                  </div>
                  {group.subject && (
                    <p className="text-sm text-blue-600 font-semibold truncate">{group.subject}</p>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 ml-3">
                {group.isMember ? (
                  group.myRole !== 'OWNER' && (
                    <Button variant="danger" size="sm" onClick={handleLeave}>Leave</Button>
                  )
                ) : (
                  <Button onClick={handleJoin}>Join Group</Button>
                )}
              </div>
            </div>
            {group.description && (
              <p className="text-sm text-slate-500 mt-4 leading-relaxed break-words">{group.description}</p>
            )}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
              <span className="text-sm text-slate-500 flex items-center gap-1.5 font-medium">
                <Users className="h-4 w-4 text-slate-400" /> {group.memberCount} members
              </span>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200/60 p-1 mb-6 shadow-sm">
          {[
            { key: 'posts', label: 'Posts' },
            { key: 'members', label: 'Members' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex-1 py-2.5 text-sm font-semibold rounded-lg cursor-pointer transition-all',
                tab === t.key
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'posts' ? (
          <>
            {/* Create post */}
            {group.isMember && (
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
                    <Button type="submit" disabled={posting || !newPost.trim()} loading={posting} icon={Send} size="sm">
                      Post
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Posts */}
            {posts.length === 0 ? (
              <Card className="text-center py-16">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-900">No posts in this group yet</p>
                <p className="text-xs text-slate-500 mt-1">Be the first to start a discussion!</p>
              </Card>
            ) : (
              <div className="space-y-4 rc-stagger">
                {posts.map((post) => (
                  <Card key={post.id} hover padding="p-0">
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <Link to={`/profile/${post.author?.id}`} className="flex-shrink-0">
                            <Avatar name={post.author?.name || ''} size="md" />
                          </Link>
                          <div className="min-w-0">
                            <Link
                              to={`/profile/${post.author?.id}`}
                              className="text-sm font-bold text-slate-900 hover:text-teal-600 transition-colors truncate block"
                            >
                              {post.author?.name}
                            </Link>
                            <p className="text-xs text-slate-400">{timeAgo(post.createdAt)}</p>
                          </div>
                        </div>
                        {post.author?.id === user?.id && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <p className="mt-3 text-[15px] text-slate-800 whitespace-pre-wrap leading-relaxed break-words">
                        {post.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 px-5 py-2.5 border-t border-slate-100 bg-slate-50/30">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={cn(
                          'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all',
                          post.isLiked
                            ? 'text-red-500 bg-red-50 hover:bg-red-100'
                            : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                        )}
                      >
                        <Heart className={cn('h-4 w-4', post.isLiked && 'fill-current')} /> {post.likesCount}
                      </button>
                      <span className="flex items-center gap-1.5 px-3.5 py-2 text-sm text-slate-400 font-medium">
                        <MessageCircle className="h-4 w-4" /> {post.commentsCount}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Members Tab */
          <Card padding="p-0">
            {group.members?.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">No members yet</div>
            ) : (
              group.members?.map((member, i) => {
                const RoleIcon = roleIcon[member.role] || User;
                return (
                  <Link
                    key={member.id}
                    to={`/profile/${member.user?.id}`}
                    className={cn(
                      'flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors',
                      i !== 0 && 'border-t border-slate-100'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={member.user?.name || ''} size="md" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{member.user?.name}</p>
                        {member.user?.department && (
                          <p className="text-xs text-slate-500 truncate">{member.user.department}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={member.role === 'OWNER' ? 'amber' : member.role === 'ADMIN' ? 'teal' : 'slate'} size="sm">
                      <RoleIcon className="h-3 w-3" />
                      {member.role}
                    </Badge>
                  </Link>
                );
              })
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
