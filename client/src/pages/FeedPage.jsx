import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsAPI } from '../services/api';
import { timeAgo } from '../utils/brand';
import { cn } from '../utils/cn';
import { Card, Button, Badge, Avatar } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Heart, MessageCircle, Send, Trash2, Loader2,
  ChevronDown, ChevronUp, Newspaper, HelpCircle, BookOpen,
  MoreHorizontal, Globe,
} from 'lucide-react';

const POST_TYPES = [
  { value: 'ALL',      label: 'All',       icon: Globe },
  { value: 'GENERAL',  label: 'General',   icon: Newspaper },
  { value: 'QUESTION', label: 'Questions', icon: HelpCircle },
  { value: 'RESOURCE', label: 'Resources', icon: BookOpen },
];

const TYPE_CONFIG = {
  GENERAL:  { variant: 'slate',   label: 'General',  bg: 'bg-slate-100',  icon: Newspaper,  iconColor: 'text-slate-500',  accent: 'bg-slate-300' },
  QUESTION: { variant: 'blue',    label: 'Question', bg: 'bg-blue-50',   icon: HelpCircle, iconColor: 'text-blue-600',   accent: 'bg-blue-400' },
  RESOURCE: { variant: 'violet',  label: 'Resource', bg: 'bg-violet-50', icon: BookOpen,   iconColor: 'text-violet-600', accent: 'bg-violet-500' },
};

