export default function HomePage() {
  return (
    <main className="min-h-screen bg-stone-50 px-5 py-8 sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col justify-center rounded-2xl border border-stone-200 bg-white p-8 shadow-sm sm:p-12">
        <p className="text-sm font-medium text-teal-700">ניהול משרד</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          מערכת ניהול תיקים לדיני עבודה
        </h1>
        <p className="mt-5 max-w-xl leading-8 text-stone-600">
          התשתית הטכנית מוכנה. מודולי הלקוחות, התיקים, המשימות והכספים
          יתווספו בשלבים הבאים.
        </p>
      </section>
    </main>
  );
}
