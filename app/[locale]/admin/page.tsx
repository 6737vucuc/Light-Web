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
                  <select value={formData.religion} onChange={e => setFormData({...formData, religion: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 font-bold">
                    <option value="christianity">Christianity</option>
                    <option value="islam">Islam</option>
                    <option value="judaism">Judaism</option>
                    <option value="all">All Religions</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Media Upload</label>
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-2xl hover:border-purple-500 hover:bg-purple-50 cursor-pointer transition-all">
                      <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'image')} className="hidden" />
                      <ImageIcon className="w-5 h-5 mr-2 text-gray-400" />
                      <span className="text-xs font-bold text-gray-500">Image</span>
                    </label>
                    <label className="flex-1 flex items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-2xl hover:border-purple-500 hover:bg-purple-50 cursor-pointer transition-all">
                      <input type="file" accept="video/*" onChange={e => handleFileUpload(e, 'video')} className="hidden" />
                      <Video className="w-5 h-5 mr-2 text-gray-400" />
                      <span className="text-xs font-bold text-gray-500">Video</span>
                    </label>
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
                <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-purple-600 shadow-sm">
                  {lesson.religion}
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
  return <EmptyState icon={Quote} title="Verses Manager" description="Daily verses management coming soon." />;
}

// --- Groups Manager ---
function GroupsManager() {
  const [groups, setGroups] = useState<any[]>([]);
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
              <h3 className="text-xl md:text-2xl font-black text-gray-900">Create Group</h3>
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
                  <button onClick={() => handleDelete(group.id)} className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm">
                    <Trash2 className="w-5 h-5" />
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

// --- Reports Manager ---
function ReportsManager() {
  return <EmptyState icon={AlertTriangle} title="Reports Manager" description="User reports management coming soon." />;
}

// --- Statistics Manager ---
function StatisticsManager() {
  return <EmptyState icon={TrendingUp} title="Statistics" description="Platform statistics coming soon." />;
}

// --- Support Manager ---
function SupportManager() {
  return <EmptyState icon={MessageCircle} title="Support Requests" description="Support tickets management coming soon." />;
}

// --- Users Manager ---
function UsersManager() {
  return <EmptyState icon={Users} title="User Management" description="User accounts management coming soon." />;
}

// --- VPN Detection Manager ---
function VPNDetectionManager() {
  return <EmptyState icon={Shield} title="VPN Detection" description="VPN and proxy detection logs coming soon." />;
}
