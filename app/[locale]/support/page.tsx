'use client';

import { useState, useId } from 'react';
import { 
  Heart, 
  Wrench, 
  BookHeart, 
  Loader2, 
  CheckCircle, 
  MessageSquare, 
  Send, 
  AlertCircle,
  ArrowRight,
  LifeBuoy,
  Sparkles
} from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function SupportPage() {
  const t = useTranslations('support');
  const tCommon = useTranslations('common');
  const typeId = useId();
  const subjectId = useId();
  const messageId = useId();
  
  const [formData, setFormData] = useState({
    type: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const supportTypes = [
    {
      value: 'technical',
      label: t('technicalIssue'),
      icon: Wrench,
      description: t('technicalIssueDesc'),
      color: 'blue',
    },
    {
      value: 'testimony',
      label: t('shareTestimony'),
      icon: BookHeart,
      description: t('shareTestimonyDesc'),
      color: 'purple',
    },
    {
      value: 'prayer',
      label: t('prayerRequest'),
      icon: Heart,
      description: t('prayerRequestDesc'),
      color: 'rose',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setSuccess(true);
      setFormData({ type: '', subject: '', message: '' });
      
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-100 pt-20 pb-16 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 opacity-5">
          <LifeBuoy className="h-96 w-96 text-purple-600" />
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center px-4 py-2 rounded-2xl bg-purple-50 text-purple-600 text-sm font-black uppercase tracking-widest mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Sparkles className="h-4 w-4 mr-2" />
            {tCommon('support') || 'Support Center'}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight leading-tight">
            {t('title')}
          </h1>
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        {/* Support Type Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {supportTypes.map((type) => {
            const Icon = type.icon;
            const isActive = formData.type === type.value;
            
            return (
              <button
                key={type.value}
                onClick={() => setFormData({ ...formData, type: type.value })}
                className={`group p-8 rounded-[2rem] border-2 transition-all duration-500 text-left flex flex-col h-full relative overflow-hidden ${
                  isActive
                    ? 'border-purple-600 bg-white shadow-2xl shadow-purple-100 scale-[1.02]'
                    : 'border-transparent bg-white shadow-sm hover:shadow-xl hover:border-purple-100'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 right-0 p-4">
                    <CheckCircle className="h-6 w-6 text-purple-600 animate-in zoom-in duration-300" />
                  </div>
                )}
                
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-500 ${
                  isActive ? 'bg-purple-600 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-500'
                }`}>
                  <Icon className="h-7 w-7" />
                </div>
                
                <h3 className={`text-xl font-black mb-3 transition-colors ${
                  isActive ? 'text-gray-900' : 'text-gray-700 group-hover:text-purple-600'
                }`}>
                  {type.label}
                </h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed flex-1">
                  {type.description}
                </p>
                
                <div className={`mt-6 flex items-center text-xs font-black uppercase tracking-widest transition-all ${
                  isActive ? 'text-purple-600 translate-x-2' : 'text-gray-300 group-hover:text-purple-400 group-hover:translate-x-2'
                }`}>
                  Select Option <ArrowRight className="h-3 w-3 ml-2" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Support Form Container */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 overflow-hidden border border-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-5">
            {/* Form Sidebar Info */}
            <div className="lg:col-span-2 bg-gradient-to-br from-purple-600 to-indigo-700 p-10 text-white flex flex-col justify-between relative overflow-hidden">
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 opacity-10">
                <MessageSquare className="h-64 w-64" />
              </div>
              
              <div className="relative z-10">
                <h2 className="text-3xl font-black mb-6 leading-tight">How can we help you today?</h2>
                <p className="text-purple-100 font-medium mb-8 leading-relaxed">
                  Our team is dedicated to supporting you. Whether it's a technical issue, a testimony, or a prayer request, we're here to listen.
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                      <CheckCircle className="h-5 w-5 text-purple-200" />
                    </div>
                    <span className="text-sm font-bold">Fast Response Time</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                      <Heart className="h-5 w-5 text-purple-200" />
                    </div>
                    <span className="text-sm font-bold">Compassionate Support</span>
                  </div>
                </div>
              </div>
              
              <div className="relative z-10 mt-12 pt-8 border-t border-white/10">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-purple-200 mb-2">Community</div>
                <div className="text-lg font-bold">Light of Life Ministry</div>
              </div>
            </div>

            {/* Actual Form */}
            <div className="lg:col-span-3 p-10 md:p-12">
              {success && (
                <div className="mb-8 bg-green-50 border border-green-100 text-green-700 p-6 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-500">
                  <div className="h-12 w-12 rounded-2xl bg-green-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-green-200">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-black text-lg">Message Sent!</div>
                    <div className="text-sm font-medium opacity-80">{tCommon('success') || 'We have received your request and will get back to you soon.'}</div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-8 bg-red-50 border border-red-100 text-red-700 p-6 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-500">
                  <div className="h-12 w-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-200">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-black text-lg">Submission Error</div>
                    <div className="text-sm font-medium opacity-80">{error}</div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 gap-8">
                  {/* Request Type Select */}
                  <div className="space-y-3">
                    <label htmlFor={typeId} className="text-sm font-black text-gray-400 uppercase tracking-widest ml-1">
                      {t('requestType')} *
                    </label>
                    <div className="relative">
                      <select
                        id={typeId}
                        required
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all text-gray-900 font-bold appearance-none cursor-pointer"
                      >
                        <option value="">{t('selectType')}</option>
                        {supportTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <ArrowRight className="h-5 w-5 rotate-90" />
                      </div>
                    </div>
                  </div>

                  {/* Subject Input */}
                  <div className="space-y-3">
                    <label htmlFor={subjectId} className="text-sm font-black text-gray-400 uppercase tracking-widest ml-1">
                      {t('subject')} {formData.type === 'technical' && '*'}
                    </label>
                    <input
                      id={subjectId}
                      type="text"
                      required={formData.type === 'technical'}
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all text-gray-900 font-bold placeholder:text-gray-300"
                      placeholder={t('subjectPlaceholder') || 'What is this regarding?'}
                    />
                  </div>

                  {/* Message Textarea */}
                  <div className="space-y-3">
                    <label htmlFor={messageId} className="text-sm font-black text-gray-400 uppercase tracking-widest ml-1">
                      {t('message')} *
                    </label>
                    <textarea
                      id={messageId}
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all text-gray-900 font-bold placeholder:text-gray-300 resize-none"
                      placeholder={t('messagePlaceholder') || 'Tell us more about your request...'}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full group relative flex justify-center items-center py-5 px-8 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black rounded-2xl hover:shadow-2xl hover:shadow-purple-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  <div className="relative flex items-center gap-3">
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin h-6 w-6" />
                        <span>{tCommon('loading')}</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        <span className="text-lg">{t('submitRequest')}</span>
                      </>
                    )}
                  </div>
                </button>
              </form>
            </div>
          </div>
        </div>
        
        {/* Bottom Help Text */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 font-medium">
            Need immediate help? Check our <span className="text-purple-600 font-bold cursor-pointer hover:underline">FAQ</span> or join the <span className="text-purple-600 font-bold cursor-pointer hover:underline">Community Chat</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
