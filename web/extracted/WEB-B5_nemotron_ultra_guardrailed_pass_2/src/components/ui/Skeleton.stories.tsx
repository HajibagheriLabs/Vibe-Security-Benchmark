import type { Meta, StoryObj } from "@storybook/react";
import { Skeleton } from "./Skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "UI/Skeleton",
  component: Skeleton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    lines: { control: { type: "range", min: 1, max: 10, step: 1 } },
    variant: {
      control: "select",
      options: ["text", "card", "circular", "rectangular"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  args: { lines: 3, variant: "text" },
};

export const Card: Story = {
  args: { lines: 1, variant: "card" },
  decorators: [
    (Story) => (
      <div className="w-80 p-4 border rounded-lg bg-card">
        <Story />
      </div>
    ),
  ],
};

export const Circular: Story = {
  args: { lines: 3, variant: "circular" },
  decorators: [
    (Story) => <div className="flex gap-4">{Story()}</div>,
  ],
};

export const Rectangular: Story = {
  args: { lines: 2, variant: "rectangular" },
};

export const ManyLines: Story = {
  args: { lines: 8, variant: "text" },
};