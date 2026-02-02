'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [apiResponse, setApiResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchFromAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hello');
      const data = await response.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setApiResponse('Error fetching from API: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Your Habit Tracker! 🎯
          </h1>

          <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
            This is a Next.js app with TypeScript and Tailwind CSS. Let's test the API!
          </p>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
              API Test
            </h2>

            <button
              onClick={fetchFromAPI}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Fetch from API'}
            </button>

            {apiResponse && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                  API Response:
                </h3>
                <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
                  <code className="text-gray-800 dark:text-gray-200">{apiResponse}</code>
                </pre>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
              Tech Stack
            </h2>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
              <li>✨ <strong>Next.js 15</strong> - React framework with App Router</li>
              <li>🔷 <strong>TypeScript</strong> - Type-safe JavaScript</li>
              <li>🎨 <strong>Tailwind CSS</strong> - Utility-first CSS framework</li>
              <li>⚡ <strong>API Routes</strong> - Built-in backend endpoints</li>
            </ul>
          </div>

          <div className="mt-8 text-center text-gray-600 dark:text-gray-400">
            <p className="mb-4">Edit <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">app/page.tsx</code> to get started!</p>
            <Link
              href="/about"
              className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold transition-colors"
            >
              Learn more about this project
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
