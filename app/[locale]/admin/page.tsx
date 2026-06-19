'use client';

import { useState, useEffect } from 'react';
import { 
  BookOpen, Heart, Users, MessageCircle, Calendar, Shield,
  Plus, Edit, Trash2, Check, X, Loader2, Ban, UserX, Upload, Image as ImageIcon, Video, AlertTriangle, Quote, CheckCircle, AlertCircle, Mail,
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
        <EmptyState icon={BookOpen} title="No lessons found" description="Get started by creating your first curriculum lesson." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden">
              {lesson.imageUrl && (
                <div className="relative h-48 w-full overflow-hidden">
                  <img src={lesson.imageUrl} alt={lesson.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-widest text-purple-600 shadow-sm">
                    {lesson.religion}
                  </div>
                </div>
              )}
              <div className="p-6">
                <h4 className="text-xl font-black text-gray-900 mb-2 line-clamp-1">{lesson.title}</h4>
                <p className="text-gray-500 text-sm line-clamp-3 mb-6 font-medium leading-relaxed">{lesson.content}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setFormData(lesson); setShowForm(true); }} className="flex-1 flex items-center justify-center py-3 bg-purple-50 text-purple-600 rounded-xl font-bold hover:bg-purple-600 hover:text-white transition-all">
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </button>
                  <button onClick={() => handleDelete(lesson.id)} className="p-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-600 hover:text-white transition-all">
                    <Trash2 className="w-4 h-4" />
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
  const [formData, setFormData] = useState({ id: null, content: '', reference: '', religion: 'christianity' });

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
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        toast.success(formData.id ? 'Verse updated' : 'Verse created');
        setShowForm(false);
        fetchVerses();
      }
    } catch (error) { toast.error('Error'); } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this verse?')) return;
    try {
      await fetch(`/api/admin/verses?id=${id}`, { method: 'DELETE' });
      toast.success('Verse deleted');
      fetchVerses();
    } catch (error) { toast.error('Error'); }
  };

  return (
    <div>
      <SectionHeader 
        title="Daily Verses" 
        subtitle="Inspirational quotes and holy scriptures"
        action={<button onClick={() => { setFormData({ id: null, content: '', reference: '', religion: 'christianity' }); setShowForm(true); }} className="flex items-center justify-center w-full md:w-auto px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 shadow-lg transition-all"><Plus className="w-5 h-5 mr-2" /> Add Verse</button>}
      />

      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-2xl font-black text-gray-900">{formData.id ? 'Edit Verse' : 'New Verse'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24}/></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Verse Content</label>
                <textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 min-h-[120px]" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Reference (e.g. John 3:16)</label>
                <input type="text" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Religion</label>
                <select value={formData.religion} onChange={e => setFormData({...formData, religion: e.target.value})} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:ring-0 transition-all text-gray-900 font-bold">
                  <option value="christianity">Christianity</option>
                  <option value="islam">Islam</option>
                  <option value="judaism">Judaism</option>
                </select>
              </div>
            </div>
            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-8 py-4 text-gray-600 font-bold">Cancel</button>
              <button type="submit" disabled={loading} className="px-12 py-4 bg-purple-600 text-white rounded-2xl font-black hover:bg-purple-700 shadow-xl transition-all">
                {loading ? <Loader2 className="animate-spin"/> : 'Save Verse'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && verses.length === 0 ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-12 h-12" /></div>
      ) : verses.length === 0 ? (
        <EmptyState icon={Quote} title="No verses yet" description="Add some daily inspiration for your community." />
      ) : (
        <div className="space-y-4">
          {verses.map((verse) => (
            <div key={verse.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-[10px] font-black uppercase tracking-widest">{verse.religion}</span>
                  <span className="text-gray-400 font-bold text-sm">— {verse.reference}</span>
                </div>
                <p className="text-gray-900 font-bold italic">"{verse.content}"</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button onClick={() => { setFormData(verse); setShowForm(true); }} className="flex-1 md:flex-none p-3 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-600 hover:text-white transition-all"><Edit size={18}/></button>
                <button onClick={() => handleDelete(verse.id)} className="flex-1 md:flex-none p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18}/></button>
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
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/reports');
      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleResolve = async (id: number) => {
    try {
      await fetch(`/api/admin/reports?id=${id}`, { method: 'PUT' });
      toast.success('Report marked as resolved');
      fetchReports();
    } catch (error) { toast.error('Error'); }
  };

  return (
    <div>
      <SectionHeader title="Safety Reports" subtitle="Review community flags and safety concerns" />
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-12 h-12" /></div>
      ) : reports.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="All clear!" description="No pending reports to review at this time." />
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${report.status === 'pending' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {report.status}
                  </span>
                  <span className="text-gray-400 font-bold text-xs">{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
                <h4 className="font-black text-gray-900">Reason: {report.reason}</h4>
                <p className="text-gray-500 text-sm font-medium">Type: {report.type} | Reported ID: {report.reportedUserId || report.reportedGroupId}</p>
              </div>
              {report.status === 'pending' && (
                <button onClick={() => handleResolve(report.id)} className="w-full md:w-auto px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center">
                  <Check size={18} className="mr-2" /> Resolve
                </button>
              )}
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/statistics');
        const data = await response.json();
        setStats(data.stats);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  if (loading || !stats) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-12 h-12" /></div>;

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Lessons', value: stats.totalLessons, icon: BookOpen, color: 'bg-purple-500' },
    { label: 'Active Reports', value: stats.pendingReports, icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Support Tickets', value: stats.openTickets, icon: MessageCircle, color: 'bg-orange-500' },
  ];

  return (
    <div>
      <SectionHeader title="Platform Analytics" subtitle="Key performance indicators and metrics" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-lg transition-all">
            <div className={`w-12 h-12 ${card.color} text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-${card.color.split('-')[1]}-100`}>
              <card.icon size={24} />
            </div>
            <h4 className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-1">{card.label}</h4>
            <div className="text-4xl font-black text-gray-900 tracking-tight">{card.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Users Manager ---
function UsersManager() {
  const toast = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleAction = async (id: number, action: 'ban' | 'unban' | 'makeAdmin' | 'removeAdmin') => {
    try {
      await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      toast.success('User updated successfully');
      fetchUsers();
    } catch (error) { toast.error('Error'); }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <SectionHeader 
        title="User Management" 
        subtitle="Manage member accounts and permissions"
        action={
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-12 pr-6 py-3 border-2 border-gray-100 rounded-xl focus:border-purple-500 transition-all font-bold" />
          </div>
        }
      />
      
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500">User</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500">Role</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500">Status</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-bold text-sm">
                        {user.name?.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-400 font-medium">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.isAdmin ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                      {user.isAdmin ? 'Admin' : 'Member'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.isBanned ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {user.isBanned ? 'Banned' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleAction(user.id, user.isAdmin ? 'removeAdmin' : 'makeAdmin')} className="p-2 hover:bg-purple-50 text-purple-600 rounded-lg transition-all" title={user.isAdmin ? 'Remove Admin' : 'Make Admin'}><Shield size={18}/></button>
                      <button onClick={() => handleAction(user.id, user.isBanned ? 'unban' : 'ban')} className={`p-2 rounded-lg transition-all ${user.isBanned ? 'hover:bg-green-50 text-green-600' : 'hover:bg-red-50 text-red-600'}`} title={user.isBanned ? 'Unban' : 'Ban'}>{user.isBanned ? <Check size={18}/> : <Ban size={18}/>}</button>
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
  const toast = useToast();
  const [vpnStats, setVpnStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [blockedIPs, setBlockedIPs] = useState<any[]>([]);
  const [newIP, setNewIP] = useState('');

  useEffect(() => {
    fetchVPNData();
  }, []);

  const fetchVPNData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/vpn');
      const data = await response.json();
      setVpnStats(data.stats);
      setBlockedIPs(data.blockedIPs || []);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleBlockIP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIP) return;
    try {
      await fetch('/api/admin/vpn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: newIP, action: 'block' }),
      });
      toast.success('IP blocked');
      setNewIP('');
      fetchVPNData();
    } catch (error) { toast.error('Error'); }
  };

  const handleUnblockIP = async (ip: string) => {
    try {
      await fetch('/api/admin/vpn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, action: 'unblock' }),
      });
      toast.success('IP unblocked');
      fetchVPNData();
    } catch (error) { toast.error('Error'); }
  };

  return (
    <div>
      <SectionHeader title="Security & VPN" subtitle="Monitor and manage network access and IP blocking" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center">
            <Shield className="mr-2 text-purple-600" /> Block New IP
          </h3>
          <form onSubmit={handleBlockIP} className="space-y-4">
            <input type="text" placeholder="Enter IP address (e.g. 192.168.1.1)" value={newIP} onChange={e => setNewIP(e.target.value)} className="w-full p-4 border-2 border-gray-100 rounded-2xl focus:border-red-500 transition-all font-bold" />
            <button type="submit" className="w-full py-4 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 transition-all shadow-lg shadow-red-100">Block IP Address</button>
          </form>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center">
            <AlertCircle className="mr-2 text-blue-600" /> Security Stats
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
              <span className="font-bold text-gray-600">Blocked IPs</span>
              <span className="text-2xl font-black text-gray-900">{blockedIPs.length}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
              <span className="font-bold text-gray-600">VPN Detections</span>
              <span className="text-2xl font-black text-gray-900">{vpnStats?.totalDetections || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-black text-gray-900">Currently Blocked Addresses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500">IP Address</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500">Reason</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {blockedIPs.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900">{item.ip}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-medium">{item.reason || 'Manual Block'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleUnblockIP(item.ip)} className="px-4 py-2 bg-green-50 text-green-600 rounded-lg font-bold hover:bg-green-600 hover:text-white transition-all text-xs">Unblock</button>
                  </td>
                </tr>
              ))}
              {blockedIPs.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-400 font-medium italic">No IP addresses are currently blocked.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
