export type ItemStatus = 'queued' | 'extracting' | 'ready' | 'failed' | 'blocked';
export type ItemState = 'up_next' | 'in_progress' | 'listened' | 'archived';

export type Item = {
  id: string;
  title: string;
  site_name: string;
  source_url: string;
  source_channel: 'web' | 'email' | 'share' | 'extension' | 'paste';
  status: ItemStatus;
  fail_reason: string | null;
  state: ItemState;
  position: number;
  progress_sentence: number;
  duration_min?: number;
  sentences: string[];
  paragraphs?: string[][];
  batch?: string;
  sender?: string;
  held?: boolean;
};

export const SAVE_ADDRESS = 'kp-7f3a@save.listenlater.app';

export const VOICES = ['Samantha · en-US', 'Rishi · en-IN', 'Daniel · en-GB'];
export const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5];
export const SLEEPS = ['Off', '15 min', '30 min', '45 min', 'End of piece'] as const;

const night = [
  'The city kept the lights on longer than anyone had planned.',
  'Platforms filled before the timetable said they should.',
  'A delay of four minutes became the shape of the evening.',
  'People stopped checking the clock and started listening to the carriages.',
  'By the last stop the commute had turned into a small public room.',
  'Nobody filed it anywhere. They just rode it to the end.',
];

const markets = [
  'Markets opened quietly, the way a library opens.',
  'Then a single number moved and the room changed temperature.',
  'Traders described it later as a draft under the door.',
  'The afternoon recovered its manners.',
  'The close was ordinary, which was the surprising part.',
];

const ferry = [
  'The ferry left before the sky had chosen a color.',
  'The captain knew the regulars by the sound of their steps.',
  'He reads the passenger list once, then puts it away.',
  'The water kept its own timetable.',
  'Someone on the bench was already halfway through a long piece.',
];

const trees = [
  'The city planted trees one block at a time.',
  'Shade arrived before anyone agreed to call it a policy.',
  'Shops noticed that people stayed longer where the pavement was cooler.',
  'A map of the new canopy looked like a slow sentence.',
];

export const INITIAL_ITEMS: Item[] = [
  {
    id: 'atl',
    title: 'Why the night commute got longer',
    site_name: 'The Atlantic',
    source_url: 'https://www.theatlantic.com/night-commute',
    source_channel: 'web',
    status: 'ready',
    fail_reason: null,
    state: 'in_progress',
    position: 1,
    progress_sentence: 2,
    duration_min: 12,
    sentences: night,
  },
  {
    id: 'wsj',
    title: 'Markets opened quietly, then did not',
    site_name: 'WSJ',
    source_url: 'https://www.wsj.com/markets-quiet',
    source_channel: 'email',
    status: 'ready',
    fail_reason: null,
    state: 'up_next',
    position: 2,
    progress_sentence: 0,
    duration_min: 18,
    sentences: markets,
  },
  {
    id: 'nyt',
    title: 'The city kept the lights on',
    site_name: 'NYT',
    source_url: 'https://www.nytimes.com/lights',
    source_channel: 'share',
    status: 'ready',
    fail_reason: null,
    state: 'up_next',
    position: 3,
    progress_sentence: 1,
    duration_min: 9,
    sentences: ferry,
  },
  {
    id: 'sub',
    title: 'Sunday reads for a long train',
    site_name: 'Substack',
    source_url: 'https://example.substack.com/sunday',
    source_channel: 'email',
    status: 'ready',
    fail_reason: null,
    state: 'up_next',
    position: 4,
    progress_sentence: 0,
    duration_min: 22,
    sentences: trees,
  },
  {
    id: 'li',
    title: 'A post that asked us to sign in',
    site_name: 'LinkedIn',
    source_url: 'https://www.linkedin.com/pulse/example',
    source_channel: 'extension',
    status: 'blocked',
    fail_reason: 'login_wall',
    state: 'up_next',
    position: 5,
    progress_sentence: 0,
    sentences: [],
  },
  {
    id: 'pay',
    title: 'The essay behind the subscribe wall',
    site_name: 'The Economist',
    source_url: 'https://www.economist.com/essay',
    source_channel: 'web',
    status: 'blocked',
    fail_reason: 'paywall',
    state: 'up_next',
    position: 6,
    progress_sentence: 0,
    sentences: [],
  },
  {
    id: 'arr1',
    title: 'Preparing a newsletter',
    site_name: 'Morning Brew',
    source_url: 'https://www.morningbrew.com/issue',
    source_channel: 'email',
    status: 'extracting',
    fail_reason: null,
    state: 'up_next',
    position: 7,
    progress_sentence: 0,
    sentences: [],
  },
  {
    id: 'hold1',
    title: 'The harbor at low tide',
    site_name: 'The Guardian',
    source_url: 'https://www.theguardian.com/harbor',
    source_channel: 'email',
    status: 'queued',
    fail_reason: null,
    state: 'up_next',
    position: 8,
    progress_sentence: 0,
    sentences: [],
    batch: 'Sunday reads',
    sender: 'unknown@newsletter.test',
    held: true,
  },
  {
    id: 'hold2',
    title: 'A short history of shade',
    site_name: 'Aeon',
    source_url: 'https://aeon.co/shade',
    source_channel: 'email',
    status: 'queued',
    fail_reason: null,
    state: 'up_next',
    position: 9,
    progress_sentence: 0,
    sentences: [],
    batch: 'Sunday reads',
    sender: 'unknown@newsletter.test',
    held: true,
  },
  {
    id: 'heard',
    title: 'Notes from the early ferry',
    site_name: 'The Atlantic',
    source_url: 'https://www.theatlantic.com/ferry',
    source_channel: 'web',
    status: 'ready',
    fail_reason: null,
    state: 'listened',
    position: 10,
    progress_sentence: 0,
    sentences: ferry,
  },
  {
    id: 'arch',
    title: 'An old map of the night buses',
    site_name: 'London Review',
    source_url: 'https://www.lrb.co.uk/buses',
    source_channel: 'paste',
    status: 'ready',
    fail_reason: null,
    state: 'archived',
    position: 11,
    progress_sentence: 0,
    sentences: trees,
  },
];

export function minutes(item: Item) {
  if (item.duration_min) return item.duration_min;
  const words = item.sentences.join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 165) || (item.sentences.length ? 1 : 8));
}

export function progressOf(item: Item) {
  if (!item.sentences.length) return 0;
  return Math.min(1, item.progress_sentence / item.sentences.length);
}

export function clock(item: Item) {
  const total = minutes(item) * 60;
  const elapsed = Math.round(progressOf(item) * total);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function failCopy(reason: string | null) {
  if (reason === 'login_wall' || reason === 'http_403') {
    return {
      title: 'This page needs you signed in',
      body: 'Sites like LinkedIn block automatic readers. Open the page in your browser, then share or paste the text here.',
    };
  }
  if (reason === 'paywall') {
    return {
      title: 'This one is behind a paywall',
      body: 'We do not bypass paywalls. Open it where you are subscribed, or paste the text you can already read.',
    };
  }
  return {
    title: 'We could not prepare this link',
    body: 'Try again, or paste the article text.',
  };
}

export function toEpisode(item: Item) {
  return {
    id: item.id,
    title: item.title,
    siteName: item.site_name,
    durationMin: minutes(item),
    progress: progressOf(item),
    elapsedLabel: clock(item),
  };
}
