import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-20 text-center space-y-3">
      <h2 className="text-xl font-bold text-foreground">Page Not Found</h2>
      <p className="text-xs text-muted-foreground">
        The requested production record or view does not exist.
      </p>
      <Link
        href="/dashboard"
        className="inline-block px-4 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity"
      >
        Return to Tables
      </Link>
    </div>
  );
}
