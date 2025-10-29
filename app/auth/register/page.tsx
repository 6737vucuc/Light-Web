'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
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
        setError('Please enter your first and last name');
        return false;
      }
      if (formData.firstName.trim().length < 2 || formData.lastName.trim().length < 2) {
        setError('Names must be at least 2 characters');
        return false;
      }
    }
    
    if (step === 2) {
      if (!formData.birthDate) {
        setError('Please enter your date of birth');
        return false;
      }
      const age = calculateAge(formData.birthDate);
      if (age < 18) {
        setError('You must be at least 18 years old to register');
        return false;
      }
      if (!formData.gender) {
        setError('Please select your gender');
        return false;
      }
      if (!formData.country) {
        setError('Please select your country');
        return false;
      }
    }
    
    if (step === 3) {
      if (!formData.email) {
        setError('Please enter your email');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        return false;
      }
    }
    
    if (step === 4) {
      if (!formData.password) {
        setError('Please enter a password');
        return false;
      }
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
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
        throw new Error(data.error || 'Registration failed');
      }

      router.push(`/auth/verify?email=${encodeURIComponent(formData.email)}`);
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
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength <= 3) return 'Medium';
    return 'Strong';
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
              Create your Account
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Enter your name
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
                    className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-purple-600 hover:text-purple-700"
                >
                  Sign in instead
                </Link>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-md hover:from-purple-700 hover:to-blue-600 font-medium"
                >
                  Next
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Birth Date & Religion */}
        {step === 2 && (
          <div className="bg-white border border-gray-300 rounded-lg p-10 shadow-sm">
            <h2 className="text-2xl font-normal text-gray-900 mb-2">
              Basic information
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Enter your birthday and religion (optional)
            </p>

            {error && (
              <div className="mb-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Birthday
                </label>
                <input
                  type="date"
                  autoFocus
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="mt-2 text-xs text-gray-500">
                  You must be at least 18 years old
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Country
                </label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Select...</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Spain">Spain</option>
                  <option value="Italy">Italy</option>
                  <option value="Netherlands">Netherlands</option>
                  <option value="Belgium">Belgium</option>
                  <option value="Switzerland">Switzerland</option>
                  <option value="Austria">Austria</option>
                  <option value="Sweden">Sweden</option>
                  <option value="Norway">Norway</option>
                  <option value="Denmark">Denmark</option>
                  <option value="Finland">Finland</option>
                  <option value="Poland">Poland</option>
                  <option value="Czech Republic">Czech Republic</option>
                  <option value="Hungary">Hungary</option>
                  <option value="Romania">Romania</option>
                  <option value="Bulgaria">Bulgaria</option>
                  <option value="Greece">Greece</option>
                  <option value="Portugal">Portugal</option>
                  <option value="Ireland">Ireland</option>
                  <option value="Egypt">Egypt</option>
                  <option value="Saudi Arabia">Saudi Arabia</option>
                  <option value="UAE">UAE</option>
                  <option value="Kuwait">Kuwait</option>
                  <option value="Qatar">Qatar</option>
                  <option value="Bahrain">Bahrain</option>
                  <option value="Oman">Oman</option>
                  <option value="Jordan">Jordan</option>
                  <option value="Lebanon">Lebanon</option>
                  <option value="Syria">Syria</option>
                  <option value="Iraq">Iraq</option>
                  <option value="Palestine">Palestine</option>
                  <option value="Israel">Israel</option>
                  <option value="Turkey">Turkey</option>
                  <option value="Iran">Iran</option>
                  <option value="Pakistan">Pakistan</option>
                  <option value="India">India</option>
                  <option value="Bangladesh">Bangladesh</option>
                  <option value="Sri Lanka">Sri Lanka</option>
                  <option value="Nepal">Nepal</option>
                  <option value="China">China</option>
                  <option value="Japan">Japan</option>
                  <option value="South Korea">South Korea</option>
                  <option value="Thailand">Thailand</option>
                  <option value="Vietnam">Vietnam</option>
                  <option value="Philippines">Philippines</option>
                  <option value="Indonesia">Indonesia</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Brazil">Brazil</option>
                  <option value="Mexico">Mexico</option>
                  <option value="Argentina">Argentina</option>
                  <option value="Chile">Chile</option>
                  <option value="Colombia">Colombia</option>
                  <option value="Peru">Peru</option>
                  <option value="South Africa">South Africa</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="Kenya">Kenya</option>
                  <option value="Ethiopia">Ethiopia</option>
                  <option value="Ghana">Ghana</option>
                  <option value="Morocco">Morocco</option>
                  <option value="Algeria">Algeria</option>
                  <option value="Tunisia">Tunisia</option>
                  <option value="Libya">Libya</option>
                  <option value="Sudan">Sudan</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Religion (Optional)
                </label>
                <select
                  value={formData.religion}
                  onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="Christian">Christian</option>
                  <option value="Muslim">Muslim</option>
                  <option value="Jewish">Jewish</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddhist">Buddhist</option>
                  <option value="Other">Other</option>
                  <option value="None">None</option>
                </select>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-md hover:from-purple-700 hover:to-blue-600 font-medium"
                >
                  Next
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Email */}
        {step === 3 && (
          <div className="bg-white border border-gray-300 rounded-lg p-10 shadow-sm">
            <h2 className="text-2xl font-normal text-gray-900 mb-2">
              Choose your email
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              You can use letters, numbers & periods
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
                  className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-md hover:from-purple-700 hover:to-blue-600 font-medium"
                >
                  Next
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 4: Password */}
        {step === 4 && (
          <div className="bg-white border border-gray-300 rounded-lg p-10 shadow-sm">
            <h2 className="text-2xl font-normal text-gray-900 mb-2">
              Create a strong password
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Create a strong password with a mix of letters, numbers and symbols
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
                    className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-600 mb-1">
                      Password strength: <span className={passwordStrength <= 1 ? 'text-red-600' : passwordStrength <= 3 ? 'text-yellow-600' : 'text-green-600'}>{getPasswordStrengthText()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full transition-all ${getPasswordStrengthColor()}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Use 8 or more characters with a mix of letters, numbers & symbols
                </p>
              </div>

              <div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-12"
                    placeholder="Confirm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-md hover:from-purple-700 hover:to-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Creating...
                    </span>
                  ) : (
                    'Next'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            © 2024 Light of Life. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

