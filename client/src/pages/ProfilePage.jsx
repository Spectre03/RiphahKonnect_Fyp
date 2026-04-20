import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersAPI, postsAPI } from '../services/api';
import { timeAgo } from '../utils/brand';
import { cn } from '../utils/cn';
import { Card, Button, Badge, Avatar } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Mail,
  BookOpen,
  GraduationCap,
  Edit3,
  Save,
  X,
  Loader2,
  Heart,
  MessageCircle,
  Trash2,
  Phone,
  Sparkles,
  Target,
  CalendarDays,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { DEPARTMENTS, SEMESTERS } from '../utils/constants';

const SKILL_SUGGESTIONS = [
  'JavaScript', 'Python', 'Java', 'C++', 'React', 'Node.js', 'Flutter', 'Machine Learning',
  'Data Science', 'UI/UX Design', 'Database Management', 'Cloud Computing', 'Cybersecurity',
  'Mobile Development', 'Web Development', 'DevOps', 'Artificial Intelligence', 'Blockchain',
];

const INTEREST_SUGGESTIONS = [
  'Programming', 'Research', 'Hackathons', 'Sports', 'Photography', 'Debate', 'Writing',
  'Music', 'Entrepreneurship', 'Gaming', 'Reading', 'Volunteering', 'Robotics', 'IoT',
  'Open Source', 'Networking', 'Public Speaking', 'Graphic Design',
];

function getProfileCompleteness(profile) {
  const fields = [
    profile.department,
    profile.semester,
    profile.bio,
    profile.skills?.length > 0,
    profile.interests?.length > 0,
    profile.courses?.length > 0,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

export default function ProfilePage() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [newInterest, setNewInterest] = useState('');
  const [tab, setTab] = useState('about');

  const isOwnProfile = !id || id === currentUser?.id;
  const profileId = id || currentUser?.id;

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, postsRes] = await Promise.all([
          usersAPI.get(profileId),
          usersAPI.getPosts(profileId),
        ]);
        setProfile(profileRes.data.user);
        setPosts(postsRes.data.posts);
      } catch {
        toast.error('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    if (profileId) load();
  }, [profileId]);

  const handleEdit = () => {
    setEditData({
      name: profile.name || '',
      department: profile.department || '',
      semester: profile.semester || '',
      batchYear: profile.batchYear || '',
      bio: profile.bio || '',
      phoneNumber: profile.phoneNumber || '',
      skills: [...(profile.skills || [])],
      interests: [...(profile.interests || [])],
    });
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await usersAPI.updateProfile(editData);
      setProfile({ ...profile, ...res.data.user });
      setEditing(false);
      toast.success('Profile updated!');
    } catch {
      toast.error('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = (skill) => {
    const s = skill.trim();
    if (s && !editData.skills.includes(s)) {
      setEditData({ ...editData, skills: [...editData.skills, s] });
    }
    setNewSkill('');
  };

  const removeSkill = (skill) => {
    setEditData({ ...editData, skills: editData.skills.filter((s) => s !== skill) });
  };

  const addInterest = (interest) => {
    const i = interest.trim();
    if (i && !editData.interests.includes(i)) {
      setEditData({ ...editData, interests: [...editData.interests, i] });
    }
    setNewInterest('');
  };

  const removeInterest = (interest) => {
    setEditData({ ...editData, interests: editData.interests.filter((i) => i !== interest) });
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!profile) return null;

  const completeness = getProfileCompleteness(profile);

  return (
    <div className="rc-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile Header */}
        <Card padding="p-0">
          {/* Cover */}
          <div className="h-32 bg-gradient-to-r from-teal-500 via-teal-600 to-blue-600 relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
          </div>

          <div className="px-6 pb-6">
            {/* Avatar + Name */}
            <div className="flex items-end justify-between -mt-12">
              <div className="flex items-end gap-4 min-w-0">
                <Avatar name={profile.name || ''} size="xl" className="border-4 border-white shadow-lg rounded-2xl h-24 w-24 text-3xl" />
                <div className="pb-1 min-w-0">
                  <h1 className="text-xl font-bold text-slate-900 truncate">{profile.name}</h1>
                  <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5 min-w-0">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{profile.email}</span>
                  </p>
                </div>
              </div>
              {isOwnProfile && !editing && (
                <Button variant="secondary" icon={Edit3} onClick={handleEdit} className="shrink-0">
                  Edit Profile
                </Button>
              )}
              {editing && (
                <div className="flex gap-2 shrink-0">
                  <Button onClick={handleSave} loading={saving} icon={Save}>Save</Button>
                  <Button variant="secondary" icon={X} onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              )}
            </div>

            {/* Bio */}
            {editing ? (
              <textarea
                value={editData.bio}
                onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                placeholder="Write a short bio about yourself..."
                rows={2}
                className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none transition-all"
              />
            ) : profile.bio ? (
              <p className="mt-4 text-sm text-slate-600 leading-relaxed break-words line-clamp-4">{profile.bio}</p>
            ) : null}

            {/* Stats */}
            <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-200/80">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{profile.postCount || 0}</p>
                <p className="text-xs text-slate-500">Posts</p>
              </div>
              <div className="w-px h-8 bg-slate-200/80" />
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{profile.groupCount || 0}</p>
                <p className="text-xs text-slate-500">Groups</p>
              </div>
              <div className="w-px h-8 bg-slate-200/80" />
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{profile.skills?.length || 0}</p>
                <p className="text-xs text-slate-500">Skills</p>
              </div>
              {!isOwnProfile && (
                <Link
                  to="/messages"
                  className="ml-auto"
                >
                  <Button icon={MessageCircle}>Message</Button>
                </Link>
              )}
            </div>
          </div>
        </Card>

        {/* Profile Completeness */}
        {isOwnProfile && completeness < 100 && !editing && (
          <Card className="mt-4 border-amber-200 bg-amber-50/50">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">Complete your profile ({completeness}%)</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add your {!profile.department && 'department, '}{!profile.skills?.length && 'skills, '}{!profile.interests?.length && 'interests, '}{!profile.courses?.length && 'courses, '}{!profile.bio && 'bio '}to get better study partner recommendations.
                </p>
                <div className="w-full bg-amber-100 rounded-full h-1.5 mt-2">
                  <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${completeness}%` }} />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mt-6 bg-white rounded-xl border border-slate-200/80 p-1">
          {['about', 'posts'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 py-2.5 text-sm font-semibold rounded-lg cursor-pointer transition-all',
                tab === t ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              {t === 'about' ? 'About' : `Posts (${posts.length})`}
            </button>
          ))}
        </div>

        {tab === 'about' ? (
          <div className="mt-6 space-y-5">
            {/* Academic Info */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-teal-600" /> Academic Info
              </h3>
              {editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Department</label>
                    <select
                      value={editData.department}
                      onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                      className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                    >
                      <option value="">Select...</option>
                      {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Semester</label>
                    <select
                      value={editData.semester}
                      onChange={(e) => setEditData({ ...editData, semester: e.target.value })}
                      className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                    >
                      <option value="">Select...</option>
                      {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Batch Year</label>
                    <input
                      type="number"
                      value={editData.batchYear}
                      onChange={(e) => setEditData({ ...editData, batchYear: e.target.value })}
                      placeholder="e.g. 2024"
                      className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Department</p>
                    <p className="text-sm font-medium text-slate-900 mt-0.5 truncate">{profile.department || '—'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Semester</p>
                    <p className="text-sm font-medium text-slate-900 mt-0.5 truncate">{profile.semester ? `Semester ${profile.semester}` : '—'}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Batch Year</p>
                    <p className="text-sm font-medium text-slate-900 mt-0.5 truncate">{profile.batchYear || '—'}</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Contact */}
            {(editing || profile.phoneNumber) && (
              <Card>
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-teal-600" /> Contact
                </h3>
                {editing ? (
                  <input
                    value={editData.phoneNumber}
                    onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                    placeholder="Phone number"
                    className="block w-full sm:w-64 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                ) : (
                  <p className="text-sm text-slate-700 flex items-center gap-2 min-w-0">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{profile.phoneNumber}</span>
                  </p>
                )}
              </Card>
            )}

            {/* Skills */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-teal-600" /> Skills
              </h3>
              {editing ? (
                <>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {editData.skills.map((skill) => (
                      <Badge key={skill} variant="teal" size="md">
                        {skill}
                        <button onClick={() => removeSkill(skill)} className="hover:text-red-500 cursor-pointer ml-1"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill(newSkill))}
                      placeholder="Add a skill..."
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                    />
                    <Button size="sm" icon={Plus} onClick={() => addSkill(newSkill)} />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {SKILL_SUGGESTIONS.filter((s) => !editData.skills.includes(s)).slice(0, 8).map((s) => (
                      <button key={s} onClick={() => addSkill(s)} className="px-2 py-0.5 rounded-full border border-slate-200 text-xs text-slate-500 hover:border-teal-300 hover:text-teal-600 cursor-pointer transition-colors">
                        + {s}
                      </button>
                    ))}
                  </div>
                </>
              ) : profile.skills?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <Badge key={skill} variant="teal" size="md">{skill}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">{isOwnProfile ? 'Add your skills to help others find you.' : 'No skills added yet.'}</p>
              )}
            </Card>

            {/* Interests */}
            <Card>
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-teal-600" /> Interests
              </h3>
              {editing ? (
                <>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {editData.interests.map((interest) => (
                      <Badge key={interest} variant="amber" size="md">
                        {interest}
                        <button onClick={() => removeInterest(interest)} className="hover:text-red-500 cursor-pointer ml-1"><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest(newInterest))}
                      placeholder="Add an interest..."
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                    />
                    <button onClick={() => addInterest(newInterest)} className="px-3 py-2 rounded-xl bg-amber-500 text-white text-sm hover:bg-amber-600 cursor-pointer shadow-sm transition-colors">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {INTEREST_SUGGESTIONS.filter((i) => !editData.interests.includes(i)).slice(0, 8).map((i) => (
                      <button key={i} onClick={() => addInterest(i)} className="px-2 py-0.5 rounded-full border border-slate-200 text-xs text-slate-500 hover:border-amber-300 hover:text-amber-600 cursor-pointer transition-colors">
                        + {i}
                      </button>
                    ))}
                  </div>
                </>
              ) : profile.interests?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest) => (
                    <Badge key={interest} variant="amber" size="md">{interest}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">{isOwnProfile ? 'Add interests to connect with like-minded students.' : 'No interests added yet.'}</p>
              )}
            </Card>

            {/* Courses */}
            {profile.courses?.length > 0 && (
              <Card>
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-teal-600" /> Enrolled Courses
                </h3>
                <div className="space-y-2">
                  {profile.courses.map((course) => (
                    <div key={course.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-50 min-w-0">
                      <div className="h-8 w-8 shrink-0 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{course.courseName}</p>
                        {course.courseCode && <p className="text-xs text-slate-500 truncate">{course.courseCode}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Joined date */}
            <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        ) : (
          /* Posts Tab */
          <div className="mt-6">
            {posts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm">No posts yet.</p>
              </div>
            ) : (
              <div className="space-y-4 rc-stagger">
                {posts.map((post) => (
                  <Card key={post.id} hover>
                    <div className="flex items-start justify-between">
                      <p className="text-xs text-slate-400">{timeAgo(post.createdAt)}</p>
                      {post.author?.id === currentUser?.id && (
                        <button onClick={() => handleDeletePost(post.id)} className="p-1 text-slate-300 hover:text-red-500 cursor-pointer transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed break-words">{post.content}</p>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={cn(
                          'flex items-center gap-1.5 text-sm cursor-pointer transition-colors',
                          post.isLiked ? 'text-red-500' : 'text-slate-400 hover:text-red-500'
                        )}
                      >
                        <Heart className={cn('h-4 w-4', post.isLiked && 'fill-current')} /> {post.likesCount}
                      </button>
                      <span className="flex items-center gap-1.5 text-sm text-slate-400">
                        <MessageCircle className="h-4 w-4" /> {post.commentsCount}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
