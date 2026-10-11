import { PageTitle } from "@/components/ui";

export function StaticPage({ title, subtitle, sections }: { title: string; subtitle?: string; sections: [string, string][] }) {
  return (
    <>
      <PageTitle title={title} subtitle={subtitle} />
      <div className="mx-auto max-w-4xl space-y-5 px-4 py-10">
        {sections.map(([h, t]) => (
          <section key={h} className="card p-6"><h2 className="mb-2 text-lg font-extrabold">{h}</h2><p className="whitespace-pre-line leading-relaxed text-slate-600">{t}</p></section>
        ))}
      </div>
    </>
  );
}
