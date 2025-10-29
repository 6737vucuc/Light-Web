'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setUser(null);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/lessons', label: 'Lessons' },
    { href: '/support', label: 'Support' },
    { href: '/community', label: 'Community' },
  ];

  if (isAuthenticated) {
    navLinks.push({ href: '/profile', label: 'Profile' });
    if (user?.isAdmin) {
      navLinks.push({ href: '/admin', label: 'Admin' });
    }
  }

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-md">
              <Image
                src="/logo.png"
                alt="Light of Life"
                fill
                className="object-cover"
              />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              Light of Life
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-700 hover:text-purple-600 transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
            
            {!isAuthenticated ? (
              <>
                <Link
                  href="/auth/register"
                  className="text-gray-700 hover:text-purple-600 transition-colors font-medium"
                >
                  Join Us
                </Link>
                <Link
                  href="/auth/login"
                  className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-blue-600 transition-colors font-medium"
                >
                  Sign In
                </Link>
              </>
            ) : (
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-blue-600 transition-colors font-medium"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-purple-600 hover:bg-gray-100"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-gray-700 hover:text-purple-600 transition-colors font-medium px-2 py-2"
                >
                  {link.label}
                </Link>
              ))}
              
              {!isAuthenticated ? (
                <>
                  <Link
                    href="/auth/register"
                    onClick={() => setIsOpen(false)}
                    className="text-gray-700 hover:text-purple-600 transition-colors font-medium px-2 py-2"
                  >
                    Join Us
                  </Link>
                  <Link
                    href="/auth/login"
                    onClick={() => setIsOpen(false)}
                    className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-blue-600 transition-colors font-medium text-center"
                  >
                    Sign In
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-blue-600 transition-colors font-medium"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

