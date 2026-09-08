import Link from "next/link";

export default function ClientNotFound() {
  return <div className="space-y-3"><h1 className="text-2xl font-bold">הלקוח לא נמצא</h1>
    <p className="text-stone-600">הלקוח אינו זמין בחשבון זה.</p><Link className="text-teal-700 underline" href="/clients">חזרה ללקוחות</Link></div>;
}
