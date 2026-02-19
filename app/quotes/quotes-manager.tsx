'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Quote } from '@/lib/types';
import {
  fetchQuotes,
  addQuote,
  updateQuote,
  deleteQuote,
  seedQuotesIfEmpty,
} from '@/lib/quotes';
import { useTheme } from '../theme-provider';
import NavBar from '../nav-bar';

interface QuotesManagerProps {
  userId: string;
}

export default function QuotesManager({ userId }: QuotesManagerProps) {
  const { theme } = useTheme();
  const supabase = useMemo(() => createClient(), []);

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Add form state
  const [newText, setNewText] = useState('');
  const [newAuthor, setNewAuthor] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingAuthor, setEditingAuthor] = useState('');

  // Load quotes (seed if empty)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      await seedQuotesIfEmpty(supabase, userId);
      const data = await fetchQuotes(supabase, userId);
      if (!cancelled) { setQuotes(data); setLoaded(true); }
    }
    load().catch(err => { if (!cancelled) { console.error('Failed to load quotes:', err); setLoaded(true); } });
    return () => { cancelled = true; };
  }, [supabase, userId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const text = newText.trim();
    const author = newAuthor.trim();
    if (!text || !author) return;

    try {
      const quote = await addQuote(supabase, userId, text, author);
      setQuotes(prev => [quote, ...prev]);
      setNewText('');
      setNewAuthor('');
    } catch (err) {
      console.error('Failed to add quote:', err);
    }
  }

  async function handleDelete(quoteId: number) {
    const prev = quotes;
    setQuotes(quotes.filter(q => q.id !== quoteId));
    try {
      await deleteQuote(supabase, quoteId);
    } catch (err) {
      console.error('Failed to delete quote:', err);
      setQuotes(prev);
    }
  }

  function startEdit(quote: Quote) {
    setEditingId(quote.id);
    setEditingText(quote.text);
    setEditingAuthor(quote.author);
  }

  async function saveEdit() {
    if (editingId === null) return;
    const text = editingText.trim();
    const author = editingAuthor.trim();
    if (!text || !author) return;

    const prev = quotes;
    setQuotes(quotes.map(q => q.id === editingId ? { ...q, text, author } : q));
    setEditingId(null);

    try {
      await updateQuote(supabase, editingId, { text, author });
    } catch (err) {
      console.error('Failed to update quote:', err);
      setQuotes(prev);
    }
  }

  function cancelEdit() {
    setEditingId(null);
  }

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: theme.colors.background }}>
      <header className="max-w-2xl mx-auto mb-6">
        <NavBar />
      </header>

      <main className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Quotes</h1>
        <p className="text-sm" style={{ color: theme.colors.textMuted }}>
          Manage your motivational quotes. A random quote appears on your dashboard each visit.
        </p>

        {/* Add quote form */}
        <div className="rounded-xl p-6 shadow-sm" style={{ backgroundColor: theme.colors.card }}>
          <form onSubmit={handleAdd} className="space-y-3">
            <textarea
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="Quote text..."
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              rows={2}
              style={{
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.border,
                border: '1px solid',
              }}
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={newAuthor}
                onChange={e => setNewAuthor(e.target.value)}
                placeholder="Author..."
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  border: '1px solid',
                }}
              />
              <button
                type="submit"
                disabled={!newText.trim() || !newAuthor.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: theme.colors.primary }}
              >
                Add
              </button>
            </div>
          </form>
        </div>

        {/* Quotes list */}
        {!loaded ? (
          <p className="text-sm text-center" style={{ color: theme.colors.textMuted }}>Loading...</p>
        ) : quotes.length === 0 ? (
          <p className="text-sm text-center" style={{ color: theme.colors.textMuted }}>No quotes yet. Add one above!</p>
        ) : (
          <div className="space-y-3">
            {quotes.map(quote => (
              <div
                key={quote.id}
                className="rounded-xl p-4 shadow-sm group"
                style={{ backgroundColor: theme.colors.card }}
              >
                {editingId === quote.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                      rows={2}
                      autoFocus
                      style={{
                        backgroundColor: theme.colors.background,
                        color: theme.colors.text,
                        borderColor: theme.colors.border,
                        border: '1px solid',
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingAuthor}
                        onChange={e => setEditingAuthor(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg text-sm"
                        style={{
                          backgroundColor: theme.colors.background,
                          color: theme.colors.text,
                          borderColor: theme.colors.border,
                          border: '1px solid',
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <button
                        onClick={saveEdit}
                        className="px-3 py-1 rounded-lg text-sm text-white"
                        style={{ backgroundColor: theme.colors.primary }}
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1 rounded-lg text-sm"
                        style={{ color: theme.colors.textMuted }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm italic" style={{ color: theme.colors.text }}>
                      &ldquo;{quote.text}&rdquo;
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs" style={{ color: theme.colors.textMuted }}>
                        &mdash; {quote.author}
                      </p>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(quote)}
                          className="p-1 rounded transition-colors"
                          style={{ color: theme.colors.textMuted }}
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(quote.id)}
                          className="p-1 rounded transition-colors hover:text-red-500"
                          style={{ color: theme.colors.textMuted }}
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Count footer */}
        {loaded && quotes.length > 0 && (
          <p className="text-xs text-center" style={{ color: theme.colors.textMuted }}>
            {quotes.length} quote{quotes.length !== 1 ? 's' : ''}
          </p>
        )}
      </main>
    </div>
  );
}