const CAN_MOD_DELETE = ['UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'];

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState('GENERAL');
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [filterType, setFilterType] = useState('ALL');

  const fetchPosts = async (p = 1, type = filterType) => {
    try {
      setLoading(true);
      const res = await postsAPI.getFeed(p, type);
      if (p === 1) {
        setPosts(res.data.posts);
      } else {
        setPosts((prev) => [...prev, ...res.data.posts]);
      }
      setPagination(res.data.pagination);
      setPage(p);
    } catch {
      toast.error('Failed to load posts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(1, filterType); }, [filterType]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    try {
      setPosting(true);
      const res = await postsAPI.create({ content: newPost, type: postType });
      setPosts([{ ...res.data.post, likesCount: 0, commentsCount: 0, isLiked: false }, ...posts]);
      setNewPost('');
      setPostType('GENERAL');
      toast.success('Post shared!');
    } catch {
      toast.error('Failed to create post.');
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
    } catch { toast.error('Failed to like post.'); }
  };

  const handleDelete = async (postId) => {
    if (!confirm('Delete this post?')) return;
    try {
      await postsAPI.delete(postId);
      setPosts(posts.filter((p) => p.id !== postId));
      toast.success('Post deleted.');
    } catch { toast.error('Failed to delete post.'); }
  };

  // Posts are already filtered server-side; no client-side filter needed
  const filteredPosts = posts;

  return (
    <div className="page-wrapper">
      {/* ── Gradient Banner ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6d28d9 100%)' }}>
        <div className="absolute inset-0 banner-grid pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-white/[0.07] blur-3xl" />
          <div className="absolute -left-16 bottom-0 w-64 h-64 rounded-full bg-white/[0.05] blur-3xl" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 rounded-full bg-violet-400/[0.12] blur-3xl" />
        </div>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-300 block mb-2">Academic Platform</span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Community Feed</h1>
              <p className="text-indigo-200 text-sm mt-2">Share knowledge, ask questions, and connect with your peers</p>
            </div>
            {pagination && (
              <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 flex-shrink-0 animate-popIn">
                <Newspaper className="h-5 w-5 text-indigo-200" />
                <div>
                  <span className="text-2xl font-extrabold text-white leading-none">{pagination.total}</span>
                  <p className="text-[11px] text-indigo-300 font-medium">Total Posts</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Composer ── */}
        {user && (
          <Card padding="p-0" className="mb-5 overflow-hidden">
            <form onSubmit={handleCreatePost}>
              <div className="p-4">
                <div className="flex gap-3">
                  <Avatar name={user?.name || ''} size="md" className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <textarea
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder="Share something with the community..."
                      rows={newPost ? 3 : 2}
                      className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm font-medium placeholder-slate-400 focus:bg-slate-100/80 focus:outline-none resize-none transition-all leading-relaxed"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Post controls */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  {POST_TYPES.filter((t) => t.value !== 'ALL').map((t) => {
                    const Icon = t.icon;
                    const active = postType === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setPostType(t.value)}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                          active ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                        )}
                      >
                        <Icon size={12} />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={posting || !newPost.trim()}
                  loading={posting}
                  icon={Send}
                >
                  Post
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* ── Filter Tabs ── */}
        <div className="flex items-center gap-1 mb-5 bg-white rounded-2xl border border-slate-900/[0.06] p-1 shadow-sm overflow-x-auto">
          {POST_TYPES.map((t) => {
            const Icon = t.icon;
            const active = filterType === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setFilterType(t.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-shrink-0',
                  active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                )}
              >
                <Icon size={12} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── Posts ── */}
        {loading && page === 1 ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} padding="p-5">
                <div className="flex gap-3">
                  <div className="skeleton h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3.5 w-1/3 rounded" />
                    <div className="skeleton h-3 w-full rounded" />
                    <div className="skeleton h-3 w-4/5 rounded" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <Card className="text-center py-16">
            <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Newspaper size={24} className="text-slate-300" />
            </div>
            <p className="text-base font-bold text-slate-800">No posts yet</p>
            <p className="text-sm text-slate-400 mt-1">
              {filterType === 'ALL' ? 'Be the first to post something!' : `No ${filterType.toLowerCase()} posts yet.`}
            </p>
          </Card>
        ) : (
          <div className="space-y-4 stagger">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={user}
                canModDelete={CAN_MOD_DELETE.includes(user?.role)}
                onLike={handleLike}
                onDelete={handleDelete}
                isCommentsExpanded={expandedComments[post.id]}
                onToggleComments={(id) => setExpandedComments((p) => ({ ...p, [id]: !p[id] }))}
              />
            ))}

            {pagination && page < pagination.totalPages && (
              <div className="flex justify-center pt-2">
                <Button variant="secondary" onClick={() => fetchPosts(page + 1)} loading={loading}>
                  Load more posts
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

}

function PostCard({ post, currentUser, canModDelete, onLike, onDelete, isCommentsExpanded, onToggleComments }) {
  const cfg = TYPE_CONFIG[post.type] || TYPE_CONFIG.GENERAL;
  const TypeIcon = cfg.icon;
  const isOwner = post.author?.id === currentUser?.id;
  const showDelete = isOwner || canModDelete;

  return (
    <Card hover padding="p-0" className="relative overflow-hidden">
      {/* Type accent strip */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-[3px]', cfg.accent)} />
      <div className="p-5 pl-6">
        {/* Author row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to={`/profile/${post.author?.id}`} className="flex-shrink-0">
              <Avatar name={post.author?.name || ''} src={post.author?.avatarUrl} size="md" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/profile/${post.author?.id}`}
                  className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                >
                  {post.author?.name}
                </Link>
                <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold', cfg.bg, cfg.iconColor)}>
                  <TypeIcon size={10} />
                  {cfg.label}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                {post.author?.department && (
                  <span className="text-indigo-500 font-semibold truncate max-w-[140px]">{post.author.department}</span>
                )}
                {post.author?.department && <span className="text-slate-200">·</span>}
                <span>{timeAgo(post.createdAt)}</span>
              </div>
            </div>
          </div>
          {showDelete && (
            <button
              onClick={() => onDelete(post.id)}
              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-all flex-shrink-0"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Content */}
        <p className="text-[15px] text-slate-800 whitespace-pre-wrap leading-relaxed break-words">{post.content}</p>

        {post.imageUrl && (
          <img src={post.imageUrl} alt="" className="mt-3 rounded-xl w-full object-cover max-h-80 border border-slate-100" />
        )}
      </div>

      {/* Interactions bar */}
      <div className="flex items-center gap-1 px-5 pl-6 py-2.5 border-t border-slate-50 bg-slate-50/40">
        {currentUser ? (
          <button
            onClick={() => onLike(post.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all',
              post.isLiked
                ? 'text-red-500 bg-red-50 hover:bg-red-100'
                : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
            )}
          >
            <Heart size={14} className={post.isLiked ? 'fill-current' : ''} />
            <span>{post.likesCount || 0}</span>
          </button>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400">
            <Heart size={14} /> {post.likesCount || 0}
          </span>
        )}

        <button
          onClick={() => onToggleComments(post.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all',
            isCommentsExpanded ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
          )}
        >
          <MessageCircle size={14} />
          <span>{post.commentsCount || 0}</span>
          {isCommentsExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {isCommentsExpanded && (
        <div className="border-t border-slate-50">
          <CommentsSection postId={post.id} currentUser={currentUser} />
        </div>
      )}
    </Card>
  );
}

function CommentsSection({ postId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    postsAPI.getComments(postId)
      .then((res) => setComments(res.data.comments))
      .catch(() => toast.error('Failed to load comments.'))
      .finally(() => setLoading(false));
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      setSubmitting(true);
      const res = await postsAPI.addComment(postId, { content: newComment });
      setComments([...comments, res.data.comment]);
      setNewComment('');
    } catch {
      toast.error('Failed to add comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await postsAPI.deleteComment(commentId);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch { toast.error('Failed to delete comment.'); }
  };

  return (
    <div className="px-5 py-4 bg-slate-50/30">
      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 size={16} className="animate-spin text-slate-300" />
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-3 mb-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5">
              <Avatar name={comment.author?.name || ''} size="sm" className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0 bg-white rounded-xl px-3.5 py-2.5 border border-slate-100/80 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-bold text-slate-900">{comment.author?.name}</p>
                  {comment.author?.id === currentUser?.id && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-slate-300 hover:text-red-500 cursor-pointer transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-600 break-words leading-relaxed">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 text-center py-2 mb-3">No comments yet. Be the first!</p>
      )}

      {currentUser && (
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <Avatar name={currentUser?.name || ''} size="sm" className="flex-shrink-0" />
          <div className="flex-1 min-w-0 relative">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all pr-10"
              style={{ fontFamily: 'var(--font-sans)' }}
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
