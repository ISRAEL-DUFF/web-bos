export type AppItem = {
  id: string;
  name: string;
  url: string;
  icon?: string;
  lastOpened: number; // epoch ms
};

// Minimal BeforeInstallPromptEvent type for PWA install prompt
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  prompt: () => Promise<void> | void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type ClipItem = {
  id: string;
  text: string;
  ts: number;
};
