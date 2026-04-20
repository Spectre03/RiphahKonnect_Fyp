import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsAPI } from '../services/api';
import { timeAgo } from '../utils/brand';
import { cn } from '../utils/cn';
import { Card, Button, Badge, Avatar } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Heart,
  MessageCircle,
  Send,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Newspaper,
  HelpCircle,
  BookOpen,
  Megaphone,
  ImagePlus,
} from 'lucide-react';

const POST_TYPES = [
  { value: 'ALL', label: 'All', icon: Newspaper },
  { value: 'GENERAL', label: 'General', icon: Newspaper },
  { value: 'QUESTION', label: 'Questions', icon: HelpCircle },
  { value: 'RESOURCE', label: 'Resources', icon: BookOpen },
  { value: 'ANNOUNCEMENT', label: 'Announcements', icon: Megaphone },
];

const TYPE_BADGE_MAP = {
  GENERAL: { variant: 'slate', label: 'General' },
  QUESTION: { variant: 'blue', label: 'Question' },
  RESOURCE: { variant: 'purple', label: 'Resource' },
  ANNOUNCEMENT: { variant: 'amber', label: 'Announcement' },
};

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

  const fetchPosts = async (p = 1) => {
    try {
      setLoading(true);
      const res = await postsAPI.getFeed(p);
      setPosts(p === 1 ? res.data.posts : [...posts, ...res.data.posts]);
      setPagination(res.data.pagination);
      setPage(p);
    } catch {
      toast.error('Failed to load posts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    try {
      setPosting(true);
      const res = await postsAPI.create({ content: newPost, type: postType });
      setPosts([{ ...res.data.post, likesCount: 0, commentsCount: 0, isLiked: false }, ...posts]);
      setNewPost('');
      setPostType('GENERAL');
      toast.success('Post created!');
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
    } catch {
      toast.error('Failed to like post.');
    }
  };

  const handleDelete = async (postId) => {
    if (!confirm('Delete this post?')) return;
    try {
      await postsAPI.delete(postId);
      setPosts(posts.filter((p) => p.id !== postId));
      toast.success('Post deleted.');
    } catch {
      toast.error('Failed to delete post.');
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const filteredPosts = filterType === 'ALL'
    ? posts
    : posts.filter((p) => p.type === filterType);

  return (
    <div className="rc-fade-in">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Composer */}
        <Card padding="p-0" className="mb-5">
          <form onSubmit={handleCreatePost}>
            <div className="p-4 pb-0">
              <div className="flex gap-3">
                <Avatar name={user?.name || ''} size="md" className="flex-shrink-0 mt-1" />
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Share something with the community..."
                  rows={3}
                  className="w-full min-w-0 rounded-xl border-0 bg-slate-50 px-4 py-3 text-sm placeholder-slate-400 focus:bg-slate-100 focus:outline-none resize-none transition-all"
                />
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 mt-3">
              <div className="flex items-center gap-1 overflow-x-auto">
                {POST_TYPES.filter((t) => t.value !== 'ALL').map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setPostType(t.value)}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
                        postType === t.value
                          ? 'bg-teal-50 text-teal-700'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <Button
                type="submit"
                disabled={posting || !newPost.trim()}
                loading={posting}
                icon={Send}
                size="sm"
                className="flex-shrink-0 ml-2"
              >
                Post
              </Button>
            </div>
          </form>
        </Card>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 mb-5 bg-white rounded-xl border border-slate-200/60 p-1 shadow-sm overflow-x-auto">
          {POST_TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                onClick={() => setFilterType(t.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
                  filterType === t.value
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Posts */}
        {loading && page === 1 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
            <p className="text-sm text-slate-400 mt-3">Loading posts...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <Card className="text-center py-16">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Newspaper className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-base font-semibold text-slate-900">No posts yet</p>
            <p className="text-sm text-slate-500 mt-1">
              {filterType === 'ALL' ? 'Be the first to share something!' : `No ${filterType.toLowerCase()} posts yet.`}
            </p>
          </Card>
        ) : (
          <div className="space-y-4 rc-stagger">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={user}
                onLike={handleLike}
                onDelete={handleDelete}
                isCommentsExpanded={expandedComments[post.id]}
                onToggleComments={toggleComments}
              />
            ))}

            {filterType === 'ALL' && pagination && page < pagination.totalPages && (
              <div className="flex justify-center pt-4">
                <Button variant="secondary" onClick={() => fetchPosts(page + 1)} loading={loading}>
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, currentUser, onLike, onDelete, isCommentsExpanded, onToggleComments }) {
  const typeBadge = TYPE_BADGE_MAP[post.type] || TYPE_BADGE_MAP.GENERAL;

  return (
    <Card hover padding="p-0">
      <div className="p-5">
        {/* Author */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link to={`/profile/${post.author?.id}`} className="flex-shrink-0">
              <Avatar name={post.author?.name || ''} src={post.author?.avatarUrl} size="md" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={`/profile/${post.author?.id}`} className="text-sm font-bold text-slate-900 hover:text-teal-600 transition-colors truncate">
                  {post.author?.name}
                </Link>
                <Badge variant={typeBadge.variant} size="sm">{typeBadge.label}</Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                {post.author?.department && (
                  <><span className="text-teal-600 font-medium truncate max-w-[140px] inline-block">{post.author.department}</span><span className="text-slate-300">·</span></>
                )}
                <span className="flex-shrink-0">{timeAgo(post.createdAt)}</span>
              </div>
            </div>
          </div>
          {post.author?.id === currentUser?.id && (
            <button onClick={() => onDelete(post.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors flex-shrink-0">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <p className="mt-3.5 text-[15px] text-slate-800 whitespace-pre-wrap leading-relaxed break-words">{post.content}</p>
        {post.imageUrl && (
          <img src={post.imageUrl} alt="" className="mt-3 rounded-xl w-full object-cover max-h-96" />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 px-5 py-2.5 border-t border-slate-100 bg-slate-50/30">
        <button
          onClick={() => onLike(post.id)}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all',
            post.isLiked
              ? 'text-red-500 bg-red-50 hover:bg-red-100'
              : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
          )}
        >
          <Heart className={cn('h-4 w-4 transition-transform', post.isLiked && 'fill-current scale-110')} />
          {post.likesCount || 0}
        </button>
        <button
          onClick={() => onToggleComments(post.id)}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors',
            isCommentsExpanded ? 'text-teal-600 bg-teal-50' : 'text-slate-400 hover:text-teal-600 hover:bg-teal-50'
          )}
        >
          <MessageCircle className="h-4 w-4" />
          {post.commentsCount || 0}
          {isCommentsExpanded ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />}
        </button>
      </div>

      {isCommentsExpanded && (
        <div className="border-t border-slate-100">
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
    const load = async () => {
      try {
        const res = await postsAPI.getComments(postId);
        setComments(res.data.comments);
      } catch {
        toast.error('Failed to load comments.');
      } finally {
        setLoading(false);
      }
    };
    load();
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
    } catch {
      toast.error('Failed to delete comment.');
    }
  };

  return (
    <div className="p-5 bg-slate-50/50">
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5">
              <Avatar name={comment.author?.name || ''} size="sm" className="mt-0.5" />
              <div className="flex-1 min-w-0 bg-white rounded-xl px-3.5 py-2.5 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-900 truncate">{comment.author?.name}</p>
                  {comment.author?.id === currentUser?.id && (
                    <button onClick={() => handleDelete(comment.id)} className="text-slate-300 hover:text-red-500 cursor-pointer transition-colors flex-shrink-0">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-0.5 break-words">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
        <Avatar name={currentUser?.name || ''} size="sm" className="mt-0.5 flex-shrink-0" />
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="px-3.5 py-2.5 rounded-xl bg-teal-600 text-white text-sm hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex-shrink-0 shadow-sm"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
