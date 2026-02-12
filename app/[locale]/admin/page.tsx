'use client';

import { useState, useEffect } from 'react';
import { 
  BookOpen, Heart, Users, MessageCircle, Calendar, Shield,
  Plus, Edit, Trash2, Check, X, Loader2, Ban, UserX, Upload, Image as ImageIcon, Video, AlertTriangle, Quote,
  TrendingUp, Globe, Flag, MessageSquare, Search, Filter, MoreVertical, RefreshCw, Star, Clock,
  Hash, Zap, Bell, Music, Camera, Map, Award, Coffee, Book, Smile, Heart as HeartIcon, Sun, Moon, Cloud, Ghost, 
  Gamepad, Code, Terminal, Database, Cpu, Globe as GlobeIcon, Briefcase, GraduationCap, ShoppingBag, Gift,
  Palette, Camera as CameraIcon, Mic, Radio, Headphones, Video as VideoIcon, Tv, Smartphone, Laptop, Monitor
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTranslations } from 'next-intl';
import SupportManager from '@/components/admin/SupportManager';
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

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
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
  const [lessons, setLessons] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
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
      const data = await response.json();
      
      if (response.ok && data.url) {
        if (type === 'image') setFormData(prev => ({ ...prev, imageUrl: data.url }));
        else setFormData(prev => ({ ...prev, videoUrl: data.url }));
        toast.success(type === 'image' ? 'Image uploaded successfully' : 'Video uploaded successfully');
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) { 
      console.error('Upload error:', error);
      toast.error(error.message || 'Upload failed'); 
    } finally { setUploading(false); }
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
                  <select value={formData.religion} onChange={e => setFormData({...formData, religion: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 font-bold">
                    <option value="christianity">Christianity</option>
                    <option value="islam">Islam</option>
                    <option value="judaism">Judaism</option>
                    <option value="all">All Religions</option>
                  </select>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Media Upload</label>
                    <div className="flex gap-2">
                      <label className="flex-1 flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-2xl hover:border-purple-500 hover:bg-purple-50 cursor-pointer transition-all">
                        <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'image')} className="hidden" />
                        <ImageIcon className="w-5 h-5 mr-2 text-gray-400" />
                        <span className="text-xs font-bold text-gray-500">Upload Image</span>
                      </label>
                      <label className="flex-1 flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-2xl hover:border-purple-500 hover:bg-purple-50 cursor-pointer transition-all">
                        <input type="file" accept="video/*" onChange={e => handleFileUpload(e, 'video')} className="hidden" />
                        <Video className="w-5 h-5 mr-2 text-gray-400" />
                        <span className="text-xs font-bold text-gray-500">Upload Video</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Or Paste Video Link (YouTube / Vimeo)</label>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="https://www.youtube.com/watch?v=..." 
                        value={formData.videoUrl} 
                        onChange={e => setFormData({...formData, videoUrl: e.target.value})} 
                        className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 text-sm" 
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium px-2 italic">* Use links for large videos to avoid upload limits.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row justify-end gap-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-8 py-4 text-gray-600 font-bold order-2 md:order-1">Cancel</button>
              <button type="submit" disabled={loading || uploading} className="px-12 py-4 bg-purple-600 text-white rounded-2xl font-black hover:bg-purple-700 shadow-xl transition-all order-1 md:order-2 flex items-center justify-center">
                {loading ? <Loader2 className="animate-spin"/> : formData.id ? 'Update Lesson' : 'Create Lesson'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && lessons.length === 0 ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-12 h-12" /></div>
      ) : lessons.length === 0 ? (
        <EmptyState icon={BookOpen} title="No lessons yet" description="Start your curriculum by creating the first lesson." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {lessons.map(lesson => (
            <div key={lesson.id} className="group border-2 border-gray-100 rounded-3xl overflow-hidden bg-white hover:border-purple-200 hover:shadow-2xl transition-all duration-300">
              <div className="h-48 bg-gray-100 relative overflow-hidden">
                {lesson.imageurl ? (
                  <img src={lesson.imageurl} alt={lesson.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-purple-50 text-purple-200">
                    <BookOpen size={64} />
                  </div>
                )}
                <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                  <div className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-purple-600 shadow-sm">
                    {lesson.religion}
                  </div>
                  {lesson.videourl && (
                    <div className="p-2 bg-purple-600 rounded-full text-white shadow-lg animate-pulse" title={lesson.videourl.includes('youtube') ? 'YouTube Video' : lesson.videourl.includes('vimeo') ? 'Vimeo Video' : 'Direct Video'}>
                      {lesson.videourl.includes('youtube') || lesson.videourl.includes('vimeo') ? <Globe size={12} /> : <Video size={12} />}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-black text-xl text-gray-900 mb-2 line-clamp-1">{lesson.title}</h3>
                <p className="text-gray-500 text-sm line-clamp-2 font-medium mb-6 h-10">{lesson.content}</p>
                <div className="flex gap-3">
                  <button onClick={() => { setFormData({ id: lesson.id, title: lesson.title, content: lesson.content, imageUrl: lesson.imageurl, videoUrl: lesson.videourl, religion: lesson.religion }); setShowForm(true); }} className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-700 rounded-2xl font-bold hover:bg-purple-50 hover:text-purple-600 transition-all">
                    <Edit size={18} /> Edit
                  </button>
                  <button onClick={() => handleDelete(lesson.id)} className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all">
                    <Trash2 size={18} />
                  </button>
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
  const [formData, setFormData] = useState({ id: null, content: '', reference: '', religion: 'all', displayDate: new Date().toISOString().split('T')[0] });

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
      const response = await fetch('/api/admin/verses', {
        method: formData.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        toast.success(formData.id ? 'Verse updated' : 'Verse created');
        setShowForm(false);
        fetchVerses();
      }
    } catch (error) { toast.error('Error saving verse'); } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await toast.confirm({
      title: 'Delete Verse',
      message: 'Are you sure you want to delete this verse?',
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!confirmed) return;
    try {
      await fetch(`/api/admin/verses?id=${id}`, { method: 'DELETE' });
      toast.success('Verse deleted');
      fetchVerses();
    } catch (error) { toast.error('Delete failed'); }
  };

  return (
    <div>
      <SectionHeader 
        title="Daily Verses" 
        subtitle="Manage inspirational quotes and verses"
        action={
          <button onClick={() => { setFormData({ id: null, content: '', reference: '', religion: 'all' , displayDate: '' }); setShowForm(true); }} className="flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg transition-all">
            <Plus className="w-5 h-5 mr-2" /> New Verse
          </button>
        }
      />

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl md:text-2xl font-black text-gray-900">{formData.id ? 'Edit Verse' : 'New Verse'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24}/></button>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase">Verse Content</label>
                <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 font-medium" rows={4} required />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase">Reference</label>
                  <input type="text" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 font-bold" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase">Religion</label>
                  <select value={formData.religion} onChange={e => setFormData({...formData, religion: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 font-bold">
                    <option value="all">All</option>
                    <option value="christianity">Christianity</option>
                    <option value="islam">Islam</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase">Display Date</label>
                <input type="date" value={formData.displayDate} onChange={e => setFormData({...formData, displayDate: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 font-bold" required />
                <p className="text-xs text-gray-400 font-medium">Select the specific date this verse should appear.</p>
              </div>
            </div>
            <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-8 py-4 text-gray-600 font-bold">Cancel</button>
              <button type="submit" className="px-12 py-4 bg-purple-600 text-white rounded-2xl font-black hover:bg-purple-700 shadow-xl transition-all">Save Verse</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {verses.map(v => (
          <div key={v.id} className="p-6 bg-white border-2 border-gray-100 rounded-3xl hover:border-purple-200 transition-all group">
            <Quote className="text-purple-200 mb-4" size={32} />
            <p className="text-gray-800 font-medium mb-4 italic">&quot;{v.content}&quot;</p>
            <div className="flex justify-between items-end">
              <div>
                <p className="font-black text-gray-900">{v.reference}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-black uppercase">{v.religion}</span>
                  {v.displayDate && (
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                      <Clock size={10} /> {v.displayDate}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setFormData({ id: v.id, content: v.content, reference: v.reference, religion: v.religion, displayDate: v.displayDate || new Date().toISOString().split('T')[0] }); setShowForm(true); }} className="p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-purple-50 hover:text-purple-600 transition-all"><Edit size={18}/></button>
                <button onClick={() => handleDelete(v.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Groups Manager ---
function GroupsManager() {
  const [groups, setGroups] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ id: null, name: '', description: '', color: '#8B5CF6', icon: 'Users' });
  const toast = useToast();

  const availableIcons = [
    'Users', 'MessageCircle', 'Hash', 'Zap', 'Bell', 'Heart', 'Star', 'Music', 'Camera', 'Map', 
    'Award', 'Coffee', 'Book', 'Smile', 'Sun', 'Moon', 'Cloud', 'Ghost', 'Gamepad', 'Code', 
    'Terminal', 'Database', 'Cpu', 'Globe', 'Briefcase', 'GraduationCap', 'ShoppingBag', 'Gift',
    'Palette', 'Mic', 'Radio', 'Headphones', 'Tv', 'Smartphone', 'Laptop', 'Monitor'
  ];

  const availableColors = [
    '#8B5CF6', '#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#EC4899', 
    '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#D946EF', '#14B8A6',
    '#475569', '#000000', '#7C2D12', '#1E3A8A', '#064E3B', '#701A75'
  ];

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
        toast.success(formData.id ? 'Group updated' : 'Group created');
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

  const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
    const IconComponent = (LucideIcons as any)[name] || LucideIcons.Users;
    return <IconComponent className={className} />;
  };

  return (
    <div>
      <SectionHeader 
        title="Community Groups" 
        subtitle="Manage discussion circles and chat rooms"
        action={
          <div className="flex flex-col md:flex-row gap-3">
            <button 
              onClick={async () => {
                const confirmed = await toast.confirm({
                  title: 'Clear All Groups',
                  message: 'Are you sure you want to delete ALL community groups and their messages? This action is permanent.',
                  confirmText: 'Delete All',
                  type: 'danger'
                });
                if (!confirmed) return;
                try {
                  const res = await fetch('/api/admin/groups', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'clearAll' })
                  });
                  if (res.ok) {
                    toast.success('All groups cleared');
                    fetchGroups();
                  }
                } catch (err) { toast.error('Failed to clear groups'); }
              }}
              className="flex items-center justify-center px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 border-2 border-red-100 transition-all"
            >
              <Trash2 className="w-5 h-5 mr-2" /> Clear All
            </button>
            <button onClick={() => { setFormData({ id: null, name: '', description: '', color: '#8B5CF6', icon: 'Users' }); setShowForm(true); }} className="flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg transition-all">
              <Plus className="w-5 h-5 mr-2" /> New Group
            </button>
          </div>
        }
      />

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in duration-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl md:text-2xl font-black text-gray-900">{formData.id ? 'Edit Group' : 'Create Group'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24}/></button>
            </div>
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase">Group Name</label>
                    <input type="text" placeholder="e.g. Morning Prayer" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 font-bold" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase">Description</label>
                    <textarea placeholder="What is this group about?" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 font-medium" rows={4} />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase">Theme Color</label>
                    <div className="grid grid-cols-6 gap-2 p-2 bg-gray-50 rounded-2xl border-2 border-gray-100">
                      {availableColors.map(c => (
                        <button key={c} type="button" onClick={()=>setFormData({...formData, color: c})} className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === c ? 'border-white ring-2 ring-purple-500 scale-110' : 'border-transparent hover:scale-105'}`} style={{backgroundColor: c}} />
                      ))}
                      <div className="col-span-6 mt-2">
                        <input type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className="w-full h-10 rounded-xl cursor-pointer bg-white border-2 border-gray-100 p-1" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase">Group Icon</label>
                    <div className="grid grid-cols-6 gap-2 p-2 bg-gray-50 rounded-2xl border-2 border-gray-100 max-h-[150px] overflow-y-auto custom-scrollbar">
                      {availableIcons.map(iconName => (
                        <button 
                          key={iconName} 
                          type="button" 
                          onClick={()=>setFormData({...formData, icon: iconName})} 
                          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${formData.icon === iconName ? 'bg-purple-600 text-white scale-110 shadow-lg' : 'bg-white text-gray-400 hover:bg-purple-50 hover:text-purple-600'}`}
                        >
                          <DynamicIcon name={iconName} className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-purple-50 rounded-3xl border-2 border-purple-100 flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl" style={{ backgroundColor: formData.color }}>
                  <DynamicIcon name={formData.icon} className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h4 className="font-black text-purple-900 text-lg">{formData.name || 'Group Preview'}</h4>
                  <p className="text-purple-700 text-sm font-medium opacity-70">This is how your group will look in the community.</p>
                </div>
              </div>
            </div>
            <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-100 flex flex-col md:flex-row justify-end gap-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-8 py-4 text-gray-600 font-bold order-2 md:order-1">Cancel</button>
              <button type="submit" disabled={loading} className="px-12 py-4 bg-purple-600 text-white rounded-2xl font-black hover:bg-purple-700 shadow-xl transition-all order-1 md:order-2">
                {loading ? <Loader2 className="animate-spin"/> : formData.id ? 'Update Group' : 'Create Group'}
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
                <DynamicIcon name={group.icon} className="w-16 h-16 text-white/30" />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${group.color}20`, color: group.color }}>
                    <DynamicIcon name={group.icon} className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-xl text-gray-900">{group.name}</h3>
                </div>
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
                  <div className="flex gap-2">
                    <button onClick={() => { setFormData({ id: group.id, name: group.name, description: group.description, color: group.color, icon: group.icon }); setShowForm(true); }} className="p-3 bg-gray-50 text-gray-600 rounded-2xl hover:bg-purple-50 hover:text-purple-600 transition-all shadow-sm"><Edit size={18}/></button>
                    <button onClick={() => handleDelete(group.id)} className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={18} /></button>
                  </div>
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

  useEffect(() => {
    fetch('/api/admin/reports').then(r => r.json()).then(data => {
      setReports(data.reports || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <SectionHeader title="User Reports" subtitle="Review and handle community violations" />
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-12 h-12" /></div>
      ) : reports.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="All clear!" description="No active reports to review at the moment." />
      ) : (
        <div className="bg-white border-2 border-gray-100 rounded-3xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                <th className="p-6">Reporter</th>
                <th className="p-6">Target</th>
                <th className="p-6">Reason</th>
                <th className="p-6">Status</th>
                <th className="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reports.map(report => (
                <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-6 font-bold text-gray-900">{report.reporter_name}</td>
                  <td className="p-6 font-bold text-red-600">{report.target_name}</td>
                  <td className="p-6 text-sm text-gray-500">{report.reason}</td>
                  <td className="p-6">
                    <span className="px-3 py-1 bg-orange-50 text-orange-600 text-[10px] font-black uppercase rounded-full border border-orange-100">Pending</span>
                  </td>
                  <td className="p-6 text-right">
                    <button className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-600 hover:text-white transition-all"><MoreVertical size={18}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    fetch('/api/admin/statistics').then(r => r.json()).then(data => {
      setStats(data.stats);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-12 h-12" /></div>;

  return (
    <div className="space-y-8">
      <SectionHeader title="Platform Statistics" subtitle="Real-time overview of your community growth" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'blue' },
          { label: 'Active Groups', value: stats?.totalGroups || 0, icon: Hash, color: 'purple' },
          { label: 'Messages Sent', value: stats?.totalMessages || 0, icon: MessageSquare, color: 'emerald' },
          { label: 'Daily Verses', value: stats?.totalVerses || 0, icon: Quote, color: 'orange' },
        ].map((s, i) => (
          <div key={i} className="p-8 bg-white border-2 border-gray-100 rounded-3xl shadow-sm hover:border-purple-200 transition-all group">
            <div className={`p-3 bg-${s.color}-50 text-${s.color}-600 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform`}>
              <s.icon size={24} />
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
            <p className="text-4xl font-black text-gray-900">{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Support Manager ---
function SupportManager() {
  const toast = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replying, setReplying] = useState(false);
  const [filter, setFilter] = useState<'all' | 'technical' | 'testimony' | 'prayer'>('all');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/admin/support');
      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyMessage.trim()) {
      toast.show('Please enter a reply message', 'error');
      return;
    }
    if (!selectedTicket) return;
    setReplying(true);
    try {
      const response = await fetch(`/api/admin/support/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage }),
      });
      if (response.ok) {
        toast.show('Reply sent successfully', 'success');
        setReplyMessage('');
        setSelectedTicket(null);
        fetchTickets();
      } else {
        toast.show('Failed to send reply', 'error');
      }
    } catch (error) {
      toast.show('Error sending reply', 'error');
    } finally {
      setReplying(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      technical: 'bg-red-50 text-red-600 border-red-200',
      testimony: 'bg-green-50 text-green-600 border-green-200',
      prayer: 'bg-blue-50 text-blue-600 border-blue-200',
    };
    return colors[type] || 'bg-gray-50 text-gray-600 border-gray-200';
  };

  const filteredTickets = filter === 'all' ? tickets : tickets.filter(t => t.type === filter);

  return (
    <div>
      <SectionHeader title="Support Tickets" subtitle="Help users with their inquiries and issues" />
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-12 h-12" /></div>
      ) : tickets.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No tickets" description="Your support queue is currently empty." />
      ) : (
        <div className="space-y-4">
          {tickets.map(ticket => (
            <div key={ticket.id} className="p-6 bg-white border-2 border-gray-100 rounded-3xl hover:border-purple-200 transition-all flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><MessageCircle size={24}/></div>
                <div>
                  <h4 className="font-black text-gray-900">{ticket.subject}</h4>
                  <p className="text-sm text-gray-500 font-medium">From: {ticket.user_name} • {new Date(ticket.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <button className="px-6 py-3 bg-gray-50 text-gray-700 rounded-xl font-bold hover:bg-purple-600 hover:text-white transition-all">Reply</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Users Manager ---
function UsersManager() {
  const toast = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banDuration, setBanDuration] = useState('7');
  const [banReason, setBanReason] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleDeleteUser = async (userId: number, name: string) => {
    const confirmed = await toast.confirm({
      title: 'Delete User Account',
      message: `Are you sure you want to permanently delete ${name}'s account? This action cannot be undone.`,
      confirmText: 'Delete Account',
      type: 'danger'
    });
    
    if (!confirmed) return;

    const response = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' });
    if (response.ok) {
      toast.success('User deleted');
      fetchUsers();
    }
  };

  const handleBanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/admin/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: selectedUser.id, 
          duration: parseInt(banDuration),
          reason: banReason
        }),
      });
      if (response.ok) {
        toast.success('User banned successfully');
        setShowBanModal(false);
        fetchUsers();
      }
    } catch (error) { toast.error('Error banning user'); } finally { setLoading(false); }
  };

  const handleUnban = async (userId: number) => {
    const confirmed = await toast.confirm({
      title: 'Restore User Access',
      message: 'Are you sure you want to lift the ban for this user?',
      confirmText: 'Unban User',
      type: 'info'
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
        toast.success('User unbanned');
        fetchUsers();
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
              <button type="button" onClick={() => setShowBanModal(false)} className="px-8 py-4 text-gray-600 font-bold order-2 md:order-1">Cancel</button>
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
          <div className="p-6 md:p-8 bg-white border-2 border-gray-100 rounded-3xl shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Check size={60} className="text-emerald-600"/></div>
            <p className="text-[10px] md:text-xs text-emerald-600 font-black uppercase tracking-widest mb-1">Safe Access</p>
            <p className="text-2xl md:text-4xl font-black text-gray-900">{stats.totalSafe}</p>
          </div>
          <div className="p-6 md:p-8 bg-white border-2 border-gray-100 rounded-3xl shadow-sm relative overflow-hidden group hover:border-purple-200 transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Shield size={60} className="text-purple-600"/></div>
            <p className="text-[10px] md:text-xs text-purple-600 font-black uppercase tracking-widest mb-1">Total Checks</p>
            <p className="text-2xl md:text-4xl font-black text-gray-900">{stats.totalLogs}</p>
          </div>
        </div>
      )}

      <div className="bg-white border-2 border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <th className="p-6">User / IP Address</th>
                <th className="p-6">Location</th>
                <th className="p-6">Security Status</th>
                <th className="p-6">Detection Method</th>
                <th className="p-6 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-purple-600"/></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center font-bold text-gray-400">No security logs recorded yet.</td></tr>
              ) : logs.map((log, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${log.is_vpn ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {log.is_vpn ? <Shield size={18}/> : <Check size={18}/>}
                      </div>
                      <div>
                        <p className="font-black text-gray-900">{log.ip_address}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{log.user_name || 'Guest User'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-gray-400"/>
                      <span className="text-sm text-gray-600 font-bold">{log.country || 'Unknown'}, {log.city || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    {log.is_vpn ? (
                      <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider rounded-full border border-red-100">VPN / Proxy</span>
                    ) : (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider rounded-full border border-emerald-100">Clean IP</span>
                    )}
                  </td>
                  <td className="p-6">
                    <span className="text-xs text-gray-500 font-bold">{log.isp || 'Standard ISP'}</span>
                  </td>
                  <td className="p-6 text-right text-xs text-gray-400 font-bold">
                    {new Date(log.created_at).toLocaleString()}
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
