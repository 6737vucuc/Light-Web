'use client';

import { useState, useEffect } from 'react';
import { 
  BookOpen, Heart, Users, MessageCircle, Calendar, Shield,
  Plus, Edit, Trash2, Check, X, Loader2, Ban, UserX, Upload, Image as ImageIcon, Video, AlertTriangle, Quote
} from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTranslations } from 'next-intl';

export default function AdminPage() {
  const toast = useToast();
  const t = useTranslations('admin');
  const [activeTab, setActiveTab] = useState('lessons');

  const tabs = [
    { id: 'lessons', label: t('lessons'), icon: BookOpen },
    { id: 'verses', label: 'Daily Verses', icon: Quote },
    { id: 'groups', label: t('groupsManagement'), icon: Users },
    { id: 'reports', label: t('reports'), icon: AlertTriangle },
    { id: 'statistics', label: t('statistics'), icon: Users },
    { id: 'support', label: t('supportRequests'), icon: MessageCircle },
    { id: 'users', label: t('userManagement'), icon: Users },
    { id: 'vpn', label: t('vpnDetection'), icon: AlertTriangle },
    { id: 'security', label: 'Security Dashboard', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-600 to-blue-500 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">{t('dashboard')}</h1>
          <p className="mt-2 text-purple-100">{t('managePlatform')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-6 py-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-900 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          {activeTab === 'lessons' && <LessonsManager />}
          {activeTab === 'verses' && <VersesManager />}
          {activeTab === 'groups' && <GroupsManager />}
          {activeTab === 'reports' && <ReportsManager />}
          {activeTab === 'statistics' && <StatisticsManager />}
          {activeTab === 'support' && <SupportManager />}
          {activeTab === 'users' && <UsersManager />}
          {activeTab === 'vpn' && <VPNDetectionManager />}
          {activeTab === 'security' && <SecurityDashboardRedirect />}
        </div>
      </div>
    </div>
  );
}

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

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/lessons');
      const data = await response.json();
      setLessons(data.lessons || []);
    } catch (error) {
      console.error('Fetch lessons error:', error);
    } finally {
      setLoading(false);
    }
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
      } else {
        const error = await response.json();
        toast.error(error.error || 'Upload failed');
      }
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
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
        toast.success('Lesson saved successfully');
        setShowForm(false);
        setFormData({ id: null, title: '', content: '', imageUrl: '', videoUrl: '', religion: 'christianity' });
        fetchLessons();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to save lesson');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/lessons?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Lesson deleted');
        fetchLessons();
      }
    } catch (error) {
      toast.error('Delete failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('manageLessons')}</h2>
        <button
          onClick={() => {
            setFormData({ id: null, title: '', content: '', imageUrl: '', videoUrl: '', religion: 'christianity' });
            setShowForm(!showForm);
          }}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('createNewLesson')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">{t('title')}</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">{t('content')}</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">{t('religion')}</label>
                <select
                  value={formData.religion}
                  onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 font-medium"
                >
                  <option value="christianity">{t('christianity')}</option>
                  <option value="islam">{t('islam')}</option>
                  <option value="judaism">{t('judaism')}</option>
                  <option value="all">{t('allReligions')}</option>
                </select>
              </div>
              <div className="flex gap-4 items-end">
                <label className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                  <ImageIcon className="w-5 h-5 mr-2" />
                  {t('chooseImage')}
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} className="hidden" disabled={uploading} />
                </label>
                <label className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">
                  <Video className="w-5 h-5 mr-2" />
                  {t('chooseVideo')}
                  <input type="file" accept="video/*" onChange={(e) => handleFileUpload(e, 'video')} className="hidden" disabled={uploading} />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-900 font-bold">{t('cancel')}</button>
              <button type="submit" disabled={loading} className="px-8 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700">
                {loading ? <Loader2 className="animate-spin" /> : t('save')}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lessons.map((lesson) => (
          <div key={lesson.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {lesson.imageUrl && (
              <div className="relative h-48 w-full bg-gray-100">
                <img src={lesson.imageUrl} alt={lesson.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-gray-900 truncate flex-1">{lesson.title}</h3>
                <div className="flex gap-2">
                  <button onClick={() => { setFormData(lesson); setShowForm(true); }} className="text-blue-600 hover:text-blue-800"><Edit className="w-5 h-5" /></button>
                  <button onClick={() => handleDelete(lesson.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
              <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full mb-3 uppercase">
                {lesson.religion}
              </span>
              <p className="text-gray-900 text-sm line-clamp-3 mb-4">{lesson.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VersesManager() {
  const toast = useToast();
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ id: null, content: '', reference: '', religion: 'all' });

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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        toast.success('Verse saved');
        setShowForm(false);
        setFormData({ id: null, content: '', reference: '', religion: 'all' });
        fetchVerses();
      }
    } catch (error) { toast.error('Error'); } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this verse?')) return;
    try {
      await fetch('/api/admin/verses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchVerses();
      toast.success('Deleted');
    } catch (error) { toast.error('Error'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Daily Verses</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 font-bold">
          <Plus className="w-5 h-5" /> Add Verse
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1">Content</label>
              <textarea value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-900 font-medium" rows={3} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Reference</label>
                <input type="text" value={formData.reference} onChange={(e) => setFormData({...formData, reference: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-900 font-medium" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1">Religion</label>
                <select value={formData.religion} onChange={(e) => setFormData({...formData, religion: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-900 font-medium">
                  <option value="all">All</option>
                  <option value="christianity">Christianity</option>
                  <option value="islam">Islam</option>
                  <option value="judaism">Judaism</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2"><button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg font-bold">Save</button></div>
          </div>
        </form>
      )}
      <div className="space-y-4">
        {verses.map((v) => (
          <div key={v.id} className="p-4 bg-white border border-gray-200 rounded-xl flex justify-between items-center shadow-sm">
            <div>
              <p className="text-gray-900 font-medium italic mb-1">"{v.content}"</p>
              <span className="text-sm font-bold text-purple-600">{v.reference}</span>
            </div>
            <button onClick={() => handleDelete(v.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-5 h-5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Minimal versions of other managers to keep the file valid
function GroupsManager() { return <div className="text-gray-900 font-bold">Groups Management (Under Development)</div>; }
function ReportsManager() { return <div className="text-gray-900 font-bold">Reports Management</div>; }
function StatisticsManager() { return <div className="text-gray-900 font-bold">Statistics View</div>; }
function SupportManager() { return <div className="text-gray-900 font-bold">Support Requests</div>; }
function UsersManager() { return <div className="text-gray-900 font-bold">User Management</div>; }
function VPNDetectionManager() { return <div className="text-gray-900 font-bold">VPN Detection Settings</div>; }
function SecurityDashboardRedirect() { return <div className="text-gray-900 font-bold italic">Redirecting to Security Dashboard...</div>; }
