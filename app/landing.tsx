import Link from 'next/link';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-lg mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Habit Tracker
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-12">
          Build better habits, one day at a time. Track your daily routines,
          see your progress, and stay consistent.
        </p>

        <div className="space-y-3 max-w-xs mx-auto mb-16">
          <Link
            href="/login"
            className="block w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors text-center"
          >
            Get Started
          </Link>
          <Link
            href="/about"
            className="block w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors text-center"
          >
            Learn More
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-6 text-left">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Track
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Add habits and check them off each day.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Review
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              See when you completed each habit at a glance.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Sync
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sign in to access your habits across devices.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
