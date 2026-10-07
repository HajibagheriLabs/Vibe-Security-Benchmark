import React from 'react';
import Navbar from './Navbar';

export default {
  title: 'Components/Navbar',
  component: Navbar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    brand: { control: 'text' },
    links: { control: 'object' },
    actions: { control: 'object' },
  },
};

export const Default = {
  args: {
    brand: 'Acme Corp',
    links: [
      { href: '#features', label: 'Features' },
      { href: '#pricing', label: 'Pricing' },
      { href: '#docs', label: 'Docs' },
      { href: '#blog', label: 'Blog' },
    ],
    actions: [
      { label: 'Sign in', onClick: () => console.log('Sign in'), variant: 'ghost' },
      { label: 'Get started', onClick: () => console.log('Get started'), variant: 'primary' },
    ],
  },
};

export const Minimal = {
  args: {
    brand: 'Minimal',
    links: [
      { href: '#', label: 'Home' },
      { href: '#', label: 'About' },
    ],
    actions: [],
  },
};

export const WithManyLinks = {
  args: {
    brand: 'Complex App',
    links: [
      { href: '#', label: 'Dashboard' },
      { href: '#', label: 'Projects' },
      { href: '#', label: 'Team' },
      { href: '#', label: 'Reports' },
      { href: '#', label: 'Settings' },
      { href: '#', label: 'Help' },
    ],
    actions: [
      { label: 'Upgrade', onClick: () => {}, variant: 'primary' },
    ],
  },
};

export const DarkMode = {
  args: {
    brand: 'Dark Mode',
    links: [
      { href: '#', label: 'Features' },
      { href: '#', label: 'Pricing' },
    ],
    actions: [
      { label: 'Login', onClick: () => {}, variant: 'ghost' },
      { label: 'Sign Up', onClick: () => {}, variant: 'primary' },
    ],
  },
  decorators: [
    (Story) => (
      <div className="dark min-h-screen bg-gray-900">
        <Story />
        <div className="pt-20 p-8 text-white">
          <p>Scroll down to see the scrolled state</p>
          <div className="h-96" />
        </div>
      </div>
    ),
  ],
};