import React, { useState, useEffect } from 'react';

// Types
interface NavItem {
  label: string;
  href: string;
}

interface NavbarProps {
  logoUrl: string;
  items: NavItem[];
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
  userDisplayName?: string;
}

// Constants
const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Docs', href: '/docs' },
];

export const Navbar: React.FC<NavbarProps> = ({
  logoUrl,
  items = NAV_ITEMS,
  isAuthenticated,
  onLogin,
  onLogout,
  userDisplayName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavClick = () => {
    setIsOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-sm shadow-md border-b border-gray-100'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="/" className="flex items-center gap-2" aria-label="Home">
              <img
                src={logoUrl}
                alt="Company Logo"
                className="h-8 w-auto object-contain"
              />
              <span className="hidden sm:block font-bold text-xl text-gray-900">
                BrandName
              </span>
            </a>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {items.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200"
              >
                {item.label}
              </a>
            ))}
            
            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-gray-600">
                    {userDisplayName || 'User'}
                  </span>
                  <button
                    onClick={onLogout}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onLogin}
                    className="text-gray-700 hover:text-blue-600 font-medium"
                  >
                    Login
                  </button>
                  <button
                    onClick={onLogin}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded={isOpen}
              aria-label="Toggle menu"
            >
              <svg
                className={`h-6 w-6 transition-transform duration-300 ${
                  isOpen ? 'rotate-90' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden transition-all duration-300 ease-in-out ${
          isOpen
            ? 'max-h-96 opacity-100'
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="px-4 pt-2 pb-4 space-y-1 bg-white border-b border-gray-100 shadow-lg">
          {items.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={handleNavClick}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
            >
              {item.label}
            </a>
          ))}
          
          <div className="pt-4 space-y-2">
            {isAuthenticated ? (
              <>
                <div className="px-3 py-2 text-sm text-gray-600">
                  {userDisplayName || 'User'}
                </div>
                <button
                  onClick={() => {
                    handleNavClick();
                    onLogout();
                  }}
                  className="w-full px-3 py-2 text-left text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    handleNavClick();
                    onLogin();
                  }}
                  className="w-full px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    handleNavClick();
                    onLogin();
                  }}
                  className="w-full px-3 py-2 text-left text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;