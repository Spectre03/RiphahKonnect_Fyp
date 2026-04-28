import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersAPI, postsAPI } from '../services/api';
import { timeAgo } from '../utils/brand';
import { getAvatarGradient } from '../utils/brand';
import { cn } from '../utils/cn';
import { Card, Button, Badge, Avatar } from '../components/ui';
import toast from 'react-hot-toast';
import {
  Mail, BookOpen, GraduationCap, Edit3, Save, X, Loader2,
  Heart, MessageCircle, Trash2, Phone, Sparkles, Target,
  CalendarDays, Plus, AlertCircle, FileText, Users,
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

const ROLE_META = {
  STUDENT:          { label: 'Student',         gradient: 'from-teal-500 to-emerald-500' },
  TEACHER:          { label: 'Teacher',          gradient: 'from-blue-500 to-indigo-500' },
  COORDINATION:     { label: 'Coordination',     gradient: 'from-violet-500 to-purple-500' },
  UNIVERSITY_ADMIN: { label: 'Univ. Admin',      gradient: 'from-amber-500 to-orange-500' },
  SYSTEM_ADMIN:     { label: 'System Admin',     gradient: 'from-red-500 to-rose-500' },
};

function getProfileCompleteness(profile) {
  const fields = [
    profile.department,
    profile.semester,
    profile.bio,
    profile.skills?.length > 0,
    profile.interests?.length > 0,
    profile.courses?.length > 0,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
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

  const addSkill    = (s) => { const v = s.trim(); if (v && !editData.skills.includes(v)) setEditData({ ...editData, skills: [...editData.skills, v] }); setNewSkill(''); };
  const removeSkill = (s) => setEditData({ ...editData, skills: editData.skills.filter((x) => x !== s) });
  const addInterest    = (i) => { const v = i.trim(); if (v && !editData.interests.includes(v)) setEditData({ ...editData, interests: [...editData.interests, v] }); setNewInterest(''); };
  const removeInterest = (i) => setEditData({ ...editData, interests: editData.interests.filter((x) => x !== i) });

  const handleLike = async (postId) => {
    try {
      const res = await postsAPI.toggleLike(postId);
      setPosts(posts.map((p) => p.id === postId ? { ...p, isLiked: res.data.liked, likesCount: p.likesCount + (res.data.liked ? 1 : -1) } : p));
    } catch { toast.error('Failed to like post.'); }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Delete this post?')) return;
    try {
      await postsAPI.delete(postId);
      setPosts(posts.filter((p) => p.id !== postId));
      toast.success('Post deleted.');
    } catch { toast.error('Failed to delete.'); }
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
  const roleMeta = ROLE_META[profile.role] || ROLE_META.STUDENT;

  return (
    <div className="page-wrapper">

      {/* ── Full-width cover ── */}
      <div
        className="relative overflow-hidden"
        style={{ height: '200px', background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 50%, #4f46e5 100%)' }}
      >
        <div className="absolute inset-0 banner-grid pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/[0.08] blur-2xl" />
          <div className="absolute -left-10 bottom-0 w-48 h-48 rounded-full bg-white/[0.06] blur-2xl" />
          <div className="absolute top-1/2 left-1/3 w-96 h-24 bg-white/[0.04] blur-3xl rotate-12" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        {/* ── Profile Header Card (overlaps cover) ── */}
        <div className="relative -mt-14 z-10 bg-white rounded-2xl border border-slate-200/70 shadow-[0_4px_24px_0_rgba(0,0,0,0.09)] mb-4">

          {/* Avatar + name row */}
          <div className="px-6 pt-4 pb-5">
            <div className="flex items-start justify-between gap-4">
              {/* Avatar block */}
              <div className="flex items-start gap-4">
                <div className="-mt-16 flex-shrink-0">
                  <div
                    className="h-24 w-24 rounded-2xl flex items-center justify-center text-white text-3xl font-extrabold border-4 border-white shadow-xl"
                    style={{ background: getAvatarGradient(profile.name || '') }}
                  >
                    {profile.name?.charAt(0)?.toUpperCase()}
                  </div>
                </div>
                <div className="pt-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{profile.name}</h1>
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r',
                      roleMeta.gradient
                    )}>
                      <Sparkles className="h-2.5 w-2.5" />
                      {roleMeta.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                    <span className="truncate">{profile.email}</span>
                  </p>
                  {profile.department && (
                    <p className="text-sm text-indigo-600 font-semibold flex items-center gap-1.5 mt-1">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {profile.department}{profile.semester ? ` · Semester ${profile.semester}` : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                {isOwnProfile && !editing && (
                  <Button variant="secondary" icon={Edit3} onClick={handleEdit} size="sm">Edit Profile</Button>
                )}
                {editing && (
                  <>
                    <Button onClick={handleSave} loading={saving} icon={Save} size="sm">Save</Button>
                    <Button variant="secondary" icon={X} onClick={() => setEditing(false)} size="sm">Cancel</Button>
                  </>
                )}
                {!isOwnProfile && (
                  <Link to="/messages">
                    <Button icon={MessageCircle} size="sm">Message</Button>
                  </Link>
                )}
              </div>
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
              <p className="mt-3 text-sm text-slate-600 leading-relaxed break-words line-clamp-3">{profile.bio}</p>
            ) : null}
          </div>

          {/* Stats strip */}
          <div className="flex items-stretch border-t border-slate-100 bg-slate-50/60 divide-x divide-slate-100 rounded-b-2xl overflow-hidden">
            {[
              { icon: FileText,  value: profile.postCount  || 0, label: 'Posts',  color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { icon: Users,     value: profile.groupCount || 0, label: 'Groups', color: 'text-blue-600',   bg: 'bg-blue-50'   },
              { icon: Sparkles,  value: profile.skills?.length || 0, label: 'Skills', color: 'text-teal-600', bg: 'bg-teal-50' },
            ].map(({ icon: Icon, value, label, color, bg }) => (
              <div key={label} className="flex-1 flex items-center justify-center gap-2.5 py-3.5">
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                  <Icon className={cn('h-4 w-4', color)} />
                </div>
                <div>
                  <p className={cn('text-lg font-extrabold leading-none', color)}>{value}</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Profile Completeness ── */}
        {isOwnProfile && completeness < 100 && !editing && (
          <div className="mb-4 bg-white rounded-2xl border border-amber-200/80 px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                </div>
                <span className="text-sm font-bold text-slate-900">Complete your profile</span>
              </div>
              <span className="text-sm font-extrabold text-amber-600">{completeness}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-700"
                style={{ width: `${completeness}%`, background: 'linear-gradient(90deg, #f59e0b, #f97316)' }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Add {[!profile.department && 'department', !profile.bio && 'bio', !profile.skills?.length && 'skills', !profile.interests?.length && 'interests'].filter(Boolean).join(', ')} to boost your profile.
            </p>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-5 bg-white rounded-xl border border-slate-200/70 p-1 shadow-sm">
          {[
            { key: 'about', label: 'About' },
            { key: 'posts', label: `Posts (${posts.length})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex-1 py-2.5 text-sm font-semibold rounded-lg cursor-pointer transition-all',
                tab === t.key
                  ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── About Tab ── */}
        {tab === 'about' ? (
          <div className="space-y-4 pb-10">

            {/* Academic Info */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50/60 to-transparent">
                <div className="h-7 w-7 rounded-lg bg-teal-100 flex items-center justify-center">
                  <GraduationCap className="h-4 w-4 text-teal-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Academic Info</h3>
              </div>
              <div className="p-5">
                {editing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Department</label>
                      <select
                        value={editData.department}
                        onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                        className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all bg-white"
                      >
                        <option value="">Select...</option>
                        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Semester</label>
                      <select
                        value={editData.semester}
                        onChange={(e) => setEditData({ ...editData, semester: e.target.value })}
                        className="block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all bg-white"
                      >
                        <option value="">Select...</option>
                        {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Batch Year</label>
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
                    {[
                      { label: 'Department', value: profile.department },
                      { label: 'Semester',   value: profile.semester ? `Semester ${profile.semester}` : null },
                      { label: 'Batch Year', value: profile.batchYear },
                    ].map(({ label, value }) => (
                      <div key={label} className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                        <p className="text-sm font-semibold text-slate-800 mt-1 truncate">{value || <span className="text-slate-300 font-normal">—</span>}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Contact */}
            {(editing || profile.phoneNumber) && (
              <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-transparent">
                  <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Contact</h3>
                </div>
                <div className="p-5">
                  {editing ? (
                    <input
                      value={editData.phoneNumber}
                      onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                      placeholder="Phone number"
                      className="block w-full sm:w-64 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {profile.phoneNumber}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Skills */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50/60 to-transparent">
                <div className="h-7 w-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Skills</h3>
              </div>
              <div className="p-5">
                {editing ? (
                  <>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {editData.skills.map((skill) => (
                        <span key={skill} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                          {skill}
                          <button onClick={() => removeSkill(skill)} className="hover:text-red-500 cursor-pointer transition-colors"><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill(newSkill))}
                        placeholder="Add a skill and press Enter..."
                        className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                      />
                      <Button size="sm" icon={Plus} onClick={() => addSkill(newSkill)} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {SKILL_SUGGESTIONS.filter((s) => !editData.skills.includes(s)).slice(0, 8).map((s) => (
                        <button key={s} onClick={() => addSkill(s)} className="px-2.5 py-1 rounded-full border border-slate-200 text-xs text-slate-500 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50 cursor-pointer transition-all">
                          + {s}
                        </button>
                      ))}
                    </div>
                  </>
                ) : profile.skills?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <span key={skill} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-100">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">{isOwnProfile ? 'Add your skills to help others find you.' : 'No skills added yet.'}</p>
                )}
              </div>
            </div>

            {/* Interests */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50/60 to-transparent">
                <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Target className="h-4 w-4 text-amber-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Interests</h3>
              </div>
              <div className="p-5">
                {editing ? (
                  <>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {editData.interests.map((interest) => (
                        <span key={interest} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          {interest}
                          <button onClick={() => removeInterest(interest)} className="hover:text-red-500 cursor-pointer transition-colors"><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest(newInterest))}
                        placeholder="Add an interest and press Enter..."
                        className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                      />
                      <button onClick={() => addInterest(newInterest)} className="px-3.5 py-2 rounded-xl bg-amber-500 text-white text-sm hover:bg-amber-600 cursor-pointer shadow-sm transition-colors">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {INTEREST_SUGGESTIONS.filter((i) => !editData.interests.includes(i)).slice(0, 8).map((i) => (
                        <button key={i} onClick={() => addInterest(i)} className="px-2.5 py-1 rounded-full border border-slate-200 text-xs text-slate-500 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50 cursor-pointer transition-all">
                          + {i}
                        </button>
                      ))}
                    </div>
                  </>
                ) : profile.interests?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest) => (
                      <span key={interest} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">{isOwnProfile ? 'Add interests to connect with like-minded students.' : 'No interests added yet.'}</p>
                )}
              </div>
            </div>

            {/* Courses */}
            {profile.courses?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 to-transparent">
                  <div className="h-7 w-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-indigo-600" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Enrolled Courses</h3>
                </div>
                <div className="p-5 space-y-2">
                  {profile.courses.map((course) => (
                    <div key={course.id} className="flex items-center gap-3 py-2.5 px-3.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
                      <div className="h-8 w-8 shrink-0 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{course.courseName}</p>
                        {course.courseCode && <p className="text-xs text-slate-400 truncate">{course.courseCode}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Joined date */}
            <div className="flex items-center gap-2 text-xs text-slate-400 px-1 pb-2">
              <CalendarDays className="h-3.5 w-3.5" />
              Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          </div>

        ) : (
          /* ── Posts Tab ── */
          <div className="pb-10">
            {posts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/70 shadow-sm">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No posts yet</p>
                <p className="text-xs text-slate-400 mt-1">Posts will appear here</p>
              </div>
            ) : (
              <div className="space-y-4 stagger">
                {posts.map((post) => (
                  <div key={post.id} className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-400">{timeAgo(post.createdAt)}</span>
                        {post.author?.id === currentUser?.id && (
                          <button onClick={() => handleDeletePost(post.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-all">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[15px] text-slate-800 whitespace-pre-wrap leading-relaxed break-words">{post.content}</p>
                    </div>
                    <div className="flex items-center gap-3 px-5 py-3 border-t border-slate-50 bg-slate-50/40">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={cn(
                          'flex items-center gap-1.5 text-sm font-semibold cursor-pointer transition-colors px-2 py-1 rounded-lg',
                          post.isLiked ? 'text-red-500 bg-red-50' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                        )}
                      >
                        <Heart className={cn('h-4 w-4', post.isLiked && 'fill-current')} />
                        <span>{post.likesCount}</span>
                      </button>
                      <span className="flex items-center gap-1.5 text-sm text-slate-400 px-2 py-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.commentsCount}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
