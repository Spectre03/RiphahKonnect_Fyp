import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { postsAPI } from '../services/api';
import { timeAgo } from '../utils/brand';
import { cn } from '../utils/cn';
import { checkTextContent, validateImageFile, fileToDataUrl } from '../utils/moderation';
import { Card, Button, Avatar } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Heart, MessageCircle, Send, Trash2, Loader2,
  ChevronDown, ChevronUp, Newspaper, HelpCircle, BookOpen,
  Globe, Image as ImageIcon, Link2, ExternalLink, X, ShieldCheck,
} from 'lucide-react';

const POST_TYPES = [
  { value: 'ALL',      label: 'All',       icon: Globe },
  { value: 'GENERAL',  label: 'General',   icon: Newspaper },
  { value: 'QUESTION', label: 'Questions', icon: HelpCircle },
  { value: 'RESOURCE', label: 'Resources', icon: BookOpen },
];

const TYPE_CONFIG = {
  GENERAL:  {
    variant: 'slate',
    label: 'General Update',
    bg: 'bg-slate-100',
    icon: Newspaper,
    iconColor: 'text-slate-600',
    accent: 'bg-slate-400',
    hint: 'Share a campus update, discussion, or photo with students & faculty.',
    placeholder: 'Share a campus update, experience, or announcement with your peers...',
  },
  QUESTION: {
    variant: 'blue',
    label: 'Academic Question',
    bg: 'bg-blue-50',
    icon: HelpCircle,
    iconColor: 'text-blue-600',
    accent: 'bg-blue-500',
    hint: 'Ask an academic or campus question. Peers & teachers can post answers below.',
    placeholder: 'Ask a question (e.g., "How should we prepare for the CS301 Data Structures Viva?")...',
  },
  RESOURCE: {
    variant: 'violet',
    label: 'Study Resource',
    bg: 'bg-violet-50',
    icon: BookOpen,
    iconColor: 'text-violet-600',
    accent: 'bg-violet-500',
    hint: 'Include a Resource Link (Drive, GitHub, PDF, Docs) or attach a Resource Picture.',
    placeholder: 'Describe this study resource, lecture notes, or reference material...',
  },
};

const CAN_MOD_DELETE = ['UNIVERSITY_ADMIN', 'SYSTEM_ADMIN', 'COORDINATION'];
const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

function extractUrls(text = '') {
  return text.match(URL_REGEX) || [];
}

