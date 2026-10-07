import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);

  const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'About', href: '#about' },
    { label: 'Services', href: '#services' },
    { label: 'Portfolio', href: '#portfolio' },
    { label: 'Contact', href: '#contact' },
  ];

  const dropdownItems = [
    { label: 'Web Development', href: '#web-dev' },
    { label: 'Mobile Apps', href: '#mobile-apps' },
    { label: 'UI/UX Design', href: '#ui-ux' },
    { label: 'Cloud Solutions', href: '#cloud' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);
  const closeMenu = () => {
    setIsOpen(false);
    setIsDropdownOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg shadow-gray-200/50'
          : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="#home" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                L
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hidden sm:block">
                Logo
              </span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium transition-all duration-200 relative group"
              >
                {link.label}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-blue-600 group-hover:w-full transition-all duration-300 rounded-full"></span>
              </a>
            ))}

            {/* Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleDropdown}
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium transition-all duration-200"
              >
                More
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-300 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-dropdown">
                  {dropdownItems.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={() => setIsDropdownOpen(false)}
                      className="block px-4 py-2.5 text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium transition-all duration-200"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <a
              href="#get-started"
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 transition-all duration-300"
            >
              Get Started
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200"
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMenu}
      />

      {/* Mobile Menu Panel */}
      <div
        className={`md:hidden fixed top-0 right-0 h-full w-80 max-w-[85%] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Menu
            </span>
            <button
              onClick={closeMenu}
              className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors duration-200"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 px-4">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={closeMenu}
                  className="block px-4 py-3 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium transition-all duration-200"
                >
                  {link.label}
                </a>
              ))}

              {/* Mobile Dropdown */}
              <div>
                <button
                  onClick={toggleDropdown}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 font-medium transition-all duration-200"
                >
                  More
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-300 ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isDropdownOpen && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-blue-100 pl-2">
                    {dropdownItems.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        onClick={closeMenu}
                        className="block px-4 py-2.5 rounded-lg text-gray-600 hover:bg-blue-50 hover:text-blue-600 font-medium transition-all duration-200"
                      >
                        {item.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100">
            <a
              href="#get-started"
              onClick={closeMenu}
              className="block w-full text-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300"
            >
              Get Started
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes dropdown {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-dropdown {
          animation: dropdown 0.2s ease-out forwards;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;