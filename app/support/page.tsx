'use client';

import { useState, useId } from 'react';
import { Heart, Wrench, BookHeart, Loader2, CheckCircle } from 'lucide-react';
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
    },
    {
      value: 'testimony',
      label: t('shareTestimony'),
      icon: BookHeart,
      description: t('shareTestimonyDesc'),
    },
    {
      value: 'prayer',
      label: t('prayerRequest'),
      icon: Heart,
      description: t('prayerRequestDesc'),
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h1>
          <p className="text-xl text-gray-600">
            {t('subtitle')}
          </p>
        </div>

        {/* Support Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {supportTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setFormData({ ...formData, type: type.value })}
                className={`p-6 rounded-lg border-2 transition-all ${
                  formData.type === type.value
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <Icon className={`h-8 w-8 mx-auto mb-3 ${
                  formData.type === type.value ? 'text-purple-600' : 'text-gray-900'
                }`} />
                <h3 className="font-semibold text-gray-900 mb-1">{type.label}</h3>
                <p className="text-sm text-gray-600">{type.description}</p>
              </button>
            );
          })}
        </div>

        {/* Support Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
              <CheckCircle className="h-5 w-5 me-2" />
              {tCommon('success')}
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor={typeId} className="block text-sm font-medium text-gray-700 mb-2">
                {t('requestType')} *
              </label>
              <select
                id={typeId}
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              >
                <option value="">{t('selectType')}</option>
                {supportTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={subjectId} className="block text-sm font-medium text-gray-700 mb-2">
                {t('subject')} {formData.type === 'technical' && '*'}
              </label>
              <input
                id={subjectId}
                type="text"
                required={formData.type === 'technical'}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                placeholder={t('subjectPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor={messageId} className="block text-sm font-medium text-gray-700 mb-2">
                {t('message')} *
              </label>
              <textarea
                id={messageId}
                required
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                placeholder={t('messagePlaceholder')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 me-3 h-5 w-5 rtl:ml-3 rtl:-mr-1" />
                  {tCommon('loading')}
                </>
              ) : (
                t('submitRequest')
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
