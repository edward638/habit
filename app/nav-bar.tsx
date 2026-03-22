'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './theme-provider';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/quotes', label: 'Quotes' },
  { href: '/art-coach', label: 'Art Coach' },
  { href: '/color-match', label: 'Color Match' },
  { href: '/wordle', label: 'Sixle' },
  { href: '/reservations', label: 'Reservations' },
  { href: '/tft', label: 'TFT' },
  { href: '/amex-points', label: 'Amex Points' },
];

export default function NavBar() {
  const { theme } = useTheme();
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 flex-wrap">
      {NAV_LINKS.map(link => {
        const isActive = link.href === '/'
          ? pathname === '/'
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className="px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: isActive ? theme.colors.primary + '20' : 'transparent',
              color: isActive ? theme.colors.primary : theme.colors.textMuted,
              fontWeight: isActive ? 600 : 400,
            }}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