function renderTextWithLinks(text = '') {
  const parts = text.split(URL_REGEX);
  return parts.map((part, idx) => {
    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-800 underline break-all font-semibold"
        >
          {part}
        </a>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState('GENERAL');
  const [resourceLink, setResourceLink] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [filterType, setFilterType] = useState('ALL');
  const fileInputRef = useRef(null);

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

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.reason);
      e.target.value = '';
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setImagePreview(dataUrl);
    } catch {
      toast.error('Failed to read image file.');
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    const trimmed = newPost.trim();
    const trimmedLink = resourceLink.trim();
    const hasImage = Boolean(imagePreview);

    if (!trimmed && !hasImage && !trimmedLink) {
      toast.error('Please write something or attach a picture before posting.');
      return;
    }

    // 1. Check profanity & gibberish/spam if text is provided
    if (trimmed) {
      const modCheck = checkTextContent(trimmed, { minLength: 1, fieldName: 'Post content' });
      if (!modCheck.clean) {
        toast.error(modCheck.reason);
        return;
      }
    }

    // 2. Type-specific validation
    let finalContent = trimmed;

    if (postType === 'QUESTION') {
      if (trimmed.length < 3) {
        toast.error('Please write a clear question (at least 3 characters).');
        return;
      }
      if (!finalContent.endsWith('?')) {
        finalContent = `${finalContent}?`;
      }
    } else if (postType === 'RESOURCE') {
      const normalizedLink = trimmedLink && !/^https?:\/\//i.test(trimmedLink)
        ? `https://${trimmedLink}`
        : trimmedLink;
      const hasUrlInText = /https?:\/\/[^\s]+/i.test(finalContent);
      const hasValidLinkField = /^https?:\/\/[^\s]+/i.test(normalizedLink);

      if (!hasValidLinkField && !hasUrlInText && !hasImage) {
        toast.error('A Resource post must include a resource link (https://...) or an attached picture/study material.');
        return;
      }
      if (hasValidLinkField && !finalContent.includes(normalizedLink)) {
        finalContent = finalContent
          ? `${finalContent}\n\n📎 Resource Link: ${normalizedLink}`
          : `📎 Resource Link: ${normalizedLink}`;
      }
    }

    try {
      setPosting(true);
      const payload = {
        content: finalContent,
        type: postType,
        ...(imagePreview ? { imageUrl: imagePreview } : {}),
      };
      const res = await postsAPI.create(payload);
      setPosts([{ ...res.data.post, likesCount: 0, commentsCount: 0, isLiked: false }, ...posts]);
      setNewPost('');
      setResourceLink('');
      setImagePreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success(
        postType === 'QUESTION'
          ? 'Question posted!'
          : postType === 'RESOURCE'
          ? 'Study resource shared!'
          : 'Post shared!'
      );
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create post.');
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

  const handleCommentCountChange = (postId, delta) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 0) + delta) } : p
      )
    );
  };

  const filteredPosts = posts;
  const activeTypeConfig = TYPE_CONFIG[postType] || TYPE_CONFIG.GENERAL;

  return (
    <div className="page-wrapper">
      {/* ── Gradient Banner ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c1a4a 0%, #1a2b6b 100%)' }}>
        <div className="absolute inset-0 banner-grid pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(201,151,58,0.08) 0%, transparent 70%)' }} />
          <div className="absolute -left-16 bottom-0 w-64 h-64 rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(26,43,107,0.5) 0%, transparent 70%)' }} />
        </div>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest block mb-2" style={{ color: '#c9973a' }}>Academic Platform</span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Community Feed</h1>
              <p className="text-slate-400 text-sm mt-2">Share updates, ask academic questions, and post verified study resources</p>
            </div>
            {pagination && (
              <div className="hidden sm:flex items-center gap-2 backdrop-blur-sm border rounded-2xl px-4 py-3 flex-shrink-0 animate-popIn" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }}>
                <Newspaper className="h-5 w-5" style={{ color: '#c9973a' }} />
                <div>
                  <span className="text-2xl font-extrabold text-white leading-none">{pagination.total}</span>
                  <p className="text-[11px] font-medium" style={{ color: '#c9973a' }}>Total Posts</p>
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
              {/* Mode indicator bar */}
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                  <activeTypeConfig.icon size={13} className={activeTypeConfig.iconColor} />
                  <span>Posting as: <span className={activeTypeConfig.iconColor}>{activeTypeConfig.label}</span></span>
                </div>
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-600" /> Content &amp; image safety active
                </span>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex gap-3">
                  <Avatar name={user?.name || ''} src={user?.avatarUrl} size="md" className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <textarea
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder={activeTypeConfig.placeholder}
                      rows={newPost ? 3 : 2}
                      className="w-full rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm font-medium placeholder-slate-400 focus:bg-white focus:border-[#1a2b6b] focus:outline-none resize-none transition-all leading-relaxed"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />

                    <p className="text-[11px] text-slate-400 font-medium px-1">
                      {activeTypeConfig.hint}
                    </p>

                    {/* Resource Link input when RESOURCE mode is active */}
                    {postType === 'RESOURCE' && (
                      <div className="relative">
                        <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-500 pointer-events-none" />
                        <input
                          type="text"
                          value={resourceLink}
                          onChange={(e) => setResourceLink(e.target.value)}
                          placeholder="Resource URL (e.g. https://drive.google.com/... or https://github.com/...)"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-violet-200 bg-violet-50/40 text-sm font-medium placeholder-slate-400 focus:border-violet-500 focus:bg-white focus:outline-none transition-all"
                        />
                      </div>
                    )}

                    {/* Attached Image Preview */}
                    {imagePreview && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-60">
                        <img src={imagePreview} alt="Upload preview" className="w-full max-h-60 object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/75 text-white hover:bg-red-600 transition-colors cursor-pointer"
                          title="Remove picture"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Post controls */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50/60 border-t border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-1 flex-wrap">
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
                          active
                            ? 'text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                        )}
                        style={active ? { background: 'linear-gradient(135deg, #1a2b6b, #2251b8)' } : {}}
                      >
                        <Icon size={12} />
                        {t.label}
                      </button>
                    );
                  })}

                  {/* Picture Upload Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ml-1 border',
                      imagePreview
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'text-slate-600 border-slate-200 bg-white hover:bg-slate-100'
                    )}
                    title="Attach a picture (JPEG, PNG, WEBP up to 5MB)"
                  >
                    <ImageIcon size={13} />
                    <span>{imagePreview ? 'Picture Attached' : 'Add Picture'}</span>
                  </button>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={posting || (!newPost.trim() && !imagePreview && !resourceLink.trim())}
                  loading={posting}
                  icon={Send}
                >
                  {postType === 'QUESTION' ? 'Ask Question' : postType === 'RESOURCE' ? 'Share Resource' : 'Post'}
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
                  active ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                )}
                style={active ? { background: 'linear-gradient(135deg, #1a2b6b, #2251b8)' } : {}}
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
                onCommentCountChange={handleCommentCountChange}
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

function PostCard({ post, currentUser, canModDelete, onLike, onDelete, onCommentCountChange, isCommentsExpanded, onToggleComments }) {
  const cfg = TYPE_CONFIG[post.type] || TYPE_CONFIG.GENERAL;
  const TypeIcon = cfg.icon;
  const isOwner = post.author?.id === currentUser?.id;
  const showDelete = isOwner || canModDelete;
  const urls = extractUrls(post.content);

  return (
    <Card hover padding="p-0" className="relative overflow-hidden">
      {/* Type accent strip */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-[4px]', cfg.accent)} />
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
                  className="text-sm font-bold text-slate-900 hover:text-[#1a2b6b] transition-colors"
                >
                  {post.author?.name}
                </Link>
                <div className={cn('flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold', cfg.bg, cfg.iconColor)}>
                  <TypeIcon size={10} />
                  {cfg.label}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                {post.author?.department && (
                  <span className="text-[#1a2b6b] font-semibold truncate max-w-[160px]">{post.author.department}</span>
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

        {/* Distinct Question Callout or Standard Content */}
        {post.type === 'QUESTION' ? (
          <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3.5 mb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">
              <HelpCircle size={13} /> Question for the Community
            </div>
            <p className="text-[15px] font-semibold text-slate-900 whitespace-pre-wrap leading-relaxed break-words">
              {renderTextWithLinks(post.content)}
            </p>
          </div>
        ) : (
          <p className="text-[15px] text-slate-800 whitespace-pre-wrap leading-relaxed break-words">
            {renderTextWithLinks(post.content)}
          </p>
        )}

        {/* Resource Link Attachment Card */}
        {post.type === 'RESOURCE' && urls.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-violet-50/70 border border-violet-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-violet-600 text-white flex items-center justify-center flex-shrink-0">
                <BookOpen size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-violet-950">Attached Academic Resource</p>
                <p className="text-[11px] text-violet-700 truncate">{urls[0]}</p>
              </div>
            </div>
            <a
              href={urls[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex-shrink-0 transition-colors"
            >
              <span>Open</span>
              <ExternalLink size={12} />
            </a>
          </div>
        )}

        {/* Attached Post Image */}
        {post.imageUrl && (
          <div className="mt-3 rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
            <img src={post.imageUrl} alt="Post attachment" className="w-full object-cover max-h-96" />
          </div>
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
            isCommentsExpanded ? 'text-[#1a2b6b] bg-indigo-50' : 'text-slate-500 hover:text-[#1a2b6b] hover:bg-indigo-50'
          )}
        >
          <MessageCircle size={14} />
          <span>
            {post.commentsCount || 0}{' '}
            {post.type === 'QUESTION'
              ? post.commentsCount === 1 ? 'Answer' : 'Answers'
              : post.commentsCount === 1 ? 'Comment' : 'Comments'}
          </span>
          {isCommentsExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {isCommentsExpanded && (
        <div className="border-t border-slate-50">
          <CommentsSection
            postId={post.id}
            postType={post.type}
            currentUser={currentUser}
            onCommentCountChange={onCommentCountChange}
          />
        </div>
      )}
    </Card>
  );
}

function CommentsSection({ postId, postType, currentUser, onCommentCountChange }) {
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

    const modCheck = checkTextContent(newComment, { minLength: 2, fieldName: postType === 'QUESTION' ? 'Answer' : 'Comment' });
    if (!modCheck.clean) {
      toast.error(modCheck.reason);
      return;
    }

    try {
      setSubmitting(true);
      const res = await postsAPI.addComment(postId, { content: newComment.trim() });
      setComments([...comments, res.data.comment]);
      setNewComment('');
      onCommentCountChange?.(postId, 1);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await postsAPI.deleteComment(commentId);
      setComments(comments.filter((c) => c.id !== commentId));
      onCommentCountChange?.(postId, -1);
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
        <p className="text-xs text-slate-400 text-center py-2 mb-3">
          {postType === 'QUESTION' ? 'No answers yet. Be the first to help!' : 'No comments yet. Be the first!'}
        </p>
      )}

      {currentUser && (
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <Avatar name={currentUser?.name || ''} size="sm" className="flex-shrink-0" />
          <div className="flex-1 min-w-0 relative">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={postType === 'QUESTION' ? 'Write a helpful answer...' : 'Write a comment...'}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium placeholder-slate-400 focus:border-[#1a2b6b] focus:outline-none focus:ring-2 focus:ring-indigo-500/15 transition-all pr-10"
              style={{ fontFamily: 'var(--font-sans)' }}
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              style={{ background: '#1a2b6b' }}
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
