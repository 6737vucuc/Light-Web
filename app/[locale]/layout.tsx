import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import "../globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ToastProvider } from "@/lib/contexts/ToastContext";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { isRtlLocale, Locale } from '@/i18n';
import { notFound } from 'next/navigation';
import ConditionalFooter from '@/components/ConditionalFooter';

// Force dynamic rendering for all pages using next-intl
export const dynamic = 'force-dynamic';

const cairo = Cairo({ 
  subsets: ["latin", "arabic"],
  weight: ["400", "600", "700"],
  variable: '--font-cairo',
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Light of Life - Spreading Christ's Love and Peace",
  description: "A Christian ministry website dedicated to sharing the love and peace of Jesus Christ",
};

export default async function LocaleLayout({
  children,
  params: { locale }
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  // Validate locale
  const validLocales = ['en', 'ar', 'es', 'fr', 'de'];
  if (!validLocales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages();
  const isRtl = isRtlLocale(locale as Locale);

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'}>
      <body className={`${cairo.variable} ${inter.variable} ${isRtl ? 'font-cairo' : 'font-inter'} overflow-x-hidden`}>
        <NextIntlClientProvider messages={messages}>
          <ToastProvider>
            <div className="flex flex-col min-h-screen w-full overflow-x-hidden">
              <Navbar />
              <main className="flex-1 bg-gray-50 w-full">
                {children}
              </main>
              <ConditionalFooter />
            </div>
            <ToastContainer />
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
