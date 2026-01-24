'use client';

import { Shield, AlertTriangle, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export default function VPNBlockedPage() {
  const t = useTranslations();
  const [countdown, setCountdown] = useState(5);
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanRetry(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleRetry = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-red-600 to-orange-600 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full">
                <Shield className="w-16 h-16 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Access Blocked
            </h1>
            <p className="text-red-100 text-lg">
              VPN/Proxy/Tor Detected
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Alert Box */}
            <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-6 rounded-r-lg">
              <div className="flex items-start">
                <AlertTriangle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-2">
                    Security Notice
                  </h3>
                  <p className="text-red-800 leading-relaxed">
                    Our security system has detected that you are using a VPN, Proxy, or Tor network. 
                    For security and privacy reasons, access to Light of Life is restricted when using these services.
                  </p>
                </div>
              </div>
            </div>

            {/* Why is this blocked? */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <XCircle className="w-6 h-6 text-red-600 mr-2" />
                Why is this blocked?
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-red-600 mr-2 font-bold">•</span>
                  <span><strong>Security:</strong> VPNs and proxies can be used to bypass security measures and hide malicious activities.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 mr-2 font-bold">•</span>
                  <span><strong>User Protection:</strong> We protect our community from spam, fraud, and abuse.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 mr-2 font-bold">•</span>
                  <span><strong>Content Integrity:</strong> Ensuring authentic engagement and preventing automated bots.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 mr-2 font-bold">•</span>
                  <span><strong>Compliance:</strong> Meeting security standards and protecting user data.</span>
                </li>
              </ul>
            </div>

            {/* How to fix */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-blue-900 mb-4">
                How to regain access:
              </h3>
              <ol className="space-y-3 text-blue-900">
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0 font-bold text-sm">1</span>
                  <span><strong>Disable your VPN</strong> - Turn off any VPN, proxy, or Tor service you are using.</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0 font-bold text-sm">2</span>
                  <span><strong>Clear your browser cache</strong> - Clear cookies and cached data.</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0 font-bold text-sm">3</span>
                  <span><strong>Restart your browser</strong> - Close and reopen your browser completely.</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0 font-bold text-sm">4</span>
                  <span><strong>Try again</strong> - Click the button below to retry access.</span>
                </li>
              </ol>
            </div>

            {/* Retry Button */}
            <div className="text-center">
              {canRetry ? (
                <button
                  onClick={handleRetry}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Retry Access
                </button>
              ) : (
                <div className="bg-gray-100 text-gray-600 px-8 py-4 rounded-lg font-semibold text-lg inline-block">
                  Please wait {countdown} seconds...
                </div>
              )}
            </div>

            {/* Support */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-600 text-sm">
                If you believe this is an error or need assistance, please contact our support team at{' '}
                <a href="mailto:support@lightoflife.com" className="text-blue-600 hover:underline font-medium">
                  support@lightoflife.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            <Shield className="w-4 h-4 inline mr-1" />
            Your security and privacy are our top priority
          </p>
        </div>
      </div>
    </div>
  );
}
