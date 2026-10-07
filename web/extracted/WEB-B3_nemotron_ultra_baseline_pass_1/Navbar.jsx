import React, { useState, useEffect } from 'react';

const Navbar = ({ 
  brand = 'Brand',
  links = [],
  actions = [],
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <nav
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${isScrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm dark:bg-gray-900/95' : 'bg-transparent'}
        ${className}
      `}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            type="button"
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 dark:text-gray-200 dark:hover:text-white dark:hover:bg-gray-800 lg:hidden"
            onClick={toggleMenu}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
          >
            {isOpen ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          <div className="flex items-center flex-shrink-0 lg:flex-1">
            <a href="/" className="flex items-center space-x-2" aria-label={`${brand} home`}>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {brand}
              </span>
            </a>
          </div>

          <div className="hidden lg:flex lg:items-center lg:space-x-8">
            {links.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="text-sm font-medium text-gray-700 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 transition-colors"
              >
                {link.label}
              </a>
            ))}
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg transition-all
                  ${action.variant === 'primary'
                    ? 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
                  }
                `}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`
          lg:hidden overflow-hidden transition-all duration-300 ease-in-out
          ${isOpen ? 'max-h-96 opacity-100 visible' : 'max-h-0 opacity-0 invisible'}
        `}
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="px-4 pt-2 pb-4 space-y-2 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          {links.map((link, index) => (
            <a
              key={index}
              href={link.href}
              onClick={closeMenu}
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-lg dark:text-gray-300 dark:hover:text-primary-400 dark:hover:bg-gray-800 transition-colors"
            >
              {link.label}
            </a>
          ))}
          {actions.length > 0 && (
            <div className="pt-2 space-y-2 border-t border-gray-100 dark:border-gray-800">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => {
                    action.onClick();
                    closeMenu();
                  }}
                  className={`
                    w-full px-4 py-2 text-base font-medium rounded-lg transition-all text-left
                    ${action.variant === 'primary'
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}
    </nav>
  );
};

export default Navbar;