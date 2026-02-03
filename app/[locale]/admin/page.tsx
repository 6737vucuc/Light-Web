'use client';

import { useState, useEffect } from 'react';
import { 
  BookOpen, Heart, Users, MessageCircle, Calendar, Shield,
  Plus, Edit, Trash2, Check, X, Loader2, Ban, UserX, Upload, Image as ImageIcon, Video, AlertTriangle, Quote,
  TrendingUp, Globe, Flag, MessageSquare
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
      <div className="bg-gradient-to-r from-purple-600 to-blue-500 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">{t('dashboard')}</h1>
          <p className="mt-2 text-purple-100">{t('managePlatform')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md mb-6 overflow-x-auto">
          <div className="border-b border-gray-200">
            <nav className="flex whitespace-nowrap">
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

        <div className="bg-white rounded-lg shadow-md p-6 min-h-[400px]">
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
        toast.success('Lesson saved');
        setShowForm(false);
        fetchLessons();
      }
    } catch (error) { toast.error('Error saving lesson'); } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this lesson?')) return;
    try {
      await fetch(`/api/admin/lessons?id=${id}`, { method: 'DELETE' });
      fetchLessons();
    } catch (error) { toast.error('Delete failed'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{t('manageLessons')}</h2>
        <button onClick={() => { setFormData({ id: null, title: '', content: '', imageUrl: '', videoUrl: '', religion: 'christianity' }); setShowForm(true); }} className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg font-bold">
          <Plus className="w-5 h-5 mr-2" /> {t('createNewLesson')}
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
          <input type="text" placeholder={t('title')} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 border rounded text-gray-900" required />
          <textarea placeholder={t('content')} value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full p-2 border rounded text-gray-900" rows={5} required />
          <select value={formData.religion} onChange={e => setFormData({...formData, religion: e.target.value})} className="w-full p-2 border rounded text-gray-900">
            <option value="christianity">{t('christianity')}</option>
            <option value="islam">{t('islam')}</option>
            <option value="judaism">{t('judaism')}</option>
            <option value="all">{t('allReligions')}</option>
          </select>
          <div className="flex gap-4">
            <label className="cursor-pointer bg-blue-100 p-2 rounded text-blue-700 font-bold flex items-center gap-2">
              <ImageIcon size={18} /> {formData.imageUrl ? 'Image Selected' : 'Add Image'}
              <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'image')} />
            </label>
            <label className="cursor-pointer bg-purple-100 p-2 rounded text-purple-700 font-bold flex items-center gap-2">
              <Video size={18} /> {formData.videoUrl ? 'Video Selected' : 'Add Video'}
              <input type="file" className="hidden" accept="video/*" onChange={e => handleFileUpload(e, 'video')} />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 font-bold">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded font-bold">Save</button>
          </div>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lessons.map(lesson => (
          <div key={lesson.id} className="border rounded-xl overflow-hidden bg-white shadow-sm">
            {lesson.imageUrl && <img src={lesson.imageUrl} className="h-40 w-full object-cover" />}
            <div className="p-4">
              <h3 className="font-bold text-gray-900">{lesson.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{lesson.content}</p>
              <div className="mt-4 flex justify-between">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{lesson.religion}</span>
                <div className="flex gap-2">
                  <button onClick={() => { setFormData(lesson); setShowForm(true); }} className="text-blue-600"><Edit size={18}/></button>
                  <button onClick={() => handleDelete(lesson.id)} className="text-red-600"><Trash2 size={18}/></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
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
    try {
      const response = await fetch('/api/admin/verses');
      const data = await response.json();
      setVerses(data.verses || []);
    } catch (error) { console.error(error); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const response = await fetch('/api/admin/verses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verse: formData.content, reference: formData.reference, scheduledDate: formData.scheduledDate, id: formData.id }),
      });
      if (response.ok) {
        toast.success('Verse saved');
        setShowForm(false);
        fetchVerses();
      }
    } catch (error) { toast.error('Error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete?')) return;
    await fetch(`/api/admin/verses?id=${id}`, { method: 'DELETE' });
    fetchVerses();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Daily Verses</h2>
        <button onClick={() => { setFormData({ id: null, content: '', reference: '', religion: 'all', scheduledDate: new Date().toISOString().split('T')[0] }); setShowForm(true); }} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold">Add Verse</button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-50 border rounded-xl space-y-4">
          <textarea placeholder="Verse content" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full p-2 border rounded text-gray-900" rows={3} required />
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Reference" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} className="p-2 border rounded text-gray-900" required />
            <input type="date" value={formData.scheduledDate} onChange={e => setFormData({...formData, scheduledDate: e.target.value})} className="p-2 border rounded text-gray-900" required />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded font-bold">Save</button>
          </div>
        </form>
      )}
      <div className="space-y-4">
        {verses.map(v => (
          <div key={v.id} className="p-4 border rounded-xl flex justify-between items-center bg-white shadow-sm">
            <div>
              <p className="text-gray-900 italic font-medium">"{v.verseText}"</p>
              <p className="text-sm text-purple-600 font-bold">{v.verseReference} - {v.displayDate}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setFormData({ id: v.id, content: v.verseText, reference: v.verseReference, religion: v.religion, scheduledDate: v.displayDate }); setShowForm(true); }} className="text-blue-600"><Edit size={18}/></button>
              <button onClick={() => handleDelete(v.id)} className="text-red-600"><Trash2 size={18}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Groups Manager ---
function GroupsManager() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const handleDelete = async (id: number) => {
    if (!confirm('Delete group and all messages?')) return;
    await fetch(`/api/admin/groups?id=${id}`, { method: 'DELETE' });
    fetchGroups();
    toast.success('Group deleted');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Community Groups</h2>
      {loading ? <Loader2 className="animate-spin mx-auto" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map(group => (
            <div key={group.id} className="border rounded-xl overflow-hidden shadow-sm">
              <div className="h-2 bg-purple-600" style={{ backgroundColor: group.color }}></div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900">{group.name}</h3>
                <p className="text-sm text-gray-500">{group.description}</p>
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-xs text-gray-400">{group.actual_members_count || 0} members</span>
                  <button onClick={() => handleDelete(group.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-full"><Trash2 size={18}/></button>
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

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">User Reports</h2>
      <div className="space-y-4">
        {reports.map(report => (
          <div key={report.id} className="p-4 border rounded-xl bg-white shadow-sm flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded bg-red-100 text-red-700">{report.status}</span>
                <p className="mt-2 text-gray-900 font-bold">Reason: {report.reason}</p>
              </div>
              <span className="text-xs text-gray-400">{new Date(report.createdAt).toLocaleString()}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded border text-sm text-gray-700">
              <p><strong>Reporter:</strong> {report.reporterName} ({report.reporterEmail})</p>
              <p><strong>Target User:</strong> {report.reportedUserName}</p>
              {report.messageContent && <p className="mt-2 italic">" {report.messageContent} "</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Statistics Manager ---
function StatisticsManager() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    fetch('/api/admin/statistics').then(r => r.json()).then(setStats);
  }, []);

  if (!stats) return <Loader2 className="animate-spin mx-auto" />;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
          <p className="text-blue-600 font-bold">Total Users</p>
          <p className="text-4xl font-black text-blue-900">{stats.total}</p>
        </div>
        <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100">
          <p className="text-purple-600 font-bold">Countries</p>
          <p className="text-4xl font-black text-purple-900">{Object.keys(stats.countryStats || {}).length}</p>
        </div>
        <div className="p-6 bg-pink-50 rounded-2xl border border-pink-100">
          <p className="text-pink-600 font-bold">Active Groups</p>
          <p className="text-4xl font-black text-pink-900">Live</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 border rounded-2xl bg-white">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Globe size={20} className="text-blue-500"/> Users by Country</h3>
          <div className="space-y-2">
            {Object.entries(stats.countryStats || {}).map(([country, count]: any) => (
              <div key={country} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                <span className="text-gray-700 font-medium">{country}</span>
                <span className="font-bold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-6 border rounded-2xl bg-white">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Users size={20} className="text-purple-500"/> Gender Distribution</h3>
          <div className="space-y-4">
            {Object.entries(stats.genderStats || {}).map(([gender, count]: any) => (
              <div key={gender}>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700 font-medium capitalize">{gender}</span>
                  <span className="font-bold text-gray-900">{count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${(count / stats.total) * 100}%` }}></div>
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
  useEffect(() => {
    fetch('/api/admin/support').then(r => r.json()).then(data => setTickets(data.tickets || []));
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Support Requests</h2>
      <div className="space-y-4">
        {tickets.map(ticket => (
          <div key={ticket.id} className="p-4 border rounded-xl bg-white shadow-sm">
            <div className="flex justify-between mb-2">
              <h3 className="font-bold text-gray-900">{ticket.subject}</h3>
              <span className={`text-xs font-bold px-2 py-1 rounded ${ticket.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{ticket.status}</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">{ticket.message}</p>
            <div className="flex justify-between items-center text-xs text-gray-400">
              <span>From: {ticket.userName} ({ticket.userEmail})</span>
              <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Users Manager ---
function UsersManager() {
  const [users, setUsers] = useState<any[]>([]);
  const toast = useToast();

  useEffect(() => { fetchUsers(); }, []);
  const fetchUsers = async () => {
    const response = await fetch('/api/admin/users');
    const data = await response.json();
    setUsers(data.users || []);
  };

  const handleBan = async (userId: number, currentBan: boolean) => {
    const response = await fetch('/api/admin/ban-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ban: !currentBan, reason: 'Admin Action' }),
    });
    if (response.ok) {
      toast.success(currentBan ? 'User unbanned' : 'User banned');
      fetchUsers();
    }
  };

  const toggleAdmin = async (userId: number, currentAdmin: boolean) => {
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b text-gray-400 text-sm">
            <th className="pb-4 font-medium">User</th>
            <th className="pb-4 font-medium">Status</th>
            <th className="pb-4 font-medium">Joined</th>
            <th className="pb-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.map(user => (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="py-4">
                <div className="flex gap-2">
                  {user.isAdmin && <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">Admin</span>}
                  {user.isBanned && <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded uppercase">Banned</span>}
                </div>
              </td>
              <td className="py-4 text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
              <td className="py-4 text-right">
                <div className="flex justify-end gap-2">
                  <button onClick={() => toggleAdmin(user.id, user.isAdmin)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg" title="Toggle Admin"><Shield size={18}/></button>
                  <button onClick={() => handleBan(user.id, user.isBanned)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg" title="Toggle Ban"><Ban size={18}/></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- VPN Detection Manager ---
function VPNDetectionManager() {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/vpn-logs').then(r => r.json()).then(data => {
      setLogs(data.logs || []);
      setStats(data.stats || null);
    });
  }, []);

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs text-red-600 font-bold uppercase">VPN Detected</p>
            <p className="text-2xl font-black text-red-900">{stats.totalVPN}</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
            <p className="text-xs text-orange-600 font-bold uppercase">Proxy/Tor</p>
            <p className="text-2xl font-black text-orange-900">{stats.totalTor + stats.totalProxy}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs text-gray-600 font-bold uppercase">Blocked</p>
            <p className="text-2xl font-black text-gray-900">{stats.totalBlocked}</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-600 font-bold uppercase">Avg Risk</p>
            <p className="text-2xl font-black text-blue-900">{Math.round(stats.avgRiskScore)}%</p>
          </div>
        </div>
      )}

      <div className="border rounded-xl overflow-hidden bg-white">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase">
            <tr>
              <th className="p-4">User / IP</th>
              <th className="p-4">Location</th>
              <th className="p-4">Risk</th>
              <th className="p-4">Type</th>
              <th className="p-4 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="p-4">
                  <p className="font-bold text-gray-900">{log.userName || 'Guest'}</p>
                  <p className="text-xs text-gray-500">{log.ipAddress}</p>
                </td>
                <td className="p-4">
                  <p className="text-gray-900">{log.country} {log.city && `, ${log.city}`}</p>
                  <p className="text-xs text-gray-400">{log.isp}</p>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${log.riskScore > 50 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {log.riskScore}% Risk
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-1 flex-wrap">
                    {log.isVPN && <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-bold">VPN</span>}
                    {log.isTor && <span className="bg-black text-white px-1.5 py-0.5 rounded text-[10px] font-bold">TOR</span>}
                    {log.isProxy && <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] font-bold">Proxy</span>}
                  </div>
                </td>
                <td className="p-4 text-right text-xs text-gray-400">
                  {new Date(log.detectedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
