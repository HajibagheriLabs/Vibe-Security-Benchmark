import React from 'react';
import Navbar from './Navbar';

export default {
  title: 'Components/Navbar',
  component: Navbar,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#111827' },
        { name: 'gradient', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
      ],
    },
  },
  tags: ['autodocs'],
};

export const Default = {};

export const Scrolled = {
  decorators: [
    (Story) => (
      <div style={{ height: '200vh' }}>
        <Story />
      </div>
    ),
  ],
};

export const MobileMenuOpen = {
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('button[aria-controls="mobile-menu"]');
    if (button) button.click();
  },
};