'use client';

import { useState, useEffect } from 'react';
import { 
  BookOpen, Heart, Users, MessageCircle, Calendar, Shield,
  Plus, Edit, Trash2, Check, X, Loader2, Ban, UserX, Upload, Image as ImageIcon, Video, AlertTriangle, Quote,
  TrendingUp, Globe, Flag, MessageSquare, Search, Filter, MoreVertical, RefreshCw, Star, Clock
} from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const toast = useToast();
  const t = useTranslations('admin');
  const [activeTab, setActiveTab] = useState('lessons');

  const tabs = [
    { id: 'lessons', label: t('lessons'), icon: BookOpen },
    { id: 'verses', label: 'Daily Verses', icon: Quote },
    { id: 'groups', label: t('groupsManagement'), icon: Users },
    { id: 'reports', label: t('reports'), icon: AlertTriangle },
    { id: 'statistics', label: t('statistics'), icon: TrendingUp },
    { id: 'support', label: t('supportRequests'), icon: MessageCircle },
    { id: 'users', label: t('userManagement'), icon: Users },
    { id: 'vpn', label: t('vpnDetection'), icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-blue-600 text-white py-12 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight">{t('dashboard')}</h1>
              <p className="text-purple-100 font-medium opacity-90">{t('managePlatform')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-12">
        <div className="bg-white rounded-2xl shadow-xl mb-8 overflow-hidden border border-gray-100">
          <div className="border-b border-gray-100 bg-gray-50/50">
            <nav className="flex overflow-x-auto no-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-8 py-5 font-bold text-sm transition-all relative whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'text-purple-600'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mr-3 ${activeTab === tab.id ? 'text-purple-600' : 'text-gray-400'}`} />
                    {tab.label}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600 rounded-t-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
          
          <div className="p-4 md:p-8 min-h-[500px]">
            {activeTab === 'lessons' && <LessonsManager />}
            {activeTab === 'verses' && <VersesManager />}
            {activeTab === 'groups' && <GroupsManager />}
            {activeTab === 'reports' && <ReportsManager />}
            {activeTab === 'statistics' && <StatisticsManager />}
            {activeTab === 'support' && <SupportManager />}
            {activeTab === 'users' && <UsersManager />}
            {activeTab === 'vpn' && <VPNDetectionManager />}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Helper Components ---
function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-gray-500 font-medium mt-1 text-sm md:text-base">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0 w-full md:w-auto">{action}</div>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-6 bg-gray-50 rounded-full mb-4">
        <Icon className="w-12 h-12 text-gray-300" />
      </div>
      <h3 className="text-xl font-bold text-gray-900">{title}</h3>
      <p className="text-gray-500 max-w-xs mx-auto mt-2 font-medium">{description}</p>
    </div>
  );
}

// --- Lessons Manager ---
function LessonsManager() {
  const toast = useToast();
  const t = useTranslations('admin');
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    title: '',
    content: '',
    imageUrl: '',
    videoUrl: '',
    religion: 'christianity',
  });

  useEffect(() => { fetchLessons(); }, []);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/lessons');
      const data = await response.json();
      setLessons(data.lessons || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fData = new FormData();
      fData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: fData });
      if (response.ok) {
        const data = await response.json();
        if (type === 'image') setFormData(prev => ({ ...prev, imageUrl: data.url }));
        else setFormData(prev => ({ ...prev, videoUrl: data.url }));
        toast.success('Uploaded successfully');
      }
    } catch (error) { toast.error('Upload failed'); } finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const response = await fetch('/api/admin/lessons', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        toast.success(formData.id ? 'Lesson updated' : 'Lesson created');
        setShowForm(false);
        fetchLessons();
      }
    } catch (error) { toast.error('Error saving lesson'); } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await toast.confirm({
      title: 'Delete Lesson',
      message: 'Are you sure you want to permanently delete this lesson? This action cannot be undone.',
      confirmText: 'Delete Now',
      type: 'danger'
    });
    
    if (!confirmed) return;

    const previousLessons = [...lessons];
    setLessons(lessons.filter(l => l.id !== id));
    
    try {
      const response = await fetch(`/api/admin/lessons?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      toast.success('Lesson deleted successfully');
    } catch (error) { 
      toast.error('Delete failed. Restoring lesson...');
      setLessons(previousLessons);
    }
  };

  return (
    <div>
      <SectionHeader 
        title={t('manageLessons')} 
        subtitle="Create and organize your ministry curriculum"
        action={
          <button onClick={() => { setFormData({ id: null, title: '', content: '', imageUrl: '', videoUrl: '', religion: 'christianity' }); setShowForm(true); }} className="flex items-center justify-center w-full md:w-auto px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all">
            <Plus className="w-5 h-5 mr-2" /> {t('createNewLesson')}
          </button>
        }
      />

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl md:text-2xl font-black text-gray-900">{formData.id ? 'Edit Lesson' : 'New Lesson'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={24}/></button>
            </div>
            <div className="p-6 md:p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">{t('title')}</label>
                <input type="text" placeholder="Enter lesson title..." value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 font-medium" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">{t('content')}</label>
                <textarea placeholder="Write your lesson content here..." value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 min-h-[200px]" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">{t('religion')}</label>
                  <select value={formData.religion} onChange={e => setFormData({...formData, religion: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 font-bold bg-white">
                    <option value="christianity">{t('christianity')}</option>
                    <option value="islam">{t('islam')}</option>
                    <option value="judaism">{t('judaism')}</option>
                    <option value="all">{t('allReligions')}</option>
                  </select>
                </div>
                <div className="flex items-end gap-3">
                  <label className="flex-1 cursor-pointer bg-blue-50 hover:bg-blue-100 p-4 rounded-2xl text-blue-700 font-bold flex flex-col items-center justify-center gap-2 border-2 border-blue-100 transition-all">
                    <ImageIcon size={24} />
                    <span className="text-[10px] uppercase">{formData.imageUrl ? 'Change' : 'Image'}</span>
                    <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'image')} />
                  </label>
                  <label className="flex-1 cursor-pointer bg-purple-50 hover:bg-purple-100 p-4 rounded-2xl text-purple-700 font-bold flex flex-col items-center justify-center gap-2 border-2 border-purple-100 transition-all">
                    <Video size={24} />
                    <span className="text-[10px] uppercase">{formData.videoUrl ? 'Change' : 'Video'}</span>
                    <input type="file" className="hidden" accept="video/*" onChange={e => handleFileUpload(e, 'video')} />
                  </label>
                </div>
              </div>
            </div>
            <div className="p-6 md:p-8 bg-gray-50/50 border-t border-gray-100 flex flex-col md:flex-row justify-end gap-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-8 py-4 text-gray-600 font-bold hover:bg-gray-200 rounded-2xl transition-all order-2 md:order-1">Cancel</button>
              <button type="submit" disabled={loading || uploading} className="px-12 py-4 bg-purple-600 text-white rounded-2xl font-black hover:bg-purple-700 shadow-xl shadow-purple-100 transition-all disabled:opacity-50 order-1 md:order-2">
                {loading ? <Loader2 className="animate-spin"/> : 'Save Lesson'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && lessons.length === 0 ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-12 h-12" /></div>
      ) : lessons.length === 0 ? (
        <EmptyState icon={BookOpen} title="No lessons found" description="Start by creating your first ministry lesson." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {lessons.map(lesson => (
            <div key={lesson.id} className="group border-2 border-gray-100 rounded-3xl overflow-hidden bg-white hover:border-purple-200 hover:shadow-2xl transition-all duration-300">
              <div className="relative h-56 w-full bg-gray-100">
                {lesson.imageurl ? (
                  <img src={lesson.imageurl} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-300 bg-gray-50">
                    <BookOpen size={64} />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase text-purple-600 shadow-sm border border-purple-100">{lesson.religion}</span>
                </div>
                <div className="absolute top-4 right-4 flex gap-2 md:opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                  <button onClick={() => { setFormData({
                    id: lesson.id,
                    title: lesson.title,
                    content: lesson.content,
                    imageUrl: lesson.imageurl,
                    videoUrl: lesson.videourl,
                    religion: lesson.religion
                  }); setShowForm(true); }} className="p-3 bg-white text-blue-600 rounded-2xl shadow-xl hover:bg-blue-600 hover:text-white transition-all"><Edit size={18}/></button>
                  <button onClick={() => handleDelete(lesson.id)} className="p-3 bg-white text-red-600 rounded-2xl shadow-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18}/></button>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-black text-xl text-gray-900 mb-2 line-clamp-1">{lesson.title}</h3>
                <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed font-medium">{lesson.content}</p>
                <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between text-xs font-bold text-gray-400">
                  <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(lesson.createdat).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Verses Manager ---
function VersesManager() {
  const toast = useToast();
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ id: null, content: '', reference: '', religion: 'all', scheduledDate: new Date().toISOString().split('T')[0] });

  useEffect(() => { fetchVerses(); }, []);
  const fetchVerses = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/verses');
      const data = await response.json();
      setVerses(data.verses || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const response = await fetch('/api/admin/verses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verse: formData.content, reference: formData.reference, scheduledDate: formData.scheduledDate, id: formData.id, religion: formData.religion }),
      });
      if (response.ok) {
        toast.success(formData.id ? 'Verse updated' : 'Verse scheduled');
        setShowForm(false);
        fetchVerses();
      }
    } catch (error) { toast.error('Error saving verse'); } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await toast.confirm({
      title: 'Delete Verse',
      message: 'Are you sure you want to delete this scheduled verse?',
      confirmText: 'Delete',
      type: 'danger'
    });
    
    if (!confirmed) return;

    setVerses(verses.filter(v => v.id !== id));
    try {
      await fetch(`/api/admin/verses?id=${id}`, { method: 'DELETE' });
      toast.success('Verse deleted');
    } catch (error) {
      toast.error('Failed to delete verse');
      fetchVerses();
    }
  };

  return (
    <div>
      <SectionHeader 
        title="Daily Verses" 
        subtitle="Manage scheduled inspirational messages"
        action={
          <button onClick={() => { setFormData({ id: null, content: '', reference: '', religion: 'all', scheduledDate: new Date().toISOString().split('T')[0] }); setShowForm(true); }} className="flex items-center justify-center w-full md:w-auto px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg transition-all">
            <Plus className="w-5 h-5 mr-2" /> Add New Verse
          </button>
        }
      />

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl w-full max-w-xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl md:text-2xl font-black text-gray-900">{formData.id ? 'Edit Verse' : 'Schedule Verse'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24}/></button>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase">Verse Content</label>
                <textarea placeholder="Type the verse text..." value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 font-medium italic" rows={4} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase">Reference</label>
                  <input type="text" placeholder="e.g. John 3:16" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 font-bold" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase">Religion</label>
                  <select value={formData.religion} onChange={e => setFormData({...formData, religion: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 font-bold bg-white">
                    <option value="all">All</option>
                    <option value="christianity">Christianity</option>
                    <option value="islam">Islam</option>
                    <option value="judaism">Judaism</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase">Display Date</label>
                <input type="date" value={formData.scheduledDate} onChange={e => setFormData({...formData, scheduledDate: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 font-bold" required />
              </div>
            </div>
            <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row justify-end gap-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-8 py-4 text-gray-600 font-bold order-2 md:order-1">Cancel</button>
              <button type="submit" disabled={loading} className="px-12 py-4 bg-purple-600 text-white rounded-2xl font-black hover:bg-purple-700 shadow-xl shadow-purple-100 transition-all order-1 md:order-2">
                {loading ? <Loader2 className="animate-spin"/> : 'Save Verse'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && verses.length === 0 ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-12 h-12" /></div>
      ) : verses.length === 0 ? (
        <EmptyState icon={Quote} title="No verses scheduled" description="Add verses to inspire your community every day." />
      ) : (
        <div className="space-y-4">
          {verses.map(v => (
            <div key={v.id} className="group p-6 border-2 border-gray-100 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center bg-white hover:border-purple-200 hover:shadow-xl transition-all duration-300 gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${v.displayDate === new Date().toISOString().split('T')[0] ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {v.displayDate === new Date().toISOString().split('T')[0] ? 'Today' : v.displayDate}
                  </span>
                  <span className="text-[10px] font-black uppercase text-purple-600">{v.religion}</span>
                </div>
                <p className="text-gray-900 italic font-bold text-lg mb-1">"{v.verseText}"</p>
                <p className="text-sm text-purple-600 font-black tracking-wide">— {v.verseReference}</p>
              </div>
              <div className="flex gap-2 self-end md:self-center">
                <button onClick={() => { setFormData({ id: v.id, content: v.verseText, reference: v.verseReference, religion: v.religion, scheduledDate: v.displayDate }); setShowForm(true); }} className="p-3 text-blue-600 hover:bg-blue-50 rounded-2xl transition-colors"><Edit size={20}/></button>
                <button onClick={() => handleDelete(v.id)} className="p-3 text-red-600 hover:bg-red-50 rounded-2xl transition-colors"><Trash2 size={20}/></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Groups Manager ---
function GroupsManager() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', description: '', color: '#8B5CF6', icon: 'users' });
  const toast = useToast();

  useEffect(() => { fetchGroups(); }, []);
  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/groups');
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        toast.success('Group created');
        setShowForm(false);
        fetchGroups();
      }
    } catch (error) { toast.error('Error'); } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await toast.confirm({
      title: 'Delete Group',
      message: 'This will permanently delete the group and all its messages. Continue?',
      confirmText: 'Delete Group',
      type: 'danger'
    });
    
    if (!confirmed) return;

    setGroups(groups.filter(g => g.id !== id));
    try {
      await fetch(`/api/admin/groups?id=${id}`, { method: 'DELETE' });
      toast.success('Group deleted');
    } catch (error) {
      toast.error('Failed to delete group');
      fetchGroups();
    }
  };

  return (
    <div>
      <SectionHeader 
        title="Community Groups" 
        subtitle="Manage discussion circles and chat rooms"
        action={
          <button onClick={() => { setFormData({ id: null, name: '', description: '', color: '#8B5CF6', icon: 'users' }); setShowForm(true); }} className="flex items-center justify-center w-full md:w-auto px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg transition-all">
            <Plus className="w-5 h-5 mr-2" /> New Group
          </button>
        }
      />

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl md:text-2xl font-black text-gray-900">Create Group</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24}/></button>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase">Group Name</label>
                <input type="text" placeholder="e.g. Morning Prayer" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 font-bold" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase">Description</label>
                <textarea placeholder="What is this group about?" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 font-medium" rows={3} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase">Theme Color</label>
                <div className="flex flex-wrap gap-3">
                  {['#8B5CF6', '#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#EC4899'].map(c => (
                    <button key={c} type="button" onClick={()=>setFormData({...formData, color: c})} className={`w-10 h-10 rounded-full border-4 transition-all ${formData.color === c ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'}`} style={{backgroundColor: c}} />
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row justify-end gap-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-8 py-4 text-gray-600 font-bold order-2 md:order-1">Cancel</button>
              <button type="submit" disabled={loading} className="px-12 py-4 bg-purple-600 text-white rounded-2xl font-black hover:bg-purple-700 shadow-xl transition-all order-1 md:order-2">
                {loading ? <Loader2 className="animate-spin"/> : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && groups.length === 0 ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-12 h-12" /></div>
      ) : groups.length === 0 ? (
        <EmptyState icon={Users} title="No groups yet" description="Build your community by creating the first group." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {groups.map(group => (
            <div key={group.id} className="group border-2 border-gray-100 rounded-3xl overflow-hidden bg-white hover:border-purple-200 hover:shadow-2xl transition-all duration-300">
              <div className="h-32 flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: group.color }}>
                <Users className="w-16 h-16 text-white/30" />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-6">
                <h3 className="font-black text-xl text-gray-900 mb-2">{group.name}</h3>
                <p className="text-gray-500 text-sm line-clamp-2 font-medium mb-6 h-10">{group.description || 'No description provided.'}</p>
                <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                  <div className="flex gap-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Members</span>
                      <span className="text-lg font-black text-gray-900">{group.actual_members_count || 0}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Messages</span>
                      <span className="text-lg font-black text-gray-900">{group.messages_count || 0}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(group.id)} className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={20}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Reports Manager ---
function ReportsManager() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => { fetchReports(); }, []);
  const fetchReports = async () => {
    try {
      const response = await fetch('/api/admin/reports');
      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleResolve = async (id: number) => {
    toast.info('Feature coming soon: Resolve Report');
  };

  return (
    <div>
      <SectionHeader title="Moderation Reports" subtitle="Review flagged content and user behavior" />
      {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-12 h-12" /></div> : reports.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="All clear!" description="No pending reports to review at this time." />
      ) : (
        <div className="space-y-6">
          {reports.map(report => (
            <div key={report.id} className="p-6 md:p-8 border-2 border-gray-100 rounded-3xl bg-white shadow-sm flex flex-col gap-6 hover:border-red-100 transition-all">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-50 rounded-2xl"><AlertTriangle className="text-red-600" size={24}/></div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-red-100 text-red-700">{report.status}</span>
                    <h3 className="mt-1 text-xl font-black text-gray-900">{report.reason}</h3>
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-400">{new Date(report.createdAt).toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Reporter</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center font-black text-gray-900">{report.reporterName?.charAt(0)}</div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{report.reporterName}</p>
                      <p className="text-xs text-gray-500 truncate">{report.reporterEmail}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-red-50/30 rounded-2xl border border-red-100">
                  <p className="text-[10px] font-black text-red-400 uppercase mb-3 tracking-widest">Reported User</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-red-200 flex items-center justify-center font-black text-red-900">{report.reportedUserName?.charAt(0)}</div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{report.reportedUserName}</p>
                      <p className="text-xs text-gray-500 truncate">{report.reportedUserEmail}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button className="px-6 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all">Dismiss</button>
                <button onClick={() => handleResolve(report.id)} className="px-6 py-3 bg-red-600 text-white rounded-xl font-black hover:bg-red-700 shadow-lg shadow-red-100 transition-all">Take Action</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Statistics Manager ---
function StatisticsManager() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/statistics')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-12 h-12" /></div>;
  if (!stats) return <EmptyState icon={TrendingUp} title="No data available" description="Statistics will appear once more users join." />;

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <SectionHeader title="Platform Analytics" subtitle="Growth and engagement overview" />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="p-6 md:p-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl text-white shadow-xl shadow-blue-100 relative overflow-hidden">
          <Users className="absolute -bottom-4 -right-4 w-20 md:w-24 h-20 md:h-24 text-white/10" />
          <p className="text-blue-100 font-bold text-[10px] md:text-sm uppercase tracking-widest mb-1">Total Users</p>
          <p className="text-3xl md:text-5xl font-black">{stats.total}</p>
        </div>
        <div className="p-6 md:p-8 bg-gradient-to-br from-purple-600 to-purple-700 rounded-3xl text-white shadow-xl shadow-purple-100 relative overflow-hidden">
          <Globe className="absolute -bottom-4 -right-4 w-20 md:w-24 h-20 md:h-24 text-white/10" />
          <p className="text-purple-100 font-bold text-[10px] md:text-sm uppercase tracking-widest mb-1">Countries</p>
          <p className="text-3xl md:text-5xl font-black">{Object.keys(stats.countryStats || {}).length}</p>
        </div>
        <div className="p-6 md:p-8 bg-gradient-to-br from-pink-600 to-pink-700 rounded-3xl text-white shadow-xl shadow-pink-100 relative overflow-hidden">
          <MessageCircle className="absolute -bottom-4 -right-4 w-20 md:w-24 h-20 md:h-24 text-white/10" />
          <p className="text-pink-100 font-bold text-[10px] md:text-sm uppercase tracking-widest mb-1">Status</p>
          <p className="text-2xl md:text-4xl font-black uppercase">Live</p>
        </div>
        <div className="p-6 md:p-8 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-3xl text-white shadow-xl shadow-emerald-100 relative overflow-hidden">
          <Shield className="absolute -bottom-4 -right-4 w-20 md:w-24 h-20 md:h-24 text-white/10" />
          <p className="text-emerald-100 font-bold text-[10px] md:text-sm uppercase tracking-widest mb-1">Security</p>
          <p className="text-2xl md:text-4xl font-black uppercase">Active</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="p-6 md:p-8 border-2 border-gray-100 rounded-3xl bg-white shadow-sm">
          <h3 className="font-black text-xl md:text-2xl text-gray-900 mb-8 flex items-center gap-3"><Globe size={28} className="text-blue-500"/> Global Reach</h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {Object.entries(stats.countryStats || {}).sort((a:any, b:any) => b[1] - a[1]).map(([country, count]: any) => (
              <div key={country} className="flex justify-between items-center p-4 hover:bg-blue-50 rounded-2xl border border-transparent hover:border-blue-100 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-black">{country.charAt(0)}</div>
                  <span className="text-gray-900 font-bold text-base md:text-lg">{country}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-2 w-16 md:w-24 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                    <div className="h-full bg-blue-500" style={{width: `${(count/stats.total)*100}%`}} />
                  </div>
                  <span className="font-black text-lg md:text-xl text-gray-900">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Support Manager ---
function SupportManager() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/support')
      .then(r => r.json())
      .then(data => { setTickets(data.tickets || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <SectionHeader title="Support Center" subtitle="Manage help requests and user inquiries" />
      {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-12 h-12" /></div> : tickets.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No tickets" description="Everything is running smoothly. No open support tickets." />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {tickets.map(ticket => (
            <div key={ticket.id} className="p-6 md:p-8 border-2 border-gray-100 rounded-3xl bg-white hover:border-blue-200 hover:shadow-xl transition-all duration-300">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${ticket.status === 'open' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                    {ticket.status === 'open' ? <RefreshCw className="animate-spin-slow" size={24}/> : <Check size={24}/>}
                  </div>
                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${ticket.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{ticket.status}</span>
                    <h3 className="mt-1 text-xl md:text-2xl font-black text-gray-900">{ticket.subject}</h3>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 mb-6">
                <p className="text-gray-700 font-medium leading-relaxed italic">" {ticket.message} "</p>
              </div>
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-50">
                <div className="flex items-center gap-3 self-start">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center font-black text-purple-700">{ticket.userName?.charAt(0)}</div>
                  <div>
                    <p className="font-bold text-gray-900">{ticket.userName}</p>
                    <p className="text-xs text-gray-500">{ticket.userEmail}</p>
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button className="flex-1 md:flex-none px-6 md:px-8 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all">Close</button>
                  <button className="flex-1 md:flex-none px-6 md:px-8 py-3 bg-purple-600 text-white rounded-xl font-black hover:bg-purple-700 shadow-lg shadow-purple-100 transition-all">Reply</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Users Manager ---
function UsersManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [banDuration, setBanDuration] = useState('7');
  const [banReason, setBanReason] = useState('Violation of Community Guidelines');
  const toast = useToast();

  useEffect(() => { fetchUsers(); }, []);
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleBanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/admin/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: selectedUser.id, 
          ban: true, 
          reason: banReason, 
          duration: parseInt(banDuration) 
        }),
      });
      if (response.ok) {
        toast.success(`User ${selectedUser.name} has been banned for ${banDuration} days`);
        setShowBanModal(false);
        fetchUsers();
      }
    } catch (error) { toast.error('Failed to ban user'); } finally { setLoading(false); }
  };

  const handleUnban = async (userId: number) => {
    const confirmed = await toast.confirm({
      title: 'Restore Access',
      message: 'Are you sure you want to restore access for this user?',
      confirmText: 'Unban User',
      type: 'success'
    });
    
    if (!confirmed) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/admin/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ban: false }),
      });
      if (response.ok) {
        toast.success('User access has been restored');
        fetchUsers();
      }
    } catch (error) { toast.error('Failed to unban user'); } finally { setLoading(false); }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    const confirmed = await toast.confirm({
      title: 'Delete User Account',
      message: `Are you sure you want to permanently delete ${userName}'s account? This will remove all their messages, progress, and activity. This action CANNOT be undone.`,
      confirmText: 'Delete Permanently',
      type: 'danger'
    });
    
    if (!confirmed) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (response.ok) {
        toast.success('User and all related data deleted successfully');
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete user');
      }
    } catch (error) { toast.error('Connection error'); } finally { setLoading(false); }
  };

  const toggleAdmin = async (userId: number, currentAdmin: boolean) => {
    const confirmed = await toast.confirm({
      title: 'Change Privileges',
      message: `Are you sure you want to ${currentAdmin ? 'remove' : 'grant'} admin privileges for this user?`,
      confirmText: 'Update Status',
      type: 'info'
    });
    
    if (!confirmed) return;

    const response = await fetch('/api/admin/make-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, isAdmin: !currentAdmin }),
    });
    if (response.ok) {
      toast.success('Admin status updated');
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <SectionHeader 
        title="User Management" 
        subtitle="Control accounts and access levels"
        action={
          <div className="relative w-full md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
            <input type="text" placeholder="Search users..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-12 pr-6 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all w-full font-medium" />
          </div>
        }
      />

      {showBanModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleBanSubmit} className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-red-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-xl text-red-600"><UserX size={24}/></div>
                <h3 className="text-xl md:text-2xl font-black text-gray-900">Ban User</h3>
              </div>
              <button type="button" onClick={() => setShowBanModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={24}/></button>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center font-black text-purple-700 text-xl">{selectedUser?.name.charAt(0)}</div>
                <div className="min-w-0">
                  <p className="font-black text-gray-900 truncate">{selectedUser?.name}</p>
                  <p className="text-xs text-gray-500 font-bold truncate">{selectedUser?.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Ban Duration (Days)</label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {[1, 3, 7, 30, 90, 365].map(d => (
                    <button key={d} type="button" onClick={() => setBanDuration(d.toString())} className={`py-3 rounded-xl font-black text-[10px] md:text-xs transition-all border-2 ${banDuration === d.toString() ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-100' : 'bg-white border-gray-100 text-gray-600 hover:border-red-200'}`}>
                      {d === 365 ? '1 Year' : d >= 30 ? `${d/30} Month` : `${d} Day`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Reason for Ban</label>
                <textarea value={banReason} onChange={e => setBanReason(e.target.value)} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-red-500 focus:ring-0 transition-all text-gray-900 font-medium" rows={3} required />
              </div>
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3">
                <AlertTriangle className="text-red-600 flex-shrink-0" size={20}/>
                <p className="text-xs text-red-700 font-bold leading-relaxed">The user will receive an automated email notification about this ban.</p>
              </div>
            </div>
            <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row justify-end gap-4">
              <button type="button" onClick={() => setShowBanModal(false)} className="px-8 py-4 text-gray-600 font-bold hover:bg-gray-200 rounded-2xl transition-all order-2 md:order-1">Cancel</button>
              <button type="submit" disabled={loading} className="px-12 py-4 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 shadow-xl shadow-red-100 transition-all order-1 md:order-2">
                {loading ? <Loader2 className="animate-spin"/> : 'Confirm Ban'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border-2 border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <th className="p-6 min-w-[200px]">Member</th>
                <th className="p-6 min-w-[150px]">Access Level</th>
                <th className="p-6 min-w-[150px]">Status</th>
                <th className="p-6 min-w-[150px]">Joined Date</th>
                <th className="p-6 text-right min-w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && users.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-purple-600"/></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center font-bold text-gray-400">No users found matching your search.</td></tr>
              ) : filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 font-black text-lg shadow-sm">
                        {user.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 font-medium truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    {user.isAdmin ? (
                      <span className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full border border-blue-100 w-fit">
                        <Shield size={12}/> Administrator
                      </span>
                    ) : (
                      <span className="text-gray-400 font-black text-[10px] uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-full w-fit">Member</span>
                    )}
                  </td>
                  <td className="p-6">
                    {user.isBanned ? (
                      <div className="space-y-1">
                        <span className="flex items-center gap-1.5 text-red-600 font-black text-[10px] uppercase tracking-wider bg-red-50 px-3 py-1 rounded-full border border-red-100 w-fit">
                          <Ban size={12}/> Restricted
                        </span>
                        {user.bannedUntil && (
                          <p className="text-[9px] text-gray-400 font-bold flex items-center gap-1"><Clock size={10}/> Until {new Date(user.bannedUntil).toLocaleDateString()}</p>
                        )}
                      </div>
                    ) : (
                      <span className="flex items-center gap-1.5 text-emerald-600 font-black text-[10px] uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 w-fit">
                        <Check size={12}/> Active
                      </span>
                    )}
                  </td>
                  <td className="p-6 text-sm text-gray-500 font-bold">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-3 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleAdmin(user.id, user.isAdmin)} className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl transition-all ${user.isAdmin ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'}`} title="Toggle Admin"><Shield size={18} className="md:w-5 md:h-5"/></button>
                      {user.isBanned ? (
                        <button onClick={() => handleUnban(user.id)} className="p-2.5 md:p-3 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-lg shadow-emerald-50" title="Restore Access"><Check size={18} className="md:w-5 md:h-5"/></button>
                      ) : (
                        <button onClick={() => { setSelectedUser(user); setShowBanModal(true); }} className="p-2.5 md:p-3 bg-red-50 text-red-600 rounded-xl md:rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-lg shadow-red-50" title="Ban User"><UserX size={18} className="md:w-5 md:h-5"/></button>
                      )}
                      <button onClick={() => handleDeleteUser(user.id, user.name)} className="p-2.5 md:p-3 bg-gray-50 text-gray-400 rounded-xl md:rounded-2xl hover:bg-red-600 hover:text-white transition-all hover:shadow-lg hover:shadow-red-100" title="Delete User"><Trash2 size={18} className="md:w-5 md:h-5"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- VPN Detection Manager ---
function VPNDetectionManager() {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/vpn-logs').then(r => r.json()).then(data => {
      setLogs(data.logs || []);
      setStats(data.stats || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10">
      <SectionHeader title="Security Logs" subtitle="Monitor network activity and threat detection" />
      
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="p-6 md:p-8 bg-white border-2 border-gray-100 rounded-3xl shadow-sm relative overflow-hidden group hover:border-red-200 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><AlertTriangle size={60} className="text-red-600"/></div>
            <p className="text-[10px] md:text-xs text-red-600 font-black uppercase tracking-widest mb-1">VPN Detected</p>
            <p className="text-2xl md:text-4xl font-black text-gray-900">{stats.totalVPN}</p>
          </div>
          <div className="p-6 md:p-8 bg-white border-2 border-gray-100 rounded-3xl shadow-sm relative overflow-hidden group hover:border-orange-200 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Globe size={60} className="text-orange-600"/></div>
            <p className="text-[10px] md:text-xs text-orange-600 font-black uppercase tracking-widest mb-1">Proxy / Tor</p>
            <p className="text-2xl md:text-4xl font-black text-gray-900">{stats.totalTor + stats.totalProxy}</p>
          </div>
          <div className="p-6 md:p-8 bg-white border-2 border-gray-100 rounded-3xl shadow-sm relative overflow-hidden group hover:border-gray-300 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Shield size={60} className="text-gray-600"/></div>
            <p className="text-[10px] md:text-xs text-gray-600 font-black uppercase tracking-widest mb-1">Blocked</p>
            <p className="text-2xl md:text-4xl font-black text-gray-900">{stats.totalBlocked}</p>
          </div>
          <div className="p-6 md:p-8 bg-white border-2 border-gray-100 rounded-3xl shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Star size={60} className="text-blue-600"/></div>
            <p className="text-[10px] md:text-xs text-blue-600 font-black uppercase tracking-widest mb-1">Avg Risk</p>
            <p className="text-2xl md:text-4xl font-black text-gray-900">{Math.round(stats.avgRiskScore)}%</p>
          </div>
        </div>
      )}

      <div className="border-2 border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <th className="p-6 min-w-[200px]">Identity / IP Address</th>
                <th className="p-6 min-w-[200px]">Network Details</th>
                <th className="p-6 min-w-[150px]">Risk Assessment</th>
                <th className="p-6 min-w-[150px]">Threat Type</th>
                <th className="p-6 text-right min-w-[150px]">Detection Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-purple-600"/></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center font-bold text-gray-400">No security logs recorded.</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${log.riskScore > 50 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {log.userName ? log.userName.charAt(0) : 'G'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-gray-900 truncate">{log.userName || 'Guest User'}</p>
                        <p className="text-xs text-gray-500 font-bold tracking-tighter truncate">{log.ipAddress}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <Flag size={14} className="text-gray-400"/>
                      <p className="text-gray-900 font-bold text-sm">{log.country} <span className="text-gray-400 font-medium text-xs">{log.city}</span></p>
                    </div>
                    <p className="text-[10px] text-gray-400 font-black uppercase mt-1 truncate max-w-[150px]">{log.isp}</p>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 w-16 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${log.riskScore > 70 ? 'bg-red-600' : log.riskScore > 40 ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{width: `${log.riskScore}%`}} />
                      </div>
                      <span className={`text-[10px] font-black uppercase ${log.riskScore > 70 ? 'text-red-600' : 'text-gray-900'}`}>{log.riskScore}%</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex gap-1.5 flex-wrap">
                      {log.isVPN && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border border-purple-200">VPN</span>}
                      {log.isTor && <span className="bg-black text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter">TOR</span>}
                      {log.isProxy && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border border-orange-200">Proxy</span>}
                      {!log.isVPN && !log.isTor && !log.isProxy && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border border-emerald-200">Clean</span>}
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <p className="text-xs font-black text-gray-900">{new Date(log.detectedAt).toLocaleTimeString()}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">{new Date(log.detectedAt).toLocaleDateString()}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
