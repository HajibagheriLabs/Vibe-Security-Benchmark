import type { Meta, StoryObj } from '@storybook/react';
import { Navbar } from './Navbar';

const meta: Meta<typeof Navbar> = {
  title: 'Components/Navbar',
  component: Navbar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    logoText: { control: 'text' },
    links: { control: 'object' },
    cta: { control: 'object' },
  },
};

export default meta;
type Story = StoryObj<typeof Navbar>;

export const Default: Story = {
  args: {
    logoText: 'Acme Corp',
    links: [
      { href: '/features', label: 'Features' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/docs', label: 'Docs' },
      { href: '/blog', label: 'Blog' },
    ],
    cta: { href: '/signup', label: 'Get Started' },
  },
};

export const Minimal: Story = {
  args: {
    logoText: 'Minimal',
    links: [
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
    ],
  },
};

export const LongMenu: Story = {
  args: {
    logoText: 'Long Menu Demo',
    links: Array.from({ length: 10 }, (_, i) => ({
      href: `/item-${i}`,
      label: `Menu Item ${i + 1}`,
    })),
  },
};