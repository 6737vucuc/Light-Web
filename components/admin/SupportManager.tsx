'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Loader2, Mail, Clock, User, AlertCircle, CheckCircle, Heart, Wrench } from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';

// Version 1.0.5 - Forced Update
interface SupportTicket {
  id: number;
  userId: number;
  subject: string;
  message: string;
  type: string;
  category?: string;
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
  const [processing, setProcessing] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'technical' | 'testimony' | 'prayer'>('all');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      // Add timestamp to bypass cache
      const response = await fetch(`/api/admin/support?t=${Date.now()}`);
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

  const handleApprove = async (ticketId: number) => {
    setProcessing(ticketId);
    try {
      const response = await fetch(`/api/admin/support/${ticketId}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.show('Testimony approved and published!', 'success');
        fetchTickets();
      } else {
        toast.show('Failed to approve testimony', 'error');
      }
    } catch (error) {
      toast.show('Error approving testimony', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (ticketId: number) => {
    setProcessing(ticketId);
    try {
      const response = await fetch(`/api/admin/support/${ticketId}/reject`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.show('Testimony rejected', 'success');
        fetchTickets();
      } else {
        toast.show('Failed to reject testimony', 'error');
      }
    } catch (error) {
      toast.show('Error rejecting testimony', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const formatDateTime = (dateString: any) => {
    try {
      if (!dateString) return { date: 'No Date', time: '', full: 'No Date' };
      
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        return { date: 'Invalid Date', time: '', full: 'Invalid Date' };
      }

      const dateOptions: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      };
      const timeOptions: Intl.DateTimeFormatOptions = { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      };

      return {
        date: date.toLocaleDateString('en-US', dateOptions),
        time: date.toLocaleTimeString('en-US', timeOptions),
        full: `${date.toLocaleDateString('en-US', dateOptions)} at ${date.toLocaleTimeString('en-US', timeOptions)}`
      };
    } catch (e) {
      return { date: 'Error', time: '', full: 'Error' };
    }
  };

  const getTypeIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'technical') return <Wrench className="w-5 h-5" />;
    if (t === 'testimony') return <Heart className="w-5 h-5" />;
    if (t === 'prayer') return <AlertCircle className="w-5 h-5" />;
    return <MessageCircle className="w-5 h-5" />;
  };

  const getTypeColor = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'technical') return 'bg-red-50 text-red-600 border-red-200';
    if (t === 'testimony') return 'bg-green-50 text-green-600 border-green-200';
    if (t === 'prayer') return 'bg-blue-50 text-blue-600 border-blue-200';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'in-progress': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Helper to determine actual type for filtering and display
  const getActualType = (ticket: SupportTicket) => {
    const type = (ticket.type || '').toLowerCase();
    const category = (ticket.category || '').toLowerCase();
    const subject = (ticket.subject || '').toLowerCase();
    const message = (ticket.message || '').toLowerCase();

    // Log for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Ticket Type Check:', { id: ticket.id, type, category, subject });
    }

    // Priority check for Testimony as requested
    // Added more variations to ensure it catches all possible values
    if (
      type === 'testimony' || 
      category === 'testimony' || 
      type === 'share testimony' ||
      category === 'share testimony' ||
      type.includes('testimony') || 
      category.includes('testimony') ||
      subject.includes('testimony') || 
      message.includes('testimony') || 
      subject.includes('شهادة') || 
      message.includes('شهادة') ||
      subject.includes('share testimony') ||
      message.includes('share testimony')
    ) {
      return 'testimony';
    }
    
    if (
      type === 'prayer' || 
      category === 'prayer' ||
      type.includes('prayer request') || 
      category.includes('prayer request') ||
      subject.includes('pray') || 
      message.includes('pray') || 
      subject.includes('صلاة') || 
      message.includes('صلاة')
    ) {
      return 'prayer';
    }
    
    return 'technical';
  };

  const filteredTickets = filter === 'all' 
    ? tickets 
    : tickets.filter(t => getActualType(t) === filter);

  return (
    <div className="space-y-6">
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
                  ? 'bg-purple-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

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
            const displayType = getActualType(ticket);

            return (
              <div
                key={ticket.id}
                className="bg-white border-2 border-gray-100 rounded-3xl p-6 hover:border-purple-200 transition-all hover:shadow-lg"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-2xl border-2 ${getTypeColor(displayType)}`}>
                      {getTypeIcon(displayType)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h4 className="font-black text-gray-900 truncate">{ticket.subject}</h4>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border-2 ${getTypeColor(displayType)}`}>
                          {displayType.charAt(0).toUpperCase() + displayType.slice(1)}
                        </span>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                          {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 font-medium mb-3 line-clamp-2">
                        {ticket.message}
                      </p>

                      <div className="flex flex-wrap gap-4 text-xs text-gray-500 font-medium">
                        <div className="flex items-center gap-1">
                          <User size={14} className="text-gray-400" />
                          <span className="font-bold">{ticket.user_name || 'Unknown User'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail size={14} className="text-gray-400" />
                          <span className="font-bold">{ticket.user_email || 'No Email'}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                          <Clock size={14} className="text-purple-500" />
                          <span className="font-bold text-gray-700" title={full}>
                            {date} • {time}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {displayType === 'testimony' ? (
                      <>
                        <button
                          onClick={() => handleTestimonyAction(ticket, 'approve')}
                          disabled={processing || ticket.status === 'resolved'}
                          className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all disabled:opacity-50"
                        >
                          {processing ? <Loader2 className="animate-spin w-4 h-4" /> : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleTestimonyAction(ticket, 'reject')}
                          disabled={processing || ticket.status === 'closed'}
                          className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50"
                        >
                          {processing ? <Loader2 className="animate-spin w-4 h-4" /> : 'Reject'}
                        </button>
                      </>
                              {/* Action Buttons */}
                  <div className="flex gap-2">
                    {displayType === 'testimony' ? (
                      <>
                        <button
                          onClick={() => handleApprove(ticket.id)}
                          disabled={processing === ticket.id}
                          className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {processing === ticket.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle size={18} />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(ticket.id)}
                          disabled={processing === ticket.id}
                          className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {processing === ticket.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle size={18} />}
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all whitespace-nowrap flex items-center gap-2"
                      >
                        <Mail size={18} />
                        Reply
                      </button>
                    )}
                  </div>
                </div>           <button
                        onClick={() => handleTestimonyAction(ticket, 'reject')}
                        disabled={processing || ticket.status === 'closed'}
                        className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50"
                      >
                        {processing ? <Loader2 className="animate-spin w-4 h-4" /> : 'Reject'}
                      </button>
                                   {/* Action Buttons */}
                  <div className="flex gap-2">
                    {displayType === 'testimony' ? (
                      <>
                        <button
                          onClick={() => handleTestimonyAction(ticket, 'approve')}
                          disabled={processing}
                          className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle size={18} />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleTestimonyAction(ticket, 'reject')}
                          disabled={processing}
                          className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle size={18} />}
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all whitespace-nowrap flex items-center gap-2"
                      >
                        <Mail size={18} />
                        Reply
                      </button>
                    )}
                  </div>
                </div>  )}
=======
                    )}
                  </div>
>>>>>>> 859a9666c7e14ad9dc78dccb8bd42e088f0d5754
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-2xl font-black text-gray-900 mb-6">Reply to Support Request</h3>

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
                <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border-2 ${getTypeColor(getActualType(selectedTicket))}`}>
                  {getActualType(selectedTicket).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Message</p>
                <p className="text-gray-700 font-medium whitespace-pre-wrap">{selectedTicket.message}</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-900 mb-3">Your Reply</label>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-purple-600 focus:ring-2 focus:ring-purple-200 text-gray-900 font-medium resize-none"
                placeholder="Type your reply here... This will be sent via email to the user."
              />
            </div>

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
                {replying ? <Loader2 className="animate-spin w-5 h-5" /> : <><Mail size={18} /> Send Reply</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
