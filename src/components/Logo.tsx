import Link from "next/link";

export function Logo({ name, light = false }: { name: string; light?: boolean }) {
  const [a, ...rest] = name.split(" ");
  return (
    <Link href="/" className="flex items-center gap-2" aria-label={name}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" className="h-9 w-9" />
      <span className={`text-xl font-bold tracking-tight ${light ? "text-white" : "text-brand-900"}`}>
        {a}
        <span className="text-accent-500">{rest.length ? " " + rest.join(" ") : ""}</span>
      </span>
    </Link>
  );
}
