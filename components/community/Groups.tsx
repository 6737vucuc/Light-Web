'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Lock, Globe, Search, UserPlus } from 'lucide-react';
import Image from 'next/image';

interface Group {
  id: number;
  name: string;
  description: string | null;
  coverPhoto: string | null;
  privacy: string;
  membersCount: number;
  createdAt: string;
  creator?: {
    id: number;
    name: string;
    avatar: string | null;
  };
  role?: string;
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'my'>('discover');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    privacy: 'public',
  });

  useEffect(() => {
    fetchGroups();
    fetchMyGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups?type=all');
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyGroups = async () => {
    try {
      const response = await fetch('/api/groups?type=my');
      if (response.ok) {
        const data = await response.json();
        setMyGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching my groups:', error);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name.trim()) return;

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewGroup({ name: '', description: '', privacy: 'public' });
        fetchGroups();
        fetchMyGroups();
      }
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const handleJoinGroup = async (groupId: number) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/join`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchGroups();
        fetchMyGroups();
      }
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="w-6 h-6 mr-2 text-purple-600" />
            Groups
          </h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Create Group
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'discover'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'my'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Groups ({myGroups.length})
          </button>
        </div>
      </div>

      {/* Search */}
      {activeTab === 'discover' && (
        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groups..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      )}

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(activeTab === 'discover' ? filteredGroups : myGroups).map((group) => (
          <div
            key={group.id}
            className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
          >
            {/* Cover Photo */}
            <div className="h-32 bg-gradient-to-r from-purple-400 to-blue-400 relative">
              {group.coverPhoto && (
                <Image
                  src={group.coverPhoto}
                  alt={group.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              )}
            </div>

            {/* Group Info */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg text-gray-900">{group.name}</h3>
                {group.privacy === 'private' ? (
                  <Lock className="w-4 h-4 text-gray-500" />
                ) : (
                  <Globe className="w-4 h-4 text-gray-500" />
                )}
              </div>

              {group.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {group.description}
                </p>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                <span className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {group.membersCount} members
                </span>
                <span className="capitalize">{group.privacy}</span>
              </div>

              {activeTab === 'discover' ? (
                <button
                  onClick={() => handleJoinGroup(group.id)}
                  className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Join Group
                </button>
              ) : (
                <button
                  className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  View Group
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-purple-600 to-blue-500 p-6 rounded-t-2xl">
              <h3 className="text-2xl font-bold text-white">Create New Group</h3>
            </div>

            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Privacy
                </label>
                <select
                  value={newGroup.privacy}
                  onChange={(e) => setNewGroup({ ...newGroup, privacy: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                >
                  <option value="public">Public - Anyone can join</option>
                  <option value="private">Private - Approval required</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:shadow-lg transition-all duration-200"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
