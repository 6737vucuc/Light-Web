'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  MessageCircle, 
  Settings, 
  Shield, 
  BarChart3, 
  Search, 
  MoreVertical, 
  UserX, 
  ShieldAlert, 
  Mail, 
  Calendar, 
  ChevronRight, 
  Loader2, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
  Lock,
  Unlock,
  Heart,
  Wrench
} from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTranslations } from 'next-intl';

// --- Shared Components ---
function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-3xl font-black text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600 font-medium">{subtitle}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-gray-200">
      <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-xl font-black text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 font-medium">{description}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'support' | 'settings'>('stats');
  
  const tabs = [
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
    { id: 'support', label: 'Support Requests', icon: MessageCircle },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Sidebar/Nav */}
      <div className="bg-white border-b-2 border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600 p-2 rounded-xl">
                <Shield className="text-white w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Admin <span className="text-purple-600">Panel</span></h1>
            </div>
            
            <nav className="hidden md:flex gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                      activeTab === tab.id
                        ? 'bg-purple-50 text-purple-600'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {activeTab === 'stats' && <StatsOverview />}
        {activeTab === 'support' && <SupportManager />}
        {activeTab === 'users' && <UsersManager />}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-3xl p-10 border-2 border-gray-100 shadow-sm text-center">
            <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-gray-900 mb-2">System Settings</h2>
            <p className="text-gray-600 font-medium">Configure global application parameters.</p>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Statistics Overview ---
