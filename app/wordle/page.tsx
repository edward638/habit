import WordleGame from './wordle-game';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sixle',
};

export default function WordlePage() {
  return <WordleGame />;
}
