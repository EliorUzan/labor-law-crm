export function PlaceholderPage({ title, description }: Readonly<{ title: string; description: string }>) {
  return (
    <section className="max-w-2xl rounded-xl border border-stone-200 bg-white p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-stone-900">{title}</h1>
      <p className="mt-3 leading-7 text-stone-600">{description}</p>
    </section>
  );
}