function StatsOverview() {
  const stats = [
    { label: 'Total Users', value: 1254, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Active Today', value: 432, icon: BarChart3, color: 'bg-green-50 text-green-600' },
    { label: 'Support Tickets', value: 18, icon: MessageCircle, color: 'bg-purple-50 text-purple-600' },
    { label: 'Banned Users', value: 7, icon: ShieldAlert, color: 'bg-red-50 text-red-600' },
  ];

  return (
    <div className="space-y-10">
      <SectionHeader title="Dashboard Overview" subtitle="Real-time insights into your application performance" />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className={`w-14 h-14 rounded-2xl ${s.color} flex items-center justify-center mb-6`}>
              <s.icon size={28} />
            </div>
            <p className="text-gray-500 font-bold mb-1 uppercase tracking-wider text-xs">{s.label}</p>
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
  const [processing, setProcessing] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'technical' | 'testimony' | 'prayer'>('all');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await fetch(`/api/admin/support?t=${Date.now()}`);
      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;
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

  const handleApprove = async (ticketId: number) => {
    setProcessing(ticketId);
    try {
      const response = await fetch(`/api/admin/support/${ticketId}/approve`, { method: 'POST' });
      if (response.ok) {
        toast.show('Testimony approved!', 'success');
        fetchTickets();
      } else {
        toast.show('Failed to approve', 'error');
      }
    } catch (error) {
      toast.show('Error approving', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (ticketId: number) => {
    setProcessing(ticketId);
    try {
      const response = await fetch(`/api/admin/support/${ticketId}/reject`, { method: 'POST' });
      if (response.ok) {
        toast.show('Testimony rejected', 'success');
        fetchTickets();
      } else {
        toast.show('Failed to reject', 'error');
      }
    } catch (error) {
      toast.show('Error rejecting', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return { date: 'Unknown Date', time: 'Unknown Time' };
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return { date: 'Invalid Date', time: 'Invalid Time' };
      return {
        date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      };
    } catch (error) { return { date: 'Error', time: 'Error' }; }
  };

  const getTicketType = (ticket: any) => {
    const s = (ticket.subject || '').toLowerCase();
    const m = (ticket.message || '').toLowerCase();
    const t = (ticket.type || '').toLowerCase();
    const c = (ticket.category || '').toLowerCase();
    
    if (s.includes('testimony') || m.includes('testimony') || t.includes('testimony') || c.includes('testimony') ||
        s.includes('شهادة') || m.includes('شهادة')) return 'testimony';
    if (s.includes('pray') || m.includes('pray') || s.includes('صلاة') || m.includes('صلاة')) return 'prayer';
    return 'technical';
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      technical: 'bg-red-50 text-red-600 border-red-200',
      testimony: 'bg-green-50 text-green-600 border-green-200',
      prayer: 'bg-blue-50 text-blue-600 border-blue-200',
    };
    return colors[type] || 'bg-gray-50 text-gray-600 border-gray-200';
  };

  const filteredTickets = tickets.filter(t => filter === 'all' || getTicketType(t) === filter);

  return (
    <div>
      <SectionHeader title="Support Requests" subtitle="Help users with their inquiries and issues" />
      
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'technical', 'testimony', 'prayer'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              filter === f ? 'bg-purple-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-12 h-12" /></div>
      ) : filteredTickets.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No tickets" description="Your support queue is currently empty." />
      ) : (
        <div className="space-y-4">
          {filteredTickets.map(ticket => {
            const type = getTicketType(ticket);
            const isT = type === 'testimony';
            const { date, time } = formatDateTime(ticket.createdAt);
            
            return (
              <div key={`ticket-${ticket.id}`} className="p-6 bg-white border-2 border-gray-100 rounded-3xl hover:border-purple-200 transition-all hover:shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-2xl border-2 ${getTypeColor(type)}`}>
                      {isT ? <Heart size={24}/> : type === 'prayer' ? <AlertCircle size={24}/> : <Wrench size={24}/>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="font-black text-gray-900">{ticket.subject}</h4>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border-2 ${getTypeColor(type)}`}>
                          {type.toUpperCase()}
                        </span>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${ticket.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {ticket.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 font-medium mb-2">{ticket.message}</p>
                      <p className="text-xs text-gray-500 font-bold flex items-center gap-2">
                        <User size={14}/> {ticket.user_name || ticket.userName} • <Clock size={14}/> {date} at {time}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {isT ? (
                      ticket.status === 'resolved' || ticket.approved ? (
                        <div className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-bold flex items-center gap-2"><CheckCircle size={18}/> APPROVED</div>
                      ) : (
                        <>
                          <button onClick={() => handleApprove(ticket.id)} disabled={processing === ticket.id} className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 flex items-center gap-2 transition-all">
                            {processing === ticket.id ? <Loader2 className="animate-spin w-4 h-4"/> : <CheckCircle size={18}/>} APPROVE
                          </button>
                          <button onClick={() => handleReject(ticket.id)} disabled={processing === ticket.id} className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 flex items-center gap-2 transition-all">
                            {processing === ticket.id ? <Loader2 className="animate-spin w-4 h-4"/> : <AlertCircle size={18}/>} REJECT
                          </button>
                        </>
                      )
                    ) : (
                      <button onClick={() => setSelectedTicket(ticket)} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2">
                        <Mail size={18}/> REPLY
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-gray-100">
            <h3 className="text-3xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-xl text-purple-600"><Mail size={24}/></div>
              Reply to Support
            </h3>
            <div className="mb-8 p-6 bg-gray-50 rounded-3xl border-2 border-gray-100">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Subject</p><p className="text-sm font-bold text-gray-900">{selectedTicket.subject}</p></div>
                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">From</p><p className="text-sm font-bold text-gray-900">{selectedTicket.user_name || selectedTicket.userName}</p></div>
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Message</p>
              <p className="text-sm text-gray-700 font-medium leading-relaxed">{selectedTicket.message}</p>
            </div>
            <div className="mb-8">
              <label className="block text-sm font-black text-gray-900 mb-3 uppercase tracking-widest">Your Message</label>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={6}
                className="w-full px-6 py-4 border-2 border-gray-100 rounded-3xl focus:border-purple-600 focus:ring-4 focus:ring-purple-50/50 text-gray-900 font-medium outline-none transition-all"
                placeholder="Type your reply here..."
              />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setSelectedTicket(null)} className="flex-1 px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl font-black hover:bg-gray-200 transition-all">CANCEL</button>
              <button onClick={handleReply} disabled={replying} className="flex-1 px-8 py-4 bg-purple-600 text-white rounded-2xl font-black hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all disabled:opacity-50">
                {replying ? <Loader2 className="animate-spin mx-auto w-6 h-6" /> : 'SEND REPLY'}
              </button>
            </div>
          </div>
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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <SectionHeader title="User Management" subtitle="Manage your community members and permissions" />
      
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-6 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-purple-600 outline-none transition-all font-medium"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-12 h-12" /></div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Try adjusting your search terms." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(user => (
            <div key={user.id} className="bg-white p-6 rounded-3xl border-2 border-gray-100 hover:border-purple-200 transition-all group">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden border-2 border-white shadow-sm">
                  {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-purple-50 text-purple-600 font-black text-xl">{user.name?.[0]}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-gray-900 truncate">{user.name}</h4>
                  <p className="text-sm text-gray-500 font-medium truncate">{user.email}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t-2 border-gray-50">
                <div className="flex gap-2">
                  {user.isAdmin && <span className="px-2 py-1 bg-purple-100 text-purple-600 text-[10px] font-black rounded-lg uppercase">Admin</span>}
                  {user.isBanned && <span className="px-2 py-1 bg-red-100 text-red-600 text-[10px] font-black rounded-lg uppercase">Banned</span>}
                </div>
                <button onClick={() => setSelectedUser(user)} className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-900">
                  <Settings size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
