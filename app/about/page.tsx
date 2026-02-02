import Link from 'next/link';

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          {/* Back to home link */}
          <Link
            href="/"
            className="inline-flex items-center text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 mb-8 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>

          {/* About content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
              About This Project
            </h1>

            <div className="space-y-6 text-gray-700 dark:text-gray-300">
              <section>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-3">
                  What is This?
                </h2>
                <p className="leading-relaxed">
                  This is a modern web application built to help you track and maintain your daily habits.
                  It's built with cutting-edge technologies to provide a fast, responsive, and enjoyable user experience.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-3">
                  Technology Stack
                </h2>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2">▸</span>
                    <span><strong>Next.js 15</strong> - A powerful React framework with server-side rendering and API routes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2">▸</span>
                    <span><strong>TypeScript</strong> - Type-safe JavaScript for fewer bugs and better developer experience</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2">▸</span>
                    <span><strong>Tailwind CSS</strong> - Utility-first CSS framework for rapid UI development</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-500 mr-2">▸</span>
                    <span><strong>React</strong> - Component-based UI library for building interactive interfaces</span>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-3">
                  Features Coming Soon
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-purple-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">📊 Track Habits</h3>
                    <p className="text-sm">Monitor your daily habits and see your progress over time</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">📈 Analytics</h3>
                    <p className="text-sm">Visualize your habit streaks and completion rates</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🎯 Goals</h3>
                    <p className="text-sm">Set and achieve your personal goals</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-gray-700 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">🔔 Reminders</h3>
                    <p className="text-sm">Get notified to stay on track with your habits</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-3">
                  Get Started
                </h2>
                <p className="leading-relaxed">
                  Head back to the{' '}
                  <Link href="/" className="text-purple-600 dark:text-purple-400 hover:underline font-semibold">
                    home page
                  </Link>
                  {' '}to explore the app and test out the API integration!
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
