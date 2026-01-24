'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const tp = useTranslations('profile');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    birthDate: '',
    religion: '',
    gender: '',
    country: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    return strength;
  };

  const handlePasswordChange = (password: string) => {
    setFormData({ ...formData, password });
    setPasswordStrength(calculatePasswordStrength(password));
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const validateStep = () => {
    setError('');
    
    if (step === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setError(t('pleaseEnterNames'));
        return false;
      }
      if (formData.firstName.trim().length < 2 || formData.lastName.trim().length < 2) {
        setError(t('namesMinLength'));
        return false;
      }
    }
    
    if (step === 2) {
      if (!formData.birthDate) {
        setError(t('pleaseEnterBirthDate'));
        return false;
      }
      const age = calculateAge(formData.birthDate);
      if (age < 18) {
        setError(t('mustBe18Error'));
        return false;
      }
      if (!formData.gender) {
        setError(t('pleaseSelectGender'));
        return false;
      }
      if (!formData.country) {
        setError(t('pleaseSelectCountry'));
        return false;
      }
    }
    
    if (step === 3) {
      if (!formData.email) {
        setError(t('pleaseEnterEmail'));
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError(t('invalidEmail'));
        return false;
      }
    }
    
    if (step === 4) {
      if (!formData.password) {
        setError(t('pleaseEnterPassword'));
        return false;
      }
      if (formData.password.length < 8) {
        setError(t('passwordMin8'));
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError(t('passwordsDoNotMatchError'));
        return false;
      }
    }
    
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          birthDate: formData.birthDate,
          password: formData.password,
          religion: formData.religion,
          gender: formData.gender,
          country: formData.country,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('registrationFailed'));
      }

      // Check if verification is required
      if (data.requiresVerification) {
        // Redirect to verification page
        router.push(`/${locale}/auth/verify?email=${encodeURIComponent(formData.email)}`);
      } else {
        // If no verification needed, redirect to home
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return t('weak');
    if (passwordStrength <= 3) return t('medium');
    return t('strong');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative w-16 h-16 rounded-full overflow-hidden">
            <Image
              src="/logo.png"
              alt="Light of Life"
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="bg-white border border-gray-300 rounded-lg p-10 shadow-sm">
            <h2 className="text-2xl font-normal text-gray-900 mb-2">
              {t('createYourAccount')}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {t('enterYourName')}
            </p>

            {error && (
              <div className="mb-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    autoFocus
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                    placeholder={t('firstName')}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                    placeholder={t('lastName')}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-purple-600 hover:text-purple-700"
                >
                  {t('signInInstead')}
                </Link>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-md hover:from-purple-700 hover:to-blue-600 font-medium"
                >
                  {tc('next')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Birth Date & Religion */}
        {step === 2 && (
          <div className="bg-white border border-gray-300 rounded-lg p-10 shadow-sm">
            <h2 className="text-2xl font-normal text-gray-900 mb-2">
              {t('basicInformation')}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {t('enterBirthdayReligion')}
            </p>

            {error && (
              <div className="mb-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  {t('birthday')}
                </label>
                <input
                  type="date"
                  autoFocus
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                />
                <p className="mt-2 text-xs text-gray-900">
                  {t('mustBe18')}
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  {tp('gender')}
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                >
                  <option value="">{t('selectGender')}</option>
                  <option value="Male">{tp('male')}</option>
                  <option value="Female">{tp('female')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  {tp('country')}
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                >
                  <option value="">{t('selectCountry')}</option>
                  <option value="Afghanistan">Afghanistan</option>
                  <option value="Albania">Albania</option>
                  <option value="Algeria">Algeria</option>
                  <option value="Argentina">Argentina</option>
                  <option value="Australia">Australia</option>
                  <option value="Austria">Austria</option>
                  <option value="Bangladesh">Bangladesh</option>
                  <option value="Belgium">Belgium</option>
                  <option value="Brazil">Brazil</option>
                  <option value="Canada">Canada</option>
                  <option value="China">China</option>
                  <option value="Colombia">Colombia</option>
                  <option value="Denmark">Denmark</option>
                  <option value="Egypt">Egypt</option>
                  <option value="Finland">Finland</option>
                  <option value="France">France</option>
                  <option value="Germany">Germany</option>
                  <option value="Greece">Greece</option>
                  <option value="India">India</option>
                  <option value="Indonesia">Indonesia</option>
                  <option value="Iran">Iran</option>
                  <option value="Iraq">Iraq</option>
                  <option value="Ireland">Ireland</option>
                  <option value="Israel">Israel</option>
                  <option value="Italy">Italy</option>
                  <option value="Japan">Japan</option>
                  <option value="Jordan">Jordan</option>
                  <option value="Kenya">Kenya</option>
                  <option value="Lebanon">Lebanon</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="Mexico">Mexico</option>
                  <option value="Morocco">Morocco</option>
                  <option value="Netherlands">Netherlands</option>
                  <option value="New Zealand">New Zealand</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="Norway">Norway</option>
                  <option value="Pakistan">Pakistan</option>
                  <option value="Palestine">Palestine</option>
                  <option value="Philippines">Philippines</option>
                  <option value="Poland">Poland</option>
                  <option value="Portugal">Portugal</option>
                  <option value="Qatar">Qatar</option>
                  <option value="Romania">Romania</option>
                  <option value="Russia">Russia</option>
                  <option value="Saudi Arabia">Saudi Arabia</option>
                  <option value="Singapore">Singapore</option>
                  <option value="South Africa">South Africa</option>
                  <option value="South Korea">South Korea</option>
                  <option value="Spain">Spain</option>
                  <option value="Sudan">Sudan</option>
                  <option value="Sweden">Sweden</option>
                  <option value="Switzerland">Switzerland</option>
                  <option value="Syria">Syria</option>
                  <option value="Thailand">Thailand</option>
                  <option value="Tunisia">Tunisia</option>
                  <option value="Turkey">Turkey</option>
                  <option value="UAE">United Arab Emirates</option>
                  <option value="UK">United Kingdom</option>
                  <option value="USA">United States</option>
                  <option value="Vietnam">Vietnam</option>
                  <option value="Yemen">Yemen</option>
                </select>
              </div>

              <div className="flex justify-between items-center pt-4">
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="text-sm font-medium text-purple-600 hover:text-purple-700"
                >
                  {tc('back')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-md hover:from-purple-700 hover:to-blue-600 font-medium"
                >
                  {tc('next')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Email */}
        {step === 3 && (
          <div className="bg-white border border-gray-300 rounded-lg p-10 shadow-sm">
            <h2 className="text-2xl font-normal text-gray-900 mb-2">
              {t('emailStep')}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {t('enterYourEmail')}
            </p>

            {error && (
              <div className="mb-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
              <div>
                <input
                  type="email"
                  autoFocus
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  placeholder={t('yourEmail')}
                />
              </div>

              <div className="flex justify-between items-center pt-4">
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="text-sm font-medium text-purple-600 hover:text-purple-700"
                >
                  {tc('back')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-md hover:from-purple-700 hover:to-blue-600 font-medium"
                >
                  {tc('next')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 4: Password */}
        {step === 4 && (
          <div className="bg-white border border-gray-300 rounded-lg p-10 shadow-sm">
            <h2 className="text-2xl font-normal text-gray-900 mb-2">
              {t('passwordStep')}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {t('createSecurePassword')}
            </p>

            {error && (
              <div className="mb-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    value={formData.password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                    placeholder={t('passwordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{t('passwordStrength')}</span>
                      <span className="text-xs font-medium text-gray-900">
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${getPasswordStrengthColor()}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                    placeholder={t('confirmPasswordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="text-sm font-medium text-purple-600 hover:text-purple-700"
                  disabled={loading}
                >
                  {tc('back')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-md hover:from-purple-700 hover:to-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {tc('loading')}
                    </>
                  ) : (
                    t('createAccount')
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
