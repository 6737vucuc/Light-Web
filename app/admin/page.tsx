'use client';

import { useState, useEffect } from 'react';
import { 
  BookOpen, Heart, Users, MessageCircle, Calendar, Shield,
  Plus, Edit, Trash2, Check, X, Loader2, Ban, UserX, Upload, Image as ImageIcon, Video, AlertTriangle
} from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';

export default function AdminPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('lessons');
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'lessons', label: 'Lessons', icon: BookOpen },
    { id: 'verses', label: 'Daily Verses', icon: Calendar },
    { id: 'groups', label: 'Groups Management', icon: Users },
    { id: 'reports', label: 'Reports', icon: AlertTriangle },
    { id: 'statistics', label: 'Statistics', icon: Users },
    { id: 'testimonies', label: 'Testimonies', icon: Heart },
    { id: 'support', label: 'Support Requests', icon: MessageCircle },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'vpn', label: 'VPN Detection', icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-600 to-blue-500 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <p className="mt-2 text-purple-100">Manage your ministry platform</p>
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
          {activeTab === 'testimonies' && <TestimoniesManager />}
          {activeTab === 'support' && <SupportManager />}
          {activeTab === 'users' && <UsersManager />}
          {activeTab === 'vpn' && <VPNDetectionManager />}
        </div>
      </div>
    </div>
  );
}

