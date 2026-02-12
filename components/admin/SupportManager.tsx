'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Loader2, Mail, Clock, User, AlertCircle, CheckCircle, Heart, Wrench } from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';

interface SupportTicket {
  id: number;
  userId: number;
  subject: string;
  message: string;
  type: 'technical' | 'testimony' | 'prayer';
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  user_name: string;
  user_email: string;
  user_avatar?: string;
}

export default function SupportManager() {
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
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
    if (!dateString) return { date: 'Unknown Date', time: 'Unknown Time', full: 'Unknown' };
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return { date: 'Unknown Date', time: 'Unknown Time', full: 'Unknown' };
    }

    return {
      date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'technical':
        return <Wrench className="w-5 h-5" />;
      case 'testimony':
        return <Heart className="w-5 h-5" />;
      case 'prayer':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <MessageCircle className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'technical':
        return 'bg-red-50 text-red-600 border-red-200';
      case 'testimony':
        return 'bg-green-50 text-green-600 border-green-200';
      case 'prayer':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredTickets = filter === 'all' 
    ? tickets 
    : tickets.filter(t => {
        // Handle cases where type might be 'general' but we want to show it in its specific tab
        // or handle legacy data mapping
        if (filter === 'testimony' && (t.type === 'testimony' || t.type === 'general')) return true;
        if (filter === 'prayer' && (t.type === 'prayer' || t.type === 'general')) return true;
        return t.type === filter;
      });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">Support Tickets</h2>
          <p className="text-gray-600 font-medium">Help users with their inquiries and issues</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'technical', 'testimony', 'prayer'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-purple-600 w-12 h-12" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-gray-200">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-gray-900 mb-2">No tickets</h3>
          <p className="text-gray-600 font-medium">Your support queue is currently empty.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => {
            const { date, time, full } = formatDateTime(ticket.createdAt);
            return (
              <div
                key={ticket.id}
                className="bg-white border-2 border-gray-100 rounded-3xl p-6 hover:border-purple-200 transition-all hover:shadow-lg"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Type Icon */}
                    <div className={`p-3 rounded-2xl border-2 ${getTypeColor(ticket.type)}`}>
                      {getTypeIcon(ticket.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h4 className="font-black text-gray-900 truncate">{ticket.subject}</h4>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border-2 ${getTypeColor(ticket.type)}`}>
                          {ticket.type.charAt(0).toUpperCase() + ticket.type.slice(1)}
                        </span>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                          {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                        </span>
                      </div>

                      {/* Message Preview */}
                      <p className="text-sm text-gray-600 font-medium mb-3 line-clamp-2">
                        {ticket.message}
                      </p>

                      {/* Meta Info */}
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500 font-medium">
                        <div className="flex items-center gap-1">
                          <User size={14} />
                          <span className="font-bold">{ticket.user_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail size={14} />
                          <span className="font-bold">{ticket.user_email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span className="font-bold" title={full}>
                            {date} at {time}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => setSelectedTicket(ticket)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all whitespace-nowrap"
                  >
                    Reply
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 rounded-2xl">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-2xl font-black text-gray-900 mb-6">Reply to Support Request</h3>

            {/* Original Request */}
            <div className="mb-6 p-6 bg-gray-50 rounded-2xl border-2 border-gray-200 space-y-3">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Subject</p>
                <p className="text-gray-900 font-bold">{selectedTicket.subject}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">From</p>
                <p className="text-gray-900 font-bold">{selectedTicket.user_name} ({selectedTicket.user_email})</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Type</p>
                <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border-2 ${getTypeColor(selectedTicket.type)}`}>
                  {selectedTicket.type.charAt(0).toUpperCase() + selectedTicket.type.slice(1)}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Message</p>
                <p className="text-gray-700 font-medium whitespace-pre-wrap">{selectedTicket.message}</p>
              </div>
            </div>

            {/* Reply Textarea */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-900 mb-3">Your Reply</label>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-purple-600 focus:ring-2 focus:ring-purple-200 text-gray-900 font-medium resize-none"
                placeholder="Type your reply here... This will be sent via email to the user."
              />
              <p className="text-xs text-gray-500 font-medium mt-2">
                💡 Tip: Your reply will be sent directly to {selectedTicket.user_email}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setSelectedTicket(null);
                  setReplyMessage('');
                }}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReply}
                disabled={replying}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {replying ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    Send Reply
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
