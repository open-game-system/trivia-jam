import type { Meta, StoryObj } from '@storybook/react';
import { expect } from '@storybook/test';
import { userEvent, within } from '@storybook/testing-library';
import { atom } from 'nanostores';
import { Homepage } from './homepage';
import { HomePageContent } from './homepage-content';

const meta: Meta<typeof Homepage> = {
  title: 'Game/Homepage',
  component: Homepage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Homepage>;

// The real front door (what the route renders): title up top, the buttons in thumb reach.
export const FrontDoor: Story = {
  render: () => <HomePageContent newGameId="demo-game" $showHelp={atom<boolean>(false)} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('link', { name: 'Create New Game' })).toBeInTheDocument();
    expect(canvas.getByRole('button', { name: 'How to Play' })).toBeInTheDocument();
  },
};

// Display Stories
export const DefaultView: Story = {};

export const WithCode: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Find and fill the game code input
    const gameCodeInput = canvas.getByLabelText(/game code/i);
    await userEvent.type(gameCodeInput, 'ABC123');
    
    // Verify the input value
    expect(gameCodeInput).toHaveValue('ABC123');
  },
};

export const MobileLayout: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const TabletLayout: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

export const DesktopLayout: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
  },
};

// Interactive Test Stories
export const TestJoinGame: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Find and fill the game code input
    const gameCodeInput = canvas.getByLabelText(/game code/i);
    await userEvent.type(gameCodeInput, 'ABC123');
    
    // Submit the form
    const joinButton = canvas.getByRole('button', { name: /join game/i });
    await userEvent.click(joinButton);
  },
};

export const TestCreateGame: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Click the create new game button
    const createButton = canvas.getByRole('button', { name: /create new game/i });
    await userEvent.click(createButton);
  },
};

export const TestHelpDialog: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Click the help button
    const helpButton = canvas.getByRole('button', { name: /how to play/i });
    await userEvent.click(helpButton);
  },
}; 