export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-[80vh] overflow-hidden bg-brand-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/hero2.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2">
        <div className="hidden text-white md:block">
          <h1 className="text-4xl font-bold leading-tight">Travel more,<br />spend less.</h1>
          <ul className="mt-6 space-y-3 text-lg">
            <li>✓ Exclusive member-only fares</li>
            <li>✓ Manage & cancel bookings instantly</li>
            <li>✓ Instant refunds to your wallet</li>
          </ul>
        </div>
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-brand-900">{title}</h2>
          <p className="mb-6 mt-1 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
