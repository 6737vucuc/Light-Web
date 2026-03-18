'use client';

import { useState, useId } from 'react';
import { 
  Heart, 
  Wrench, 
  BookHeart, 
  Loader2, 
  CheckCircle, 
  Send, 
  AlertCircle,
  ArrowRight,
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
      color: 'text-blue-500',
      bg: 'bg-blue-50/50',
    },
    {
      value: 'testimony',
      label: t('shareTestimony'),
      icon: BookHeart,
      description: t('shareTestimonyDesc'),
      color: 'text-purple-500',
      bg: 'bg-purple-50/50',
    },
    {
      value: 'prayer',
      label: t('prayerRequest'),
      icon: Heart,
      description: t('prayerRequestDesc'),
      color: 'text-rose-500',
      bg: 'bg-rose-50/50',
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
    <div className="min-h-screen bg-white pb-32 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-purple-50/30 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-4xl mx-auto px-6 pt-24 relative z-10">
        {/* Header - Clean & Minimal */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles className="h-3 w-3" />
            {tCommon('support') || 'Support Center'}
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            How can we <span className="text-purple-600">help?</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            {t('subtitle') || 'We are here to listen and support you in every step of your journey.'}
          </p>
        </div>

        {/* Support Type Selection - Minimalist Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {supportTypes.map((type, index) => {
            const Icon = type.icon;
            const isActive = formData.type === type.value;
            
            return (
              <button
                key={type.value}
                onClick={() => setFormData({ ...formData, type: type.value })}
                className={`group p-8 rounded-[2rem] border transition-all duration-500 text-left flex flex-col h-full animate-in fade-in slide-in-from-bottom-10 duration-700 delay-${(index + 3) * 100} ${
                  isActive
                    ? 'border-purple-600 bg-white shadow-2xl shadow-purple-100/50 scale-[1.02]'
                    : 'border-gray-100 bg-gray-50/30 hover:bg-white hover:border-purple-200 hover:shadow-xl hover:shadow-gray-100'
                }`}
              >
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 ${
                  isActive ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : `${type.bg} ${type.color} group-hover:scale-110`
                }`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className={`text-lg font-black mb-2 transition-colors ${isActive ? 'text-gray-900' : 'text-gray-700 group-hover:text-purple-600'}`}>
                  {type.label}
                </h3>
                <p className="text-sm text-gray-400 font-medium leading-relaxed flex-1">
                  {type.description}
                </p>
                {isActive && (
                  <div className="mt-4 flex items-center text-[10px] font-black uppercase tracking-widest text-purple-600 animate-in fade-in slide-in-from-left-2 duration-300">
                    Selected <ArrowRight className="h-3 w-3 ml-1.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Form Section - Clean & Spacious */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-100/50 p-10 md:p-16 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
          {success && (
            <div className="mb-12 bg-green-50 border border-green-100 p-8 rounded-3xl flex items-center gap-6 animate-in zoom-in duration-500">
              <div className="h-14 w-14 rounded-2xl bg-green-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-green-200">
                <CheckCircle className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-black text-xl text-green-900 mb-0.5">Message Sent</h3>
                <p className="text-sm text-green-700 font-medium opacity-80">{tCommon('success') || 'We will get back to you shortly.'}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-12 bg-red-50 border border-red-100 p-8 rounded-3xl flex items-center gap-6 animate-in zoom-in duration-500">
              <div className="h-14 w-14 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-200">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-black text-xl text-red-900 mb-0.5">Error</h3>
                <p className="text-sm text-red-700 font-medium opacity-80">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="grid grid-cols-1 gap-10">
              {/* Request Type Select */}
              <div className="space-y-3">
                <label htmlFor={typeId} className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2">
                  {t('requestType')} *
                </label>
                <div className="relative">
                  <select
                    id={typeId}
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-8 py-5 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 focus:bg-white outline-none transition-all text-gray-900 font-bold appearance-none cursor-pointer"
                  >
                    <option value="">{t('selectType')}</option>
                    {supportTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                    <ArrowRight className="h-4 w-4 rotate-90" />
                  </div>
                </div>
              </div>

              {/* Subject Input */}
              <div className="space-y-3">
                <label htmlFor={subjectId} className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2">
                  {t('subject')} {formData.type === 'technical' && '*'}
                </label>
                <input
                  id={subjectId}
                  type="text"
                  required={formData.type === 'technical'}
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-8 py-5 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 focus:bg-white outline-none transition-all text-gray-900 font-bold placeholder:text-gray-300"
                  placeholder={t('subjectPlaceholder') || 'What is this regarding?'}
                />
              </div>

              {/* Message Textarea */}
              <div className="space-y-3">
                <label htmlFor={messageId} className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2">
                  {t('message')} *
                </label>
                <textarea
                  id={messageId}
                  required
                  rows={5}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-8 py-6 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-purple-500/5 focus:border-purple-500 focus:bg-white outline-none transition-all text-gray-900 font-bold placeholder:text-gray-300 resize-none"
                  placeholder={t('messagePlaceholder') || 'Tell us more about your request...'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full group relative flex justify-center items-center py-6 px-10 bg-gray-900 text-white font-black rounded-2xl hover:bg-purple-600 transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-xl shadow-gray-200 hover:shadow-purple-200"
            >
              <div className="relative flex items-center gap-3">
                {loading ? (
                  <Loader2 className="animate-spin h-6 w-6" />
                ) : (
                  <>
                    <span className="text-lg tracking-wider uppercase">{t('submitRequest')}</span>
                    <Send className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </form>
        </div>


      </div>
    </div>
  );
}
