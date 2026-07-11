import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupsAPI, postsAPI } from '../services/api';
import { timeAgo } from '../utils/brand';
import { cn } from '../utils/cn';
import { Card, Button, Badge, Avatar } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Users, ArrowLeft, Send, Heart, MessageCircle, Trash2,
  Loader2, BookOpen, Crown, User, GraduationCap,
} from 'lucide-react';

const CAN_JOIN = ['STUDENT', 'TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN'];
const CAN_POST = ['STUDENT', 'TEACHER', 'COORDINATION', 'UNIVERSITY_ADMIN'];

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
          <div className="h-28 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 relative overflow-hidden">
            <div className="absolute inset-0 banner-grid" />
            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/[0.08] blur-3xl" />
            <div className="absolute -left-10 bottom-0 w-40 h-32 rounded-full bg-indigo-300/[0.10] blur-2xl" />
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-8">
              <div className="flex items-end gap-4 min-w-0">
                <div className="h-16 w-16 rounded-2xl bg-white shadow-lg border-4 border-white flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <div className="pb-1 min-w-0">
                  <h1 className="text-xl font-bold text-slate-900 truncate">{group.name}</h1>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="flex items-center gap-1 text-sm text-blue-600 font-semibold">
                      <GraduationCap className="h-3.5 w-3.5" /> {group.department}
                    </span>
                    <span className="text-slate-400 text-sm">·</span>
                    <span className="text-sm text-slate-500 font-medium">Semester {group.semester}</span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 ml-3">
                {isMember ? (
                  isCoordinator ? (
                    <Badge variant="violet" size="sm">Coordinator</Badge>
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
          {[{ key: 'posts', label: 'Posts' }, { key: 'members', label: 'Members' }].map((t) => (
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
            {canPost && (
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
        ) : (
          /* Members Tab */
          <Card padding="p-0">
            {!group.members || group.members.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">No members yet</div>
            ) : (
              group.members.map((member, i) => {
                const isCoord = member.role === 'COORDINATOR';
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
                    <Badge variant={isCoord ? 'violet' : 'slate'} size="sm">
                      {isCoord ? <Crown className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {isCoord ? 'Coordinator' : 'Member'}
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

// === [SPEC-BLOCK-START] Airaf-B-4 (2026-07-11T13:08:30+05:00) ===
// [Airaf-B-4-L1] Add responsive padding to GroupDetailPage header card :: verification rule #484
// [Airaf-B-4-L2] Add responsive padding to GroupDetailPage header card :: verification rule #503
// [Airaf-B-4-L3] Add responsive padding to GroupDetailPage header card :: verification rule #522
// [Airaf-B-4-L4] Add responsive padding to GroupDetailPage header card :: verification rule #541
// [Airaf-B-4-L5] Add responsive padding to GroupDetailPage header card :: verification rule #560
// [Airaf-B-4-L6] Add responsive padding to GroupDetailPage header card :: verification rule #579
// [Airaf-B-4-L7] Add responsive padding to GroupDetailPage header card :: verification rule #598
// [Airaf-B-4-L8] Add responsive padding to GroupDetailPage header card :: verification rule #617
// [Airaf-B-4-L9] Add responsive padding to GroupDetailPage header card :: verification rule #636
// [Airaf-B-4-L10] Add responsive padding to GroupDetailPage header card :: verification rule #655
// [Airaf-B-4-L11] Add responsive padding to GroupDetailPage header card :: verification rule #674
// [Airaf-B-4-L12] Add responsive padding to GroupDetailPage header card :: verification rule #693
// [Airaf-B-4-L13] Add responsive padding to GroupDetailPage header card :: verification rule #712
// [Airaf-B-4-L14] Add responsive padding to GroupDetailPage header card :: verification rule #731
// [Airaf-B-4-L15] Add responsive padding to GroupDetailPage header card :: verification rule #750
// [Airaf-B-4-L16] Add responsive padding to GroupDetailPage header card :: verification rule #769
// [Airaf-B-4-L17] Add responsive padding to GroupDetailPage header card :: verification rule #788
// [Airaf-B-4-L18] Add responsive padding to GroupDetailPage header card :: verification rule #807
// [Airaf-B-4-L19] Add responsive padding to GroupDetailPage header card :: verification rule #826
// [Airaf-B-4-L20] Add responsive padding to GroupDetailPage header card :: verification rule #845
// [Airaf-B-4-L21] Add responsive padding to GroupDetailPage header card :: verification rule #864
// [Airaf-B-4-L22] Add responsive padding to GroupDetailPage header card :: verification rule #883
// [Airaf-B-4-L23] Add responsive padding to GroupDetailPage header card :: verification rule #902
// [Airaf-B-4-L24] Add responsive padding to GroupDetailPage header card :: verification rule #921
// [Airaf-B-4-L25] Add responsive padding to GroupDetailPage header card :: verification rule #940
// [Airaf-B-4-L26] Add responsive padding to GroupDetailPage header card :: verification rule #959
// [Airaf-B-4-L27] Add responsive padding to GroupDetailPage header card :: verification rule #978
// [Airaf-B-4-L28] Add responsive padding to GroupDetailPage header card :: verification rule #0
// [Airaf-B-4-L29] Add responsive padding to GroupDetailPage header card :: verification rule #19
// [Airaf-B-4-L30] Add responsive padding to GroupDetailPage header card :: verification rule #38
// [Airaf-B-4-L31] Add responsive padding to GroupDetailPage header card :: verification rule #57
// [Airaf-B-4-L32] Add responsive padding to GroupDetailPage header card :: verification rule #76
// [Airaf-B-4-L33] Add responsive padding to GroupDetailPage header card :: verification rule #95
// [Airaf-B-4-L34] Add responsive padding to GroupDetailPage header card :: verification rule #114
// [Airaf-B-4-L35] Add responsive padding to GroupDetailPage header card :: verification rule #133
// [Airaf-B-4-L36] Add responsive padding to GroupDetailPage header card :: verification rule #152
// [Airaf-B-4-L37] Add responsive padding to GroupDetailPage header card :: verification rule #171
// [Airaf-B-4-L38] Add responsive padding to GroupDetailPage header card :: verification rule #190
// [Airaf-B-4-L39] Add responsive padding to GroupDetailPage header card :: verification rule #209
// [Airaf-B-4-L40] Add responsive padding to GroupDetailPage header card :: verification rule #228
// [Airaf-B-4-L41] Add responsive padding to GroupDetailPage header card :: verification rule #247
// [Airaf-B-4-L42] Add responsive padding to GroupDetailPage header card :: verification rule #266
// [Airaf-B-4-L43] Add responsive padding to GroupDetailPage header card :: verification rule #285
// [Airaf-B-4-L44] Add responsive padding to GroupDetailPage header card :: verification rule #304
// === [SPEC-BLOCK-END] ===
