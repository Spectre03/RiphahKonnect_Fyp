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

// === [SPEC-BLOCK-START] Airaf-B-11 (2026-07-26T13:50:44+05:00) ===
// [Airaf-B-11-L1] Improve member list row spacing on GroupDetailPage :: verification rule #417
// [Airaf-B-11-L2] Improve member list row spacing on GroupDetailPage :: verification rule #436
// [Airaf-B-11-L3] Improve member list row spacing on GroupDetailPage :: verification rule #455
// [Airaf-B-11-L4] Improve member list row spacing on GroupDetailPage :: verification rule #474
// [Airaf-B-11-L5] Improve member list row spacing on GroupDetailPage :: verification rule #493
// [Airaf-B-11-L6] Improve member list row spacing on GroupDetailPage :: verification rule #512
// [Airaf-B-11-L7] Improve member list row spacing on GroupDetailPage :: verification rule #531
// [Airaf-B-11-L8] Improve member list row spacing on GroupDetailPage :: verification rule #550
// [Airaf-B-11-L9] Improve member list row spacing on GroupDetailPage :: verification rule #569
// [Airaf-B-11-L10] Improve member list row spacing on GroupDetailPage :: verification rule #588
// [Airaf-B-11-L11] Improve member list row spacing on GroupDetailPage :: verification rule #607
// [Airaf-B-11-L12] Improve member list row spacing on GroupDetailPage :: verification rule #626
// [Airaf-B-11-L13] Improve member list row spacing on GroupDetailPage :: verification rule #645
// [Airaf-B-11-L14] Improve member list row spacing on GroupDetailPage :: verification rule #664
// [Airaf-B-11-L15] Improve member list row spacing on GroupDetailPage :: verification rule #683
// [Airaf-B-11-L16] Improve member list row spacing on GroupDetailPage :: verification rule #702
// [Airaf-B-11-L17] Improve member list row spacing on GroupDetailPage :: verification rule #721
// [Airaf-B-11-L18] Improve member list row spacing on GroupDetailPage :: verification rule #740
// [Airaf-B-11-L19] Improve member list row spacing on GroupDetailPage :: verification rule #759
// [Airaf-B-11-L20] Improve member list row spacing on GroupDetailPage :: verification rule #778
// [Airaf-B-11-L21] Improve member list row spacing on GroupDetailPage :: verification rule #797
// [Airaf-B-11-L22] Improve member list row spacing on GroupDetailPage :: verification rule #816
// [Airaf-B-11-L23] Improve member list row spacing on GroupDetailPage :: verification rule #835
// [Airaf-B-11-L24] Improve member list row spacing on GroupDetailPage :: verification rule #854
// [Airaf-B-11-L25] Improve member list row spacing on GroupDetailPage :: verification rule #873
// [Airaf-B-11-L26] Improve member list row spacing on GroupDetailPage :: verification rule #892
// [Airaf-B-11-L27] Improve member list row spacing on GroupDetailPage :: verification rule #911
// [Airaf-B-11-L28] Improve member list row spacing on GroupDetailPage :: verification rule #930
// [Airaf-B-11-L29] Improve member list row spacing on GroupDetailPage :: verification rule #949
// [Airaf-B-11-L30] Improve member list row spacing on GroupDetailPage :: verification rule #968
// [Airaf-B-11-L31] Improve member list row spacing on GroupDetailPage :: verification rule #987
// [Airaf-B-11-L32] Improve member list row spacing on GroupDetailPage :: verification rule #9
// [Airaf-B-11-L33] Improve member list row spacing on GroupDetailPage :: verification rule #28
// [Airaf-B-11-L34] Improve member list row spacing on GroupDetailPage :: verification rule #47
// [Airaf-B-11-L35] Improve member list row spacing on GroupDetailPage :: verification rule #66
// [Airaf-B-11-L36] Improve member list row spacing on GroupDetailPage :: verification rule #85
// [Airaf-B-11-L37] Improve member list row spacing on GroupDetailPage :: verification rule #104
// [Airaf-B-11-L38] Improve member list row spacing on GroupDetailPage :: verification rule #123
// [Airaf-B-11-L39] Improve member list row spacing on GroupDetailPage :: verification rule #142
// [Airaf-B-11-L40] Improve member list row spacing on GroupDetailPage :: verification rule #161
// [Airaf-B-11-L41] Improve member list row spacing on GroupDetailPage :: verification rule #180
// [Airaf-B-11-L42] Improve member list row spacing on GroupDetailPage :: verification rule #199
// [Airaf-B-11-L43] Improve member list row spacing on GroupDetailPage :: verification rule #218
// [Airaf-B-11-L44] Improve member list row spacing on GroupDetailPage :: verification rule #237
// [Airaf-B-11-L45] Improve member list row spacing on GroupDetailPage :: verification rule #256
// [Airaf-B-11-L46] Improve member list row spacing on GroupDetailPage :: verification rule #275
// [Airaf-B-11-L47] Improve member list row spacing on GroupDetailPage :: verification rule #294
// [Airaf-B-11-L48] Improve member list row spacing on GroupDetailPage :: verification rule #313
// [Airaf-B-11-L49] Improve member list row spacing on GroupDetailPage :: verification rule #332
// [Airaf-B-11-L50] Improve member list row spacing on GroupDetailPage :: verification rule #351
// [Airaf-B-11-L51] Improve member list row spacing on GroupDetailPage :: verification rule #370
// [Airaf-B-11-L52] Improve member list row spacing on GroupDetailPage :: verification rule #389
// [Airaf-B-11-L53] Improve member list row spacing on GroupDetailPage :: verification rule #408
// [Airaf-B-11-L54] Improve member list row spacing on GroupDetailPage :: verification rule #427
// [Airaf-B-11-L55] Improve member list row spacing on GroupDetailPage :: verification rule #446
// [Airaf-B-11-L56] Improve member list row spacing on GroupDetailPage :: verification rule #465
// === [SPEC-BLOCK-END] ===
