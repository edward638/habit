"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { NuggetCount, NuggetChangelogEntry } from "@/lib/types";
import {
  fetchNuggetCount,
  fetchNuggetChangelog,
  updateNuggetCount,
} from "@/lib/nuggets";

interface NuggetTrackerProps {
  userEmail: string | null;
  isEditor: boolean;
}

export default function NuggetTracker({
  userEmail,
  isEditor,
}: NuggetTrackerProps) {
  const supabase = useMemo(() => createClient(), []);

  const [nuggetCount, setNuggetCount] = useState<NuggetCount | null>(null);
  const [changelog, setChangelog] = useState<NuggetChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [changeAmount, setChangeAmount] = useState("");
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [count, log] = await Promise.all([
          fetchNuggetCount(supabase),
          fetchNuggetChangelog(supabase),
        ]);
        setNuggetCount(count);
        setChangelog(log);
      } catch (err) {
        console.error("Failed to load nugget data:", err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [supabase]);

  async function handleUpdate(isAdd: boolean) {
    const amount = parseInt(changeAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid positive number");
      return;
    }

    const delta = isAdd ? amount : -amount;
    setUpdating(true);
    setError(null);

    try {
      const updated = await updateNuggetCount(supabase, delta, note, userEmail);
      setNuggetCount(updated);

      // Refresh changelog
      const log = await fetchNuggetChangelog(supabase);
      setChangelog(log);

      // Clear inputs
      setChangeAmount("");
      setNote("");
    } catch (err) {
      console.error("Failed to update:", err);
      setError("Failed to update nugget count");
    } finally {
      setUpdating(false);
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatChange(amount: number): string {
    return amount > 0 ? `+${amount}` : `${amount}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {/* Header */}
      {isEditor && (
        <header className="max-w-2xl mx-auto px-4 pt-6 flex justify-end">
          <span className="text-sm text-amber-700">Editor</span>
        </header>
      )}

      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Title */}
        <h1 className="text-3xl font-bold text-center text-amber-900 mb-8">
          San&apos;s Nugget Tracker
        </h1>

        {/* Nugget Display */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-amber-600">Loading...</p>
            </div>
          ) : (
            <div className="text-center">
              {/* Chicken Nugget Image */}
              <img
                src="/nugget.png"
                alt="Chicken Nugget"
                className="w-32 h-32 mx-auto mb-4 object-contain"
              />

              {/* Count */}
              <div className="text-6xl font-bold text-amber-600 mb-2">
                {nuggetCount?.count ?? 0}
              </div>
              <p className="text-amber-700 text-lg">nuggets to be consumed</p>

              {nuggetCount?.updated_at && (
                <p className="text-amber-500 text-sm mt-2">
                  Last updated: {formatDate(nuggetCount.updated_at)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Editor Controls */}
        {isEditor && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-amber-900 mb-4">
              Update Count
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={changeAmount}
                  onChange={(e) => setChangeAmount(e.target.value)}
                  placeholder="Enter number..."
                  min="1"
                  className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-amber-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g., McDonald's 20pc..."
                  className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-amber-900"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleUpdate(true)}
                  disabled={updating || !changeAmount}
                  className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
                >
                  {updating ? "Updating..." : "+ Add Nuggets"}
                </button>
                <button
                  onClick={() => handleUpdate(false)}
                  disabled={updating || !changeAmount}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
                >
                  {updating ? "Updating..." : "- Remove Nuggets"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Changelog */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-4">
            Changelog
          </h2>

          {changelog.length === 0 ? (
            <p className="text-amber-600 text-center py-8">No changes yet.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {changelog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-amber-50"
                >
                  <div
                    className={`px-2 py-1 rounded text-sm font-bold ${
                      entry.change_amount > 0
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {formatChange(entry.change_amount)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-amber-900 font-medium">
                        {entry.previous_count} &rarr; {entry.new_count}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="text-amber-700 text-sm mt-1">
                        {entry.note}
                      </p>
                    )}
                    <p className="text-amber-500 text-xs mt-1">
                      {formatDate(entry.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