function LessonsManager() {
  const toast = useToast();
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
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (type === 'image') {
          setFormData(prev => ({ ...prev, imageUrl: data.url }));
        } else {
          setFormData(prev => ({ ...prev, videoUrl: data.url }));
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
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
        setShowForm(false);
        setFormData({ id: null, title: '', content: '', imageUrl: '', videoUrl: '', religion: 'christianity' });
        fetchLessons();
      }
    } catch (error) {
      console.error('Submit lesson error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/lessons?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchLessons();
      }
    } catch (error) {
      console.error('Delete lesson error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Lessons</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New Lesson
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-6 bg-gray-50 rounded-lg">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              />
            </div>
            
            {/* Religion Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Religion / الديانة
              </label>
              <select
                value={formData.religion}
                onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              >
                <option value="christianity">Christianity / المسيحية</option>
                <option value="islam">Islam / الإسلام</option>
                <option value="judaism">Judaism / اليهودية</option>
                <option value="all">All Religions / جميع الديانات</option>
              </select>
            </div>
            
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Image (optional)
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Choose Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'image')}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                {formData.imageUrl && (
                  <span className="text-sm text-green-600">✓ Image uploaded</span>
                )}
                {uploading && <Loader2 className="w-5 h-5 animate-spin" />}
              </div>
              {formData.imageUrl && (
                <img src={formData.imageUrl} alt="Preview" className="mt-2 h-32 rounded-lg" />
              )}
            </div>

            {/* Video Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Video (optional)
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">
                  <Video className="w-5 h-5 mr-2" />
                  Choose Video
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileUpload(e, 'video')}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                {formData.videoUrl && (
                  <span className="text-sm text-green-600">✓ Video uploaded</span>
                )}
              </div>
              {formData.videoUrl && (
                <video src={formData.videoUrl} controls className="mt-2 h-48 rounded-lg" />
              )}
            </div>

            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={loading || uploading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : formData.id ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ id: null, title: '', content: '', imageUrl: '', videoUrl: '', religion: 'christianity' });
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {loading && !showForm ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="grid gap-4">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{lesson.title}</h3>
                  <p className="text-sm text-purple-600 font-medium">
                    {lesson.religion === 'christianity' && 'المسيحية / Christianity'}
                    {lesson.religion === 'islam' && 'الإسلام / Islam'}
                    {lesson.religion === 'judaism' && 'اليهودية / Judaism'}
                    {lesson.religion === 'all' && 'جميع الديانات / All Religions'}
                  </p>
                  <p className="text-gray-600 mt-2">{lesson.content.substring(0, 150)}...</p>
                  {lesson.imageUrl && (
                    <img src={lesson.imageUrl} alt={lesson.title} className="mt-2 h-24 rounded" />
                  )}
                  {lesson.videoUrl && (
                    <p className="text-sm text-purple-600 mt-2">📹 Video attached</p>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => {
                      setFormData(lesson);
                      setShowForm(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(lesson.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
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

// VersesManager with file upload
function VersesManager() {
  const toast = useToast();
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    verse: '',
    reference: '',
    imageUrl: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    religion: 'christianity',
  });

  useEffect(() => {
    fetchVerses();
  }, []);

  const fetchVerses = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/verses');
      const data = await response.json();
      setVerses(data.verses || []);
    } catch (error) {
      console.error('Fetch verses error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, imageUrl: data.url }));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
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
      const response = await fetch('/api/admin/verses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowForm(false);
        setFormData({ 
          id: null, 
          verse: '', 
          reference: '', 
          imageUrl: '', 
          scheduledDate: new Date().toISOString().split('T')[0],
          religion: 'christianity'
        });
        fetchVerses();
      }
    } catch (error) {
      console.error('Submit verse error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this verse?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/verses?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchVerses();
      }
    } catch (error) {
      console.error('Delete verse error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Daily Verses</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Daily Verse
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-6 bg-gray-50 rounded-lg">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verse Text
              </label>
              <textarea
                value={formData.verse}
                onChange={(e) => setFormData({ ...formData, verse: e.target.value })}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference (e.g., John 3:16)
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Date
              </label>
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              />
            </div>
            
            {/* Religion Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Religion / الديانة
              </label>
              <select
                value={formData.religion}
                onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              >
                <option value="christianity">Christianity / المسيحية</option>
                <option value="islam">Islam / الإسلام</option>
                <option value="judaism">Judaism / اليهودية</option>
              </select>
            </div>
            
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Image (optional)
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Choose Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                {formData.imageUrl && (
                  <span className="text-sm text-green-600">✓ Image uploaded</span>
                )}
                {uploading && <Loader2 className="w-5 h-5 animate-spin" />}
              </div>
              {formData.imageUrl && (
                <img src={formData.imageUrl} alt="Preview" className="mt-2 h-32 rounded-lg" />
              )}
            </div>

            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={loading || uploading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : formData.id ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ 
                    id: null, 
                    verse: '', 
                    reference: '', 
                    imageUrl: '', 
                    scheduledDate: new Date().toISOString().split('T')[0] 
                  });
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {loading && !showForm ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="grid gap-4">
          {verses.map((verse) => (
            <div key={verse.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="text-lg italic">&quot;{verse.verseText}&quot;</p>
                  <p className="text-sm text-gray-600 mt-2">- {verse.verseReference}</p>
                  <p className="text-sm text-purple-600 font-medium mt-1">
                    {verse.religion === 'christianity' && 'المسيحية / Christianity'}
                    {verse.religion === 'islam' && 'الإسلام / Islam'}
                    {verse.religion === 'judaism' && 'اليهودية / Judaism'}
                  </p>
                  <p className="text-xs text-gray-900 mt-1">
                    Display Date: {new Date(verse.displayDate).toLocaleDateString()}
                  </p>
                  {verse.imageUrl && (
                    <img src={verse.imageUrl} alt={verse.reference} className="mt-2 h-24 rounded" />
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => {
                      setFormData({
                        id: verse.id,
                        verse: verse.verseText,
                        reference: verse.verseReference,
                        imageUrl: verse.imageUrl || '',
                        scheduledDate: new Date(verse.displayDate).toISOString().split('T')[0],
                        religion: verse.religion || 'christianity'
                      });
                      setShowForm(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(verse.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
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

function StatisticsManager() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/statistics');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Fetch statistics error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">User Statistics</h2>
      
      {/* Gender Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Users</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{stats?.total || 0}</p>
            </div>
            <Users className="w-12 h-12 text-blue-600 opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Male Users</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">{stats?.genderStats?.Male || 0}</p>
              <p className="text-xs text-purple-600 mt-1">
                {stats?.total > 0 ? Math.round((stats?.genderStats?.Male || 0) / stats.total * 100) : 0}%
              </p>
            </div>
            <Users className="w-12 h-12 text-purple-600 opacity-50" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-pink-600">Female Users</p>
              <p className="text-3xl font-bold text-pink-900 mt-2">{stats?.genderStats?.Female || 0}</p>
              <p className="text-xs text-pink-600 mt-1">
                {stats?.total > 0 ? Math.round((stats?.genderStats?.Female || 0) / stats.total * 100) : 0}%
              </p>
            </div>
            <Users className="w-12 h-12 text-pink-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* Country Distribution */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Users by Country</h3>
        <div className="space-y-3">
          {stats?.countryStats && Object.entries(stats.countryStats)
            .sort((a: any, b: any) => b[1] - a[1])
            .slice(0, 10)
            .map(([country, count]: [string, any]) => (
              <div key={country} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{country}</span>
                    <span className="text-sm text-gray-900">{count} users</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-blue-500 h-2 rounded-full"
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// Testimonies Manager
function TestimoniesManager() {
  const toast = useToast();
  const [testimonies, setTestimonies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTestimonies();
  }, []);

  const fetchTestimonies = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/testimonies');
      const data = await response.json();
      setTestimonies(data.testimonies || []);
    } catch (error) {
      console.error('Fetch testimonies error:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTestimony = async (id: number) => {
    if (!confirm('Are you sure you want to delete this testimony?')) return;

    try {
      const response = await fetch(`/api/admin/testimonies/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Testimony deleted successfully');
        fetchTestimonies();
      } else {
        toast.error('Failed to delete testimony');
      }
    } catch (error) {
      console.error('Delete testimony error:', error);
      toast.error('Failed to delete testimony');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Testimonies</h2>
        <p className="text-gray-600">Total: {testimonies.length}</p>
      </div>

      {testimonies.length === 0 ? (
        <div className="text-center py-12 text-gray-900">
          No testimonies yet
        </div>
      ) : (
        <div className="space-y-4">
          {testimonies.map((testimony) => (
            <div key={testimony.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">{testimony.userName}</span>
                    <span className="text-sm text-gray-900">
                      {new Date(testimony.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{testimony.content}</p>
                </div>
                <button
                  onClick={() => deleteTestimony(testimony.id)}
                  className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Support Requests Manager
function SupportManager() {
  const toast = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/support');
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Fetch support requests error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const response = await fetch(`/api/admin/support/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success('Status updated successfully');
        fetchRequests();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('Failed to update status');
    }
  };

  const deleteRequest = async (id: number) => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      const response = await fetch(`/api/admin/support/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Request deleted successfully');
        fetchRequests();
      } else {
        toast.error('Failed to delete request');
      }
    } catch (error) {
      console.error('Delete request error:', error);
      toast.error('Failed to delete request');
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Support Requests</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            All ({requests.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'pending' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Pending ({requests.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'resolved' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Resolved ({requests.filter(r => r.status === 'resolved').length})
          </button>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="text-center py-12 text-gray-900">
          No {filter !== 'all' ? filter : ''} support requests
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div key={request.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{request.userName}</span>
                    <span className="text-sm text-gray-900">{request.userEmail}</span>
                  </div>
                  <span className="text-sm text-gray-900">
                    {new Date(request.createdAt).toLocaleString()}
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  request.status === 'pending' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {request.status}
                </span>
              </div>
              <p className="text-gray-700 mb-3 whitespace-pre-wrap">{request.message}</p>
              <div className="flex gap-2">
                {request.status === 'pending' && (
                  <button
                    onClick={() => updateStatus(request.id, 'resolved')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Mark as Resolved
                  </button>
                )}
                {request.status === 'resolved' && (
                  <button
                    onClick={() => updateStatus(request.id, 'pending')}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Mark as Pending
                  </button>
                )}
                <button
                  onClick={() => deleteRequest(request.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Users Manager
function UsersManager() {
  const toast = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlockUser = async (userId: number, currentStatus: boolean) => {
    const action = currentStatus ? 'unban' : 'ban';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      const bannedUntil = action === 'ban' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null;
      
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          action,
          bannedUntil 
        }),
      });

      if (response.ok) {
        toast.success(`User ${action}ned successfully`);
        fetchUsers();
      } else {
        toast.error(`Failed to ${action} user`);
      }
    } catch (error) {
      console.error(`${action} user error:`, error);
      toast.error(`Failed to ${action} user`);
    }
  };

  const toggleAdminStatus = async (userId: number, currentStatus: boolean) => {
    const action = currentStatus ? 'remove admin from' : 'make admin';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      const response = await fetch('/api/admin/make-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          isAdmin: !currentStatus 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update admin status');
      }
    } catch (error) {
      console.error('Toggle admin error:', error);
      toast.error('Failed to update admin status');
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        toast.error('Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error('Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <p className="text-gray-600">Total Users: {users.length}</p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-gray-900">
          No users found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isAdmin 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.isAdmin ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      user.isBanned 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {user.isBanned ? 'Banned' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleAdminStatus(user.id, user.isAdmin)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.isAdmin
                            ? 'text-orange-600 hover:bg-orange-50'
                            : 'text-purple-600 hover:bg-purple-50'
                        }`}
                        title={user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                      >
                        <Shield className="h-4 w-4" />
                      </button>
                      {!user.isAdmin && (
                        <>
                          <button
                            onClick={() => toggleBlockUser(user.id, user.isBanned)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.isBanned
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-yellow-600 hover:bg-yellow-50'
                            }`}
                            title={user.isBanned ? 'Unban' : 'Ban'}
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
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




function VPNDetectionManager() {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [serviceStats, setServiceStats] = useState<any>({});
  const [countryStats, setCountryStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showOnlyBlocked, setShowOnlyBlocked] = useState(false);

  useEffect(() => {
    fetchVPNLogs();
  }, [showOnlyBlocked]);

  const fetchVPNLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/vpn-logs?onlyBlocked=${showOnlyBlocked}&limit=100`);
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs || []);
        setStats(data.stats || {});
        setServiceStats(data.serviceStats || {});
        setCountryStats(data.countryStats || {});
      }
    } catch (error) {
      console.error('Fetch VPN logs error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getConnectionBadge = (log: any) => {
    if (log.isTor) return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">Tor</span>;
    if (log.isVPN) return <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded">VPN</span>;
    if (log.isProxy) return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">Proxy</span>;
    if (log.isHosting) return <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">Hosting</span>;
    return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">Direct</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">VPN Detection Logs</h2>
          <p className="text-sm text-gray-600 mt-1">Monitor and track VPN/Proxy connection attempts</p>
        </div>
        <button
          onClick={fetchVPNLogs}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <div className="text-sm opacity-90">Total Attempts</div>
            <div className="text-3xl font-bold mt-1">{stats.total}</div>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white">
            <div className="text-sm opacity-90">Blocked</div>
            <div className="text-3xl font-bold mt-1">{stats.blocked}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
            <div className="text-sm opacity-90">VPN</div>
            <div className="text-3xl font-bold mt-1">{stats.vpn}</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
            <div className="text-sm opacity-90">Proxy</div>
            <div className="text-3xl font-bold mt-1">{stats.proxy}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
            <div className="text-sm opacity-90">Tor</div>
            <div className="text-3xl font-bold mt-1">{stats.tor}</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg p-4 text-white">
            <div className="text-sm opacity-90">Hosting</div>
            <div className="text-3xl font-bold mt-1">{stats.hosting}</div>
          </div>
        </div>
      )}

      {/* Top VPN Services */}
      {Object.keys(serviceStats).length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Top VPN Services Detected</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(serviceStats)
              .sort(([, a]: any, [, b]: any) => b - a)
              .slice(0, 8)
              .map(([service, count]: any) => (
                <div key={service} className="bg-white rounded p-3 border border-gray-200">
                  <div className="text-sm font-medium text-gray-900">{service}</div>
                  <div className="text-2xl font-bold text-purple-600">{count}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyBlocked}
            onChange={(e) => setShowOnlyBlocked(e.target.checked)}
            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
          />
          <span className="text-sm text-gray-700">Show only blocked attempts</span>
        </label>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Date/Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  VPN Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-900">
                    No VPN detection logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className={log.wasBlocked ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {log.ip}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getConnectionBadge(log)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.service || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.city && log.country ? `${log.city}, ${log.country}` : log.country || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {log.org || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.wasBlocked ? (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded flex items-center gap-1 w-fit">
                          <Ban className="w-3 h-3" />
                          Blocked
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded flex items-center gap-1 w-fit">
                          <Check className="w-3 h-3" />
                          Allowed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// Groups Manager Component
function GroupsManager() {
  const toast = useToast();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    description: '',
    color: '#8B5CF6',
    icon: 'users',
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/groups');
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Fetch groups error:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = formData.id ? `/api/groups/${formData.id}` : '/api/groups';
      const method = formData.id ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save group');
      }

      toast.success(formData.id ? 'Group updated successfully' : 'Group created successfully');
      setShowForm(false);
      resetForm();
      fetchGroups();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (group: any) => {
    setFormData({
      id: group.id,
      name: group.name,
      description: group.description || '',
      color: group.color || '#8B5CF6',
      icon: group.icon || 'users',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this group?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/groups/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete group');
      }

      toast.success('Group deleted successfully');
      fetchGroups();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      name: '',
      description: '',
      color: '#8B5CF6',
      icon: 'users',
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Groups Management</h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Group
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {formData.id ? 'Edit Group' : 'Create New Group'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-20 h-10 border rounded-lg"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Group'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {loading && !showForm ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
              style={{ borderLeftColor: group.color, borderLeftWidth: '4px' }}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg text-gray-900">{group.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(group)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-3">{group.description}</p>
              <div className="flex justify-between text-sm text-gray-900">
                <span>{group.membersCount || 0} members</span>
                <span>{group.messagesCount || 0} messages</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && groups.length === 0 && !showForm && (
        <div className="text-center py-12 text-gray-900">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p>No groups found. Create your first group!</p>
        </div>
      )}
    </div>
  );
}

// Reports Manager Component
function ReportsManager() {
  const toast = useToast();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports');
      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error('Fetch reports error:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: number, status: string, adminNotes?: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update report');
      }

      toast.success('Report updated successfully');
      fetchReports();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: number, reason: string) => {
    if (!confirm('Are you sure you want to ban this user?')) return;

    const duration = prompt('Enter ban duration in days (leave empty for permanent):');
    
    setLoading(true);
    try {
      const response = await fetch('/api/admin/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ban: true,
          reason,
          duration: duration ? parseInt(duration) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to ban user');
      }

      toast.success('User banned successfully');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter((report) => {
    if (filter === 'all') return true;
    return report.status === filter;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      reviewed: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Reports Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'pending' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('reviewed')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'reviewed' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Reviewed
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'resolved' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Resolved
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div key={report.id} className="border rounded-lg p-6 bg-white shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(report.status)}`}>
                    {report.status}
                  </span>
                  <p className="text-sm text-gray-900 mt-2">
                    Reported: {new Date(report.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Reporter:</p>
                  <p className="text-gray-900">{report.reporter?.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-900">{report.reporter?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Reported User:</p>
                  <p className="text-gray-900">{report.reportedUser?.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-900">{report.reportedUser?.email}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">Reason:</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded">{report.reason}</p>
              </div>

              {report.adminNotes && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Admin Notes:</p>
                  <p className="text-gray-900 bg-blue-50 p-3 rounded">{report.adminNotes}</p>
                </div>
              )}

              <div className="flex gap-2">
                {report.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        const notes = prompt('Add admin notes (optional):');
                        handleUpdateStatus(report.id, 'reviewed', notes || undefined);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Mark as Reviewed
                    </button>
                    <button
                      onClick={() => handleBanUser(report.reportedUserId, report.reason)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                    >
                      <Ban className="w-4 h-4" />
                      Ban User
                    </button>
                  </>
                )}
                {report.status === 'reviewed' && (
                  <button
                    onClick={() => {
                      const notes = prompt('Add resolution notes:');
                      handleUpdateStatus(report.id, 'resolved', notes || undefined);
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Mark as Resolved
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredReports.length === 0 && (
        <div className="text-center py-12 text-gray-900">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p>No reports found.</p>
        </div>
      )}
    </div>
  );
}
