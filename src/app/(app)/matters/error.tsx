"use client";

export default function MatterError({ reset }: { reset: () => void }) {
  return <div className="space-y-4"><h1 className="text-2xl font-bold">לא ניתן לטעון את התיק</h1>
    <p>אירעה שגיאה. נסו שוב.</p><button className="text-teal-700 underline" onClick={reset}>ניסיון נוסף</button></div>;
}
