'use client';

import { useTranslations } from 'next-intl';

export default function Footer() {
  const t = useTranslations('footer');
  
  return (
    <footer className="bg-gradient-to-r from-purple-900 to-blue-900 text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-lg mb-2">
            {t('developedBy')} <span className="font-semibold">Engineer Anwar</span> • © {t('allRightsReserved')}
          </p>
          <p className="text-purple-200 flex items-center justify-center">
            {t('mayTheLight')} <span className="ml-2 rtl:mr-2 rtl:ml-0">🌟</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

