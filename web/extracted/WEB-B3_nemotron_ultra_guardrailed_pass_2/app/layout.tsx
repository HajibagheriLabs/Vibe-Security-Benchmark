import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import './globals.css'; // Ensure Tailwind directives are here

export const metadata: Metadata = {
  title: 'My App',
  description: 'Secure, accessible web application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased text-gray-900 bg-white min-h-screen flex flex-col">
        <Navbar
          logoText="MyApp"
          links={[
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/settings', label: 'Settings' },
          ]}
          cta={{ href: '/upgrade', label: 'Upgrade' }}
        />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}