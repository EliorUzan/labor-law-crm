"use client";

export default function ClientsError({ reset }: { reset: () => void }) {
  return <div className="space-y-3" role="alert"><h1 className="text-2xl font-bold">לא ניתן לטעון את פרטי הלקוחות</h1>
    <p>אירעה תקלה. אפשר לנסות שוב.</p><button className="rounded-lg bg-teal-700 px-4 py-2 text-white" onClick={reset}>נסה שוב</button></div>;
}
