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
  Sparkles,
  ShieldCheck,
  Zap,
  HelpCircle
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
      gradient: 'from-blue-500 to-cyan-400',
      lightBg: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      value: 'testimony',
      label: t('shareTestimony'),
      icon: BookHeart,
      description: t('shareTestimonyDesc'),
      gradient: 'from-purple-600 to-pink-500',
      lightBg: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      value: 'prayer',
      label: t('prayerRequest'),
      icon: Heart,
      description: t('prayerRequestDesc'),
      gradient: 'from-rose-500 to-orange-400',
      lightBg: 'bg-rose-50',
      textColor: 'text-rose-600',
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
    <div className="min-h-screen bg-[#fdfdff] pb-24">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-[120px]" />
      </div>

      {/* Hero Section - Ultra Modern */}
      <div className="relative pt-24 pb-20 px-4 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white shadow-xl shadow-purple-100/50 border border-purple-50 text-purple-600 text-xs font-black uppercase tracking-[0.2em] mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <Sparkles className="h-4 w-4 animate-pulse" />
            {tCommon('support') || 'Support Center'}
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-8 tracking-tight leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            We're here to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">help you</span> shine.
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-10 duration-700 delay-200">
            {t('subtitle') || 'Have a question or need assistance? Our dedicated team is ready to support your journey.'}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Interactive Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {supportTypes.map((type, index) => {
            const Icon = type.icon;
            const isActive = formData.type === type.value;
            
            return (
              <div
                key={type.value}
                onClick={() => setFormData({ ...formData, type: type.value })}
                className={`group relative p-1 rounded-[2.5rem] transition-all duration-500 cursor-pointer animate-in fade-in slide-in-from-bottom-12 duration-700 delay-${(index + 3) * 100} ${
                  isActive 
                    ? `bg-gradient-to-br ${type.gradient} shadow-2xl shadow-purple-200 scale-[1.05]` 
                    : 'bg-white/50 hover:bg-white shadow-sm hover:shadow-2xl hover:shadow-gray-200/50'
                }`}
              >
                <div className="bg-white rounded-[2.4rem] p-8 h-full flex flex-col relative overflow-hidden">
                  {/* Decorative Background Icon */}
                  <Icon className={`absolute -right-4 -bottom-4 h-32 w-32 opacity-[0.03] transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-12 ${isActive ? 'opacity-[0.08]' : ''}`} />
                  
                  <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-8 transition-all duration-500 ${
                    isActive 
                      ? `bg-gradient-to-br ${type.gradient} text-white shadow-lg` 
                      : `${type.lightBg} ${type.textColor} group-hover:scale-110`
                  }`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  
                  <h3 className={`text-2xl font-black mb-4 transition-colors ${
                    isActive ? 'text-gray-900' : 'text-gray-800 group-hover:text-purple-600'
                  }`}>
                    {type.label}
                  </h3>
                  
                  <p className="text-base text-gray-500 font-medium leading-relaxed flex-1">
                    {type.description}
                  </p>
                  
                  <div className={`mt-8 flex items-center gap-2 text-sm font-black uppercase tracking-widest transition-all ${
                    isActive ? 'text-purple-600' : 'text-gray-300 group-hover:text-purple-400'
                  }`}>
                    {isActive ? 'Selected' : 'Choose Option'}
                    <div className={`h-1 w-8 rounded-full transition-all duration-500 ${isActive ? 'bg-purple-600 w-12' : 'bg-gray-100 group-hover:bg-purple-200'}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Form Section - Glassmorphism Style */}
        <div className="relative group">
          {/* Decorative Glow */}
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-[3.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="relative bg-white/80 backdrop-blur-2xl rounded-[3rem] shadow-2xl shadow-gray-200/50 border border-white overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              
              {/* Form Info Sidebar */}
              <div className="lg:col-span-4 bg-gray-900 p-12 text-white flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-600/20 to-transparent opacity-50" />
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="mb-12">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-8 shadow-xl shadow-purple-500/20">
                      <HelpCircle className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-black mb-6 leading-tight">Let's start a conversation.</h2>
                    <p className="text-gray-400 font-medium leading-relaxed">
                      Our support team is here to ensure your experience is seamless and meaningful.
                    </p>
                  </div>
                  
                  <div className="space-y-8 flex-1">
                    <div className="flex items-start gap-5 group/item">
                      <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover/item:bg-purple-500/20 transition-colors">
                        <ShieldCheck className="h-6 w-6 text-purple-400" />
                      </div>
                      <div>
                        <div className="font-black text-sm uppercase tracking-widest text-gray-500 mb-1">Secure</div>
                        <div className="text-base font-bold">Your data is encrypted</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-5 group/item">
                      <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover/item:bg-blue-500/20 transition-colors">
                        <Zap className="h-6 w-6 text-blue-400" />
                      </div>
                      <div>
                        <div className="font-black text-sm uppercase tracking-widest text-gray-500 mb-1">Fast</div>
                        <div className="text-base font-bold">Response within 24h</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-12 pt-8 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-widest text-gray-500">Support Active</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="lg:col-span-8 p-10 md:p-16 bg-white/50">
                {success && (
                  <div className="mb-10 bg-green-50 border border-green-100 p-8 rounded-[2rem] flex items-center gap-6 animate-in zoom-in duration-500">
                    <div className="h-16 w-16 rounded-2xl bg-green-500 text-white flex items-center justify-center shrink-0 shadow-xl shadow-green-200">
                      <CheckCircle className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="font-black text-2xl text-green-900 mb-1">Successfully Sent!</h3>
                      <p className="text-green-700 font-medium opacity-80">{tCommon('success') || 'We have received your message and will respond shortly.'}</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-10 bg-red-50 border border-red-100 p-8 rounded-[2rem] flex items-center gap-6 animate-in zoom-in duration-500">
                    <div className="h-16 w-16 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-xl shadow-red-200">
                      <AlertCircle className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="font-black text-2xl text-red-900 mb-1">Oops! Something went wrong</h3>
                      <p className="text-red-700 font-medium opacity-80">{error}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Type Selection */}
                    <div className="space-y-4">
                      <label htmlFor={typeId} className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-2">
                        {t('requestType')} *
                      </label>
                      <div className="relative group/select">
                        <select
                          id={typeId}
                          required
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-full px-8 py-5 bg-gray-50/50 border border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 focus:bg-white outline-none transition-all text-gray-900 font-bold appearance-none cursor-pointer shadow-sm"
                        >
                          <option value="">{t('selectType')}</option>
                          {supportTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-focus-within/select:text-purple-500 transition-colors">
                          <ArrowRight className="h-5 w-5 rotate-90" />
                        </div>
                      </div>
                    </div>

                    {/* Subject Input */}
                    <div className="space-y-4">
                      <label htmlFor={subjectId} className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-2">
                        {t('subject')} {formData.type === 'technical' && '*'}
                      </label>
                      <input
                        id={subjectId}
                        type="text"
                        required={formData.type === 'technical'}
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-8 py-5 bg-gray-50/50 border border-gray-100 rounded-[1.5rem] focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 focus:bg-white outline-none transition-all text-gray-900 font-bold placeholder:text-gray-300 shadow-sm"
                        placeholder={t('subjectPlaceholder') || 'Enter subject...'}
                      />
                    </div>
                  </div>

                  {/* Message Textarea */}
                  <div className="space-y-4">
                    <label htmlFor={messageId} className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-2">
                      {t('message')} *
                    </label>
                    <textarea
                      id={messageId}
                      required
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-8 py-6 bg-gray-50/50 border border-gray-100 rounded-[2rem] focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 focus:bg-white outline-none transition-all text-gray-900 font-bold placeholder:text-gray-300 shadow-sm resize-none"
                      placeholder={t('messagePlaceholder') || 'How can we help you? Describe your request in detail...'}
                    />
                  </div>

                  {/* Submit Button - Ultra Modern */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="relative w-full group overflow-hidden rounded-[1.8rem] p-[2px] transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 animate-gradient-x" />
                    <div className="relative bg-gray-900 text-white py-6 px-10 rounded-[1.7rem] flex items-center justify-center gap-4 transition-all duration-500 group-hover:bg-transparent">
                      {loading ? (
                        <Loader2 className="animate-spin h-7 w-7" />
                      ) : (
                        <>
                          <span className="text-xl font-black tracking-wider uppercase">{t('submitRequest')}</span>
                          <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-purple-600 transition-all duration-500">
                            <Send className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                          </div>
                        </>
                      )}
                    </div>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badges / Footer Info */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
          <div className="flex flex-col items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-purple-600" />
            <span className="text-xs font-black uppercase tracking-widest">Secure SSL</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Heart className="h-8 w-8 text-rose-500" />
            <span className="text-xs font-black uppercase tracking-widest">With Love</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Zap className="h-8 w-8 text-amber-500" />
            <span className="text-xs font-black uppercase tracking-widest">Fast Support</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <LifeBuoy className="h-8 w-8 text-blue-500" />
            <span className="text-xs font-black uppercase tracking-widest">24/7 Help</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
