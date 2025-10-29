'use client';

import { useState, useEffect } from 'react';
import { 
  BookOpen, Heart, Users, MessageCircle, Calendar, Shield,
  Plus, Edit, Trash2, Check, X, Loader2, Ban, UserX, Upload, Image as ImageIcon, Video
} from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('lessons');
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'lessons', label: 'Lessons', icon: BookOpen },
    { id: 'verses', label: 'Daily Verses', icon: Calendar },
    { id: 'statistics', label: 'Statistics', icon: Users },
    { id: 'testimonies', label: 'Testimonies', icon: Heart },
    { id: 'support', label: 'Support Requests', icon: MessageCircle },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'vpn', label: 'VPN Logs', icon: Shield },
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
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
          {activeTab === 'statistics' && <StatisticsManager />}
          {activeTab === 'testimonies' && <TestimoniesManager />}
          {activeTab === 'support' && <SupportManager />}
          {activeTab === 'users' && <UsersManager />}
          {activeTab === 'vpn' && <VPNLogsManager />}
        </div>
      </div>
    </div>
  );
}

function LessonsManager() {
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
        alert(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
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
        setFormData({ id: null, title: '', content: '', imageUrl: '', videoUrl: '' });
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
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
                  setFormData({ id: null, title: '', content: '', imageUrl: '', videoUrl: '' });
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
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    verse: '',
    reference: '',
    imageUrl: '',
    displayDate: new Date().toISOString().split('T')[0],
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
        alert(error.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
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
          displayDate: new Date().toISOString().split('T')[0] 
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Date
              </label>
              <input
                type="date"
                value={formData.displayDate}
                onChange={(e) => setFormData({ ...formData, displayDate: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
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
                    displayDate: new Date().toISOString().split('T')[0] 
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
                  <p className="text-lg italic">&quot;{verse.verse}&quot;</p>
                  <p className="text-sm text-gray-600 mt-2">- {verse.reference}</p>
                  <p className="text-xs text-gray-500 mt-1">
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
                        ...verse,
                        displayDate: new Date(verse.displayDate).toISOString().split('T')[0]
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
                    <span className="text-sm text-gray-500">{count} users</span>
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

// Placeholder components (keeping existing functionality)
function TestimoniesManager() {
  return <div className="text-center py-12 text-gray-500">Testimonies management coming soon...</div>;
}

function SupportManager() {
  return <div className="text-center py-12 text-gray-500">Support requests management coming soon...</div>;
}

function UsersManager() {
  return <div className="text-center py-12 text-gray-500">User management coming soon...</div>;
}

function VPNLogsManager() {
  return <div className="text-center py-12 text-gray-500">VPN logs coming soon...</div>;
}

