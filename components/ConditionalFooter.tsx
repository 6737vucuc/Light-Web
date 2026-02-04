'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footer on messages and community pages
  const hideFooterPaths = ['/messages', '/community'];
  const shouldHideFooter = hideFooterPaths.some(path => pathname?.includes(path));
  
  if (shouldHideFooter) {
    return null;
  }
  
  return <Footer />;
}
