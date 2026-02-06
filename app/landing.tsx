import Link from 'next/link';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <main className="text-center">
        <h1 className="text-2xl text-gray-900 mb-6">
          Scrub Squirrel&apos;s website
        </h1>
        <Link
          href="/login"
          className="text-gray-500 hover:text-gray-900 underline"
        >
          Login
        </Link>
      </main>
    </div>
  );
}
