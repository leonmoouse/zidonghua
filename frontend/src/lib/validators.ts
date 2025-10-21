import { WritingIntentKey } from './types';

export const MAX_TITLE_LENGTH = 120;

export const isTitleValid = (title: string) =>
  Boolean(title && title.trim().length > 0 && title.trim().length <= MAX_TITLE_LENGTH);

const allowedIntents: WritingIntentKey[] = [
  'troubleshooting',
  'mythbusting',
  'mechanism',
  'howto',
  'conversion',
  'decision',
  'editorial',
  'mobilization'
];

export const isIntentValid = (intent: WritingIntentKey) => allowedIntents.includes(intent);

export const sanitizeTitle = (title: string) => title.replace(/\s+/g, ' ').trim();
