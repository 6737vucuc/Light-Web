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
  HelpCircle,
  Star,
  ArrowUpRight
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
      gradient: 'from-blue-600 to-indigo-500',
      shadow: 'shadow-blue-100',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      value: 'testimony',
      label: t('shareTestimony'),
      icon: BookHeart,
      description: t('shareTestimonyDesc'),
      gradient: 'from-purple-600 to-fuchsia-500',
      shadow: 'shadow-purple-100',
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      value: 'prayer',
      label: t('prayerRequest'),
      icon: Heart,
      description: t('prayerRequestDesc'),
      gradient: 'from-rose-500 to-pink-400',
      shadow: 'shadow-rose-100',
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
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
    <div className="min-h-screen bg-[#fafbff] pb-32 overflow-hidden relative">
      {/* Premium Background Effects */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-purple-50/50 to-transparent pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-200/20 rounded-full blur-[160px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-200/20 rounded-full blur-[160px] animate-pulse pointer-events-none" />

      {/* Header Section */}
      <div className="relative pt-28 pb-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/80 backdrop-blur-md shadow-xl shadow-purple-100/40 border border-purple-100/50 text-purple-600 text-xs font-black uppercase tracking-[0.3em] mb-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <Star className="h-4 w-4 fill-purple-600 animate-spin-slow" />
            {tCommon('support') || 'Premium Support'}
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black text-gray-900 mb-10 tracking-tight leading-[1.05] animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-100">
            Let's <span className="relative inline-block">
              <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600">Connect</span>
              <span className="absolute bottom-4 left-0 w-full h-4 bg-purple-100/60 -z-10 -rotate-1" />
            </span> <br className="hidden md:block" /> with Heart.
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            {t('subtitle') || 'Your voice matters to us. Reach out for technical help, share your journey, or request a prayer.'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Bento-style Support Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {supportTypes.map((type, index) => {
            const Icon = type.icon;
            const isActive = formData.type === type.value;
            
            return (
              <div
                key={type.value}
                onClick={() => setFormData({ ...formData, type: type.value })}
                className={`group relative p-[1px] rounded-[3rem] transition-all duration-700 cursor-pointer animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-${(index + 4) * 100} ${
                  isActive 
                    ? `bg-gradient-to-br ${type.gradient} shadow-2xl ${type.shadow} scale-[1.03]` 
                    : 'bg-white/40 hover:bg-white shadow-sm hover:shadow-2xl hover:shadow-gray-200/40'
                }`}
              >
                <div className="bg-white rounded-[2.9rem] p-10 h-full flex flex-col relative overflow-hidden">
                  {/* Micro-interaction: Hover Arrow */}
                  <div className={`absolute top-8 right-8 transition-all duration-500 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0'}`}>
                    <ArrowUpRight className={`h-6 w-6 ${isActive ? 'text-purple-600' : 'text-gray-300'}`} />
                  </div>

                  <div className={`h-20 w-20 rounded-[1.8rem] flex items-center justify-center mb-10 transition-all duration-700 ${
                    isActive 
                      ? `bg-gradient-to-br ${type.gradient} text-white shadow-2xl shadow-purple-200 rotate-6` 
                      : `${type.iconBg} ${type.iconColor} group-hover:scale-110 group-hover:rotate-3`
                  }`}>
                    <Icon className="h-10 w-10" />
                  </div>
                  
                  <h3 className={`text-3xl font-black mb-5 transition-colors ${
                    isActive ? 'text-gray-900' : 'text-gray-800 group-hover:text-purple-600'
                  }`}>
                    {type.label}
                  </h3>
                  
                  <p className="text-lg text-gray-500 font-medium leading-relaxed flex-1">
                    {type.description}
                  </p>
                  
                  <div className={`mt-10 flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] transition-all ${
                    isActive ? 'text-purple-600' : 'text-gray-300 group-hover:text-purple-400'
                  }`}>
                    {isActive ? 'Active Choice' : 'Explore Option'}
                    <div className={`h-[2px] rounded-full transition-all duration-700 ${isActive ? 'bg-purple-600 w-16' : 'bg-gray-100 w-8 group-hover:bg-purple-200 group-hover:w-12'}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Form Section - Floating Glass Design */}
        <div className="relative max-w-6xl mx-auto">
          {/* Floating Decorative Elements */}
          <div className="absolute -top-12 -left-12 h-24 w-24 bg-purple-600 rounded-3xl rotate-12 opacity-10 animate-float" />
          <div className="absolute -bottom-12 -right-12 h-32 w-32 bg-blue-600 rounded-full opacity-10 animate-float-delayed" />
          
          <div className="relative bg-white/90 backdrop-blur-3xl rounded-[4rem] shadow-[0_32px_120px_-20px_rgba(0,0,0,0.08)] border border-white overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              
              {/* Form Info Sidebar - Deep & Elegant */}
              <div className="lg:col-span-5 bg-[#0a0a0c] p-16 text-white flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-600/30 via-transparent to-blue-600/20 opacity-40" />
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-600/20 rounded-full blur-[80px]" />
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="mb-16">
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm mb-10">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Online & Ready</span>
                    </div>
                    <h2 className="text-5xl font-black mb-8 leading-[1.1]">We're listening <br /> to your <span className="text-purple-400">heart.</span></h2>
                    <p className="text-xl text-gray-400 font-medium leading-relaxed">
                      Every message is a bridge. We promise to cross it with care, respect, and speed.
                    </p>
                  </div>
                  
                  <div className="space-y-10 flex-1">
                    {[
                      { icon: ShieldCheck, title: 'Privacy First', desc: 'Your data is 100% secure', color: 'text-purple-400' },
                      { icon: Zap, title: 'Instant Alert', desc: 'Our team is notified immediately', color: 'text-blue-400' },
                      { icon: MessageSquare, title: 'Direct Line', desc: 'No bots, just real people', color: 'text-indigo-400' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-6 group/item">
                        <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 group-hover/item:bg-white/10 transition-all duration-500 group-hover/item:scale-110">
                          <item.icon className={`h-7 w-7 ${item.color}`} />
                        </div>
                        <div>
                          <div className="text-lg font-black">{item.title}</div>
                          <div className="text-sm text-gray-500 font-medium">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-16 pt-10 border-t border-white/5 flex items-center justify-between">
                    <div className="text-sm font-bold text-gray-500">Light of Life Ministry</div>
                    <div className="flex gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                      <div className="h-1.5 w-1.5 rounded-full bg-purple-500/40" />
                      <div className="h-1.5 w-1.5 rounded-full bg-purple-500/20" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Content - Clean & Spacious */}
              <div className="lg:col-span-7 p-12 md:p-20 bg-white">
                {success && (
                  <div className="mb-12 bg-green-50/50 border border-green-100 p-10 rounded-[3rem] flex items-center gap-8 animate-in zoom-in duration-700">
                    <div className="h-20 w-20 rounded-3xl bg-green-500 text-white flex items-center justify-center shrink-0 shadow-2xl shadow-green-200 animate-bounce-short">
                      <CheckCircle className="h-10 w-10" />
                    </div>
                    <div>
                      <h3 className="font-black text-3xl text-green-900 mb-2">Sent with Love!</h3>
                      <p className="text-lg text-green-700 font-medium opacity-80">{tCommon('success') || 'We have received your message and will respond shortly.'}</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-12 bg-red-50/50 border border-red-100 p-10 rounded-[3rem] flex items-center gap-8 animate-in zoom-in duration-700">
                    <div className="h-20 w-20 rounded-3xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-2xl shadow-red-200">
                      <AlertCircle className="h-10 w-10" />
                    </div>
                    <div>
                      <h3 className="font-black text-3xl text-red-900 mb-2">Something's wrong</h3>
                      <p className="text-lg text-red-700 font-medium opacity-80">{error}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-12">
                  <div className="grid grid-cols-1 gap-12">
                    {/* Type Selection */}
                    <div className="space-y-5">
                      <label htmlFor={typeId} className="text-xs font-black text-gray-400 uppercase tracking-[0.4em] ml-4">
                        {t('requestType')} *
                      </label>
                      <div className="relative group/select">
                        <select
                          id={typeId}
                          required
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="w-full px-10 py-6 bg-gray-50/50 border-2 border-transparent rounded-[2rem] focus:ring-0 focus:border-purple-500 focus:bg-white outline-none transition-all text-gray-900 font-black text-lg appearance-none cursor-pointer shadow-sm hover:bg-gray-100/50"
                        >
                          <option value="">{t('selectType')}</option>
                          {supportTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-focus-within/select:text-purple-500 transition-all duration-500 group-focus-within/select:rotate-180">
                          <ArrowRight className="h-6 w-6 rotate-90" />
                        </div>
                      </div>
                    </div>

                    {/* Subject Input */}
                    <div className="space-y-5">
                      <label htmlFor={subjectId} className="text-xs font-black text-gray-400 uppercase tracking-[0.4em] ml-4">
                        {t('subject')} {formData.type === 'technical' && '*'}
                      </label>
                      <input
                        id={subjectId}
                        type="text"
                        required={formData.type === 'technical'}
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-10 py-6 bg-gray-50/50 border-2 border-transparent rounded-[2rem] focus:ring-0 focus:border-purple-500 focus:bg-white outline-none transition-all text-gray-900 font-black text-lg placeholder:text-gray-300 shadow-sm hover:bg-gray-100/50"
                        placeholder={t('subjectPlaceholder') || 'Enter subject...'}
                      />
                    </div>

                    {/* Message Textarea */}
                    <div className="space-y-5">
                      <label htmlFor={messageId} className="text-xs font-black text-gray-400 uppercase tracking-[0.4em] ml-4">
                        {t('message')} *
                      </label>
                      <textarea
                        id={messageId}
                        required
                        rows={6}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-10 py-8 bg-gray-50/50 border-2 border-transparent rounded-[2.5rem] focus:ring-0 focus:border-purple-500 focus:bg-white outline-none transition-all text-gray-900 font-bold text-lg placeholder:text-gray-300 shadow-sm hover:bg-gray-100/50 resize-none"
                        placeholder={t('messagePlaceholder') || 'How can we help you? Describe your request in detail...'}
                      />
                    </div>
                  </div>

                  {/* Submit Button - The Masterpiece */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="relative w-full group overflow-hidden rounded-[2.5rem] p-[3px] transition-all duration-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 shadow-2xl shadow-purple-200"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 animate-gradient-x" />
                    <div className="relative bg-white py-7 px-12 rounded-[2.4rem] flex items-center justify-center gap-6 transition-all duration-700 group-hover:bg-transparent">
                      {loading ? (
                        <Loader2 className="animate-spin h-8 w-8 text-purple-600" />
                      ) : (
                        <>
                          <span className="text-2xl font-black tracking-widest uppercase text-gray-900 group-hover:text-white transition-colors duration-700">{t('submitRequest')}</span>
                          <div className="h-12 w-12 rounded-full bg-purple-600 text-white flex items-center justify-center group-hover:bg-white group-hover:text-purple-600 transition-all duration-700 shadow-lg">
                            <Send className="h-6 w-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-500" />
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

        {/* Premium Trust Section */}
        <div className="mt-32 text-center">
          <div className="inline-flex items-center gap-8 px-12 py-8 rounded-[3rem] bg-white shadow-xl shadow-gray-100/50 border border-gray-50 grayscale hover:grayscale-0 transition-all duration-1000 group">
            {[
              { icon: ShieldCheck, label: 'SSL Secure' },
              { icon: Heart, label: 'With Love' },
              { icon: Zap, label: 'Fast Support' },
              { icon: LifeBuoy, label: '24/7 Help' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <item.icon className="h-6 w-6 text-purple-600 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{item.label}</span>
                {i < 3 && <div className="h-4 w-[1px] bg-gray-100 ml-4" />}
              </div>
            ))}
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
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(12deg); }
          50% { transform: translateY(-20px) rotate(15deg); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-30px); }
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-short {
          animation: bounce-short 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
