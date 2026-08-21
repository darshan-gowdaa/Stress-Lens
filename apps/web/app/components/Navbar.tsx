import Link from 'next/link';

interface NavbarProps {
  currentPath?: 'checkin' | 'dashboard' | 'notebook';
}

export default function Navbar({ currentPath }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] border-b border-[var(--color-surface-variant)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="StressLens home">
          {/* logo mark */}
          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-lg leading-none select-none group-hover:scale-105 transition-transform">
            S
          </div>
          <span className="font-semibold text-[var(--color-on-surface)] text-lg tracking-tight">
            Stress<span className="text-[var(--color-primary)]">Lens</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Main navigation">
          <Link
            href="/"
            className={`px-4 py-1.5 rounded-[var(--radius-full)] text-sm font-medium transition-colors ${
              currentPath === 'checkin'
                ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]'
                : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)]'
            }`}
          >
            Check-in
          </Link>
          <Link
            href="/dashboard"
            className={`px-4 py-1.5 rounded-[var(--radius-full)] text-sm font-medium transition-colors ${
              currentPath === 'dashboard'
                ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]'
                : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)]'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/notebook"
            className={`px-4 py-1.5 rounded-[var(--radius-full)] text-sm font-medium transition-colors ${
              currentPath === 'notebook'
                ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]'
                : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)]'
            }`}
          >
            Notebook
          </Link>
        </nav>
      </div>
    </header>
  );
}
