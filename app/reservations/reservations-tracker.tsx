"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import NavBar from "../nav-bar";
import { TrackedRestaurant, ReservationLogEntry } from "@/lib/types";
import {
  fetchTrackedRestaurants,
  addTrackedRestaurant,
  updateTrackedRestaurant,
  deleteTrackedRestaurant,
  fetchReservationLog,
  addLogEntry,
  NYC_RESTAURANT_SUGGESTIONS,
} from "@/lib/reservations";

interface ReservationsTrackerProps {
  userId: string;
  userEmail: string | null;
}

export default function ReservationsTracker({
  userId,
}: ReservationsTrackerProps) {
  const supabase = useMemo(() => createClient(), []);

  const [restaurants, setRestaurants] = useState<TrackedRestaurant[]>([]);
  const [log, setLog] = useState<ReservationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add restaurant form
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCuisine, setNewCuisine] = useState("");
  const [newReleaseDay, setNewReleaseDay] = useState("");
  const [newReleaseTime, setNewReleaseTime] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);

  // Log entry form
  const [logRestaurantId, setLogRestaurantId] = useState<number | null>(null);
  const [logEventType, setLogEventType] = useState<"spotted" | "booked" | "missed" | "checked">("checked");
  const [logNotes, setLogNotes] = useState("");
  const [loggingEntry, setLoggingEntry] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [restaurantsData, logData] = await Promise.all([
          fetchTrackedRestaurants(supabase, userId),
          fetchReservationLog(supabase, userId),
        ]);
        setRestaurants(restaurantsData);
        setLog(logData);
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [supabase, userId]);

  async function handleAddRestaurant(suggestion?: typeof NYC_RESTAURANT_SUGGESTIONS[0]) {
    const name = suggestion?.name ?? newName.trim();
    if (!name) return;

    setAdding(true);
    setError(null);

    try {
      const added = await addTrackedRestaurant(supabase, userId, {
        name,
        cuisine: suggestion?.cuisine ?? (newCuisine || undefined),
        release_day: suggestion?.release_day ?? (newReleaseDay || undefined),
        release_time: suggestion?.release_time ?? (newReleaseTime || undefined),
        notes: suggestion?.notes ?? (newNotes || undefined),
        party_size: 2,
        preferred_times: ["5:30 PM", "7:30 PM"],
      });
      setRestaurants((prev) => [added, ...prev]);
      setNewName("");
      setNewCuisine("");
      setNewReleaseDay("");
      setNewReleaseTime("");
      setNewNotes("");
      setShowAddForm(false);
      setShowSuggestions(false);
    } catch (err) {
      console.error("Failed to add:", err);
      setError("Failed to add restaurant");
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleNotify(restaurant: TrackedRestaurant) {
    try {
      const updated = await updateTrackedRestaurant(supabase, restaurant.id, {
        resy_notify_enabled: !restaurant.resy_notify_enabled,
      });
      setRestaurants((prev) =>
        prev.map((r) => (r.id === restaurant.id ? updated : r))
      );
    } catch (err) {
      console.error("Failed to update:", err);
    }
  }

  async function handleStatusChange(restaurant: TrackedRestaurant, status: TrackedRestaurant["status"]) {
    try {
      const updated = await updateTrackedRestaurant(supabase, restaurant.id, { status });
      setRestaurants((prev) =>
        prev.map((r) => (r.id === restaurant.id ? updated : r))
      );
    } catch (err) {
      console.error("Failed to update:", err);
    }
  }

  async function handleDelete(restaurantId: number) {
    if (!confirm("Remove this restaurant from tracking?")) return;
    try {
      await deleteTrackedRestaurant(supabase, restaurantId);
      setRestaurants((prev) => prev.filter((r) => r.id !== restaurantId));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  async function handleLogEntry() {
    if (!logRestaurantId) return;
    setLoggingEntry(true);
    try {
      const entry = await addLogEntry(supabase, userId, {
        restaurant_id: logRestaurantId,
        event_type: logEventType,
        notes: logNotes || undefined,
      });
      setLog((prev) => [entry, ...prev]);
      setLogRestaurantId(null);
      setLogNotes("");

      // If booked, update restaurant status
      if (logEventType === "booked") {
        const restaurant = restaurants.find((r) => r.id === logRestaurantId);
        if (restaurant) {
          handleStatusChange(restaurant, "booked");
        }
      }
    } catch (err) {
      console.error("Failed to log:", err);
    } finally {
      setLoggingEntry(false);
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getRestaurantName(id: number): string {
    return restaurants.find((r) => r.id === id)?.name ?? "Unknown";
  }

  const watchingRestaurants = restaurants.filter((r) => r.status === "watching");
  const bookedRestaurants = restaurants.filter((r) => r.status === "booked");
  const pausedRestaurants = restaurants.filter((r) => r.status === "paused");

  // Filter out already-tracked suggestions
  const trackedNames = new Set(restaurants.map((r) => r.name.toLowerCase()));
  const availableSuggestions = NYC_RESTAURANT_SUGGESTIONS.filter(
    (s) => !trackedNames.has(s.name.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100 dark:from-gray-900 dark:to-gray-800">
      <header className="max-w-3xl mx-auto px-4 pt-6">
        <NavBar />
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-rose-900 dark:text-rose-100 mb-2">
          Reservation Tracker
        </h1>
        <p className="text-rose-700 dark:text-rose-300 mb-8">
          NYC | Wed-Sun | 5-6pm or 7-8pm | Party of 2
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-rose-600">Loading...</p>
          </div>
        ) : (
          <>
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => { setShowAddForm(!showAddForm); setShowSuggestions(false); }}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium"
                >
                  + Add Restaurant
                </button>
                <button
                  onClick={() => { setShowSuggestions(!showSuggestions); setShowAddForm(false); }}
                  className="px-4 py-2 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900 dark:hover:bg-rose-800 text-rose-700 dark:text-rose-200 rounded-lg text-sm font-medium"
                >
                  NYC Suggestions ({availableSuggestions.length})
                </button>
              </div>

              {/* Add Form */}
              {showAddForm && (
                <div className="mt-4 pt-4 border-t border-rose-100 dark:border-gray-700 space-y-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Restaurant name"
                    className="w-full px-3 py-2 border border-rose-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newCuisine}
                      onChange={(e) => setNewCuisine(e.target.value)}
                      placeholder="Cuisine (optional)"
                      className="px-3 py-2 border border-rose-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={newReleaseDay}
                      onChange={(e) => setNewReleaseDay(e.target.value)}
                      placeholder="Release day (e.g., 30 days out)"
                      className="px-3 py-2 border border-rose-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newReleaseTime}
                      onChange={(e) => setNewReleaseTime(e.target.value)}
                      placeholder="Release time (e.g., Midnight ET)"
                      className="px-3 py-2 border border-rose-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      className="px-3 py-2 border border-rose-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={() => handleAddRestaurant()}
                    disabled={adding || !newName.trim()}
                    className="w-full py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 text-white rounded-lg font-medium"
                  >
                    {adding ? "Adding..." : "Add to Tracking"}
                  </button>
                </div>
              )}

              {/* Suggestions */}
              {showSuggestions && availableSuggestions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-rose-100 dark:border-gray-700 space-y-2">
                  <p className="text-sm text-rose-600 dark:text-rose-400 mb-3">
                    Click to add a hard-to-book NYC restaurant:
                  </p>
                  {availableSuggestions.map((s) => (
                    <button
                      key={s.name}
                      onClick={() => handleAddRestaurant(s)}
                      disabled={adding}
                      className="w-full text-left p-3 bg-rose-50 dark:bg-gray-700 hover:bg-rose-100 dark:hover:bg-gray-600 rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium text-rose-900 dark:text-rose-100">
                            {s.name}
                          </span>
                          <span className="text-rose-500 dark:text-rose-400 text-sm ml-2">
                            {s.cuisine}
                          </span>
                        </div>
                        <span className="text-xs text-rose-400 dark:text-rose-500">
                          {s.release_time}
                        </span>
                      </div>
                      <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                        {s.notes}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Watching Section */}
            {watchingRestaurants.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-rose-900 dark:text-rose-100 mb-4">
                  Watching ({watchingRestaurants.length})
                </h2>
                <div className="space-y-3">
                  {watchingRestaurants.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 bg-rose-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-rose-900 dark:text-rose-100">
                            {r.name}
                          </h3>
                          {r.cuisine && (
                            <span className="text-sm text-rose-500 dark:text-rose-400">
                              {r.cuisine}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="text-rose-400 hover:text-rose-600 text-sm"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="text-sm text-rose-700 dark:text-rose-300 mb-3 space-y-1">
                        {r.release_day && (
                          <p>
                            <span className="font-medium">Release:</span> {r.release_day}{" "}
                            {r.release_time && `at ${r.release_time}`}
                          </p>
                        )}
                        {r.notes && <p className="italic">{r.notes}</p>}
                      </div>

                      <div className="flex flex-wrap gap-2 items-center">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={r.resy_notify_enabled}
                            onChange={() => handleToggleNotify(r)}
                            className="rounded border-rose-300"
                          />
                          <span className="text-rose-700 dark:text-rose-300">
                            Resy notifications enabled
                          </span>
                        </label>
                        <button
                          onClick={() => {
                            setLogRestaurantId(r.id);
                            setLogEventType("checked");
                          }}
                          className="ml-auto px-3 py-1 text-xs bg-rose-200 dark:bg-rose-800 hover:bg-rose-300 dark:hover:bg-rose-700 text-rose-700 dark:text-rose-200 rounded"
                        >
                          Log Activity
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Log Entry Modal */}
            {logRestaurantId && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
                  <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-100 mb-4">
                    Log Activity: {getRestaurantName(logRestaurantId)}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-rose-800 dark:text-rose-200 mb-2">
                        What happened?
                      </label>
                      <select
                        value={logEventType}
                        onChange={(e) => setLogEventType(e.target.value as typeof logEventType)}
                        className="w-full px-3 py-2 border border-rose-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="checked">Checked Resy (no availability)</option>
                        <option value="spotted">Spotted availability!</option>
                        <option value="booked">Successfully booked!</option>
                        <option value="missed">Missed it</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-rose-800 dark:text-rose-200 mb-2">
                        Notes (optional)
                      </label>
                      <input
                        type="text"
                        value={logNotes}
                        onChange={(e) => setLogNotes(e.target.value)}
                        placeholder="e.g., Saw 7:30 PM on March 15"
                        className="w-full px-3 py-2 border border-rose-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setLogRestaurantId(null)}
                        className="flex-1 py-2 border border-rose-200 dark:border-gray-600 text-rose-700 dark:text-rose-300 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleLogEntry}
                        disabled={loggingEntry}
                        className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium"
                      >
                        {loggingEntry ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Booked Section */}
            {bookedRestaurants.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-4">
                  Booked ({bookedRestaurants.length})
                </h2>
                <div className="space-y-2">
                  {bookedRestaurants.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg flex justify-between items-center"
                    >
                      <span className="font-medium text-green-800 dark:text-green-200">
                        {r.name}
                      </span>
                      <button
                        onClick={() => handleStatusChange(r, "watching")}
                        className="text-xs text-green-600 dark:text-green-400 hover:underline"
                      >
                        Move back to watching
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Paused Section */}
            {pausedRestaurants.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-4">
                  Paused ({pausedRestaurants.length})
                </h2>
                <div className="space-y-2">
                  {pausedRestaurants.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg flex justify-between items-center"
                    >
                      <span className="text-gray-700 dark:text-gray-300">{r.name}</span>
                      <button
                        onClick={() => handleStatusChange(r, "watching")}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Resume watching
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Log */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-rose-900 dark:text-rose-100 mb-4">
                Activity Log
              </h2>
              {log.length === 0 ? (
                <p className="text-rose-500 dark:text-rose-400 text-center py-8">
                  No activity logged yet. Start checking restaurants!
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {log.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-2 rounded bg-rose-50 dark:bg-gray-700"
                    >
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          entry.event_type === "booked"
                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                            : entry.event_type === "spotted"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                            : entry.event_type === "missed"
                            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {entry.event_type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-rose-800 dark:text-rose-200">
                          {getRestaurantName(entry.restaurant_id)}
                        </span>
                        {entry.notes && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 truncate">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-rose-400 dark:text-rose-500 whitespace-nowrap">
                        {formatDate(entry.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tips Section */}
            <div className="mt-6 p-4 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
              <h3 className="font-medium text-rose-800 dark:text-rose-200 mb-2">
                Tips for Booking
              </h3>
              <ul className="text-sm text-rose-700 dark:text-rose-300 space-y-1">
                <li>1. Enable Resy notifications for each restaurant</li>
                <li>2. Set phone alarms for release times (be ready 1 min early)</li>
                <li>3. Have Resy app open and logged in before release</li>
                <li>4. For midnight releases, refresh at 11:59:50 PM</li>
                <li>5. Book ANY available time first, then try to modify later</li>
              </ul>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
