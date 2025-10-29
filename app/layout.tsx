import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const cairo = Cairo({ 
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Light of Life - Spreading Christ's Love and Peace",
  description: "A Christian ministry website dedicated to sharing the love and peace of Jesus Christ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cairo.className}>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1 bg-gray-50">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
