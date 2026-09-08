import Link from "next/link";

export default function MatterNotFound() {
  return <div className="space-y-4"><h1 className="text-2xl font-bold">התיק לא נמצא</h1>
    <p>התיק אינו קיים או אינו זמין בחשבון זה.</p><Link className="text-teal-700 underline" href="/clients">חזרה ללקוחות</Link></div>;
}
