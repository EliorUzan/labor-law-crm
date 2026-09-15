"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { getCrmPlatformCapabilities } from "@/lib/desktop-bridge";
import { panelClass, buttonClass, inputClass } from "@/modules/clients/presentation";
import { beginRootVerification, documentSettings, finishRootVerification, setDriveRoot } from "./actions";
import { desktopDocuments } from "./desktop";

const oauthMessages: Record<string, string> = {
  connected: "Google Drive חובר בהצלחה.",
  "account-mismatch": "יש להתחבר לאותו חשבון Google Drive שכבר הוגדר, כדי לשמור על שיוך הקבצים.",
  "api-disabled": "האישור בחשבון Google התקבל, אך Google Drive API אינו מופעל בפרויקט Google Cloud. הפעילו אותו דרך APIs & Services → Library → Google Drive API → Enable, המתינו כמה דקות וחברו שוב.",
  "oauth-client": "Google דחה את פרטי OAuth של השרת. יש לבדוק את Client ID ו-Client Secret בהגדרות השרת.",
  "token-exchange": "Google לא השלים את החלפת קוד ההרשאה. התחילו חיבור חדש ונסו שוב; אם הבעיה נמשכת, בדקו את הגדרות OAuth בשרת.",
  "drive-access": "הכניסה ל-Google הצליחה, אך הגישה ל-Drive נכשלה. בדקו שניתנה הרשאת Google Drive ושחיבור השרת זמין, ואז חברו שוב.",
  "save-failed": "הגישה ל-Google Drive הצליחה, אך שמירת החיבור במערכת נכשלה. יש לבדוק את חיבור מסד הנתונים ומיגרציות המסמכים בשרת.",
  "session-expired": "בקשת החיבור פגה או נפתחה בדפדפן אחר. התחילו חיבור חדש והשלימו אותו באותו דפדפן.",
  "consent-denied": "הרשאת Google Drive לא הושלמה. התחילו חיבור חדש ואשרו את הגישה ל-Drive.",
  "refresh-missing": "Google לא סיפק הרשאה לחיבור מתמשך. התחילו חיבור חדש ואשרו שוב את הגישה ל-Drive.",
  failed: "החיבור ל-Google Drive לא הושלם. נסו שוב.",
};

export function DocumentSettings({ oauthStatus, callbackUrl }: { oauthStatus?: string; callbackUrl: string }) {
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof documentSettings>> | null>(null);
  const [desktop, setDesktop] = useState(false);
  const [localRoot, setLocalRoot] = useState<string | null>(null);
  const [rootUrl, setRootUrl] = useState("");
  const [message, setMessage] = useState(oauthStatus && Object.hasOwn(oauthMessages, oauthStatus) ? oauthMessages[oauthStatus] : "");
  const [pending, startTransition] = useTransition();
  const [verificationReady, setVerificationReady] = useState(false);
  useEffect(() => {
    let active = true;
    void Promise.all([documentSettings(), getCrmPlatformCapabilities()]).then(async ([value, platform]) => {
      if (!active) return;
      setSettings(value); setDesktop(platform.platform === "desktop");
      if (platform.platform === "desktop") {
        try { const local = await desktopDocuments.settings(); if (active) setLocalRoot(local.localRoot); } catch { /* No cloud root yet. */ }
      }
    });
    return () => { active = false; };
  }, []);
  function action(operation: () => Promise<void>) {
    startTransition(async () => { setMessage(""); try { await operation(); setSettings(await documentSettings()); } catch (error) { setMessage(error instanceof Error ? error.message : "הפעולה נכשלה."); } });
  }
  const value = settings?.ok ? settings.value : null;
  return <section className={panelClass}>
    <h2 className="text-xl font-bold">מסמכים ו-Google Drive</h2>
    <p className="mt-2 text-sm text-stone-600">חברו את Drive ובחרו תיקיית בסיס. מסמכים קיימים יישארו במקומם; מסמכים חדשים ייווצרו בתיקיית CRM לפי הלקוח והתיק.</p>
    <details aria-label="מדריך חיבור Google Drive" open={!value?.connected} className="mt-4 rounded-lg bg-teal-50 p-4 text-sm leading-7">
      <summary className="cursor-pointer text-base font-semibold">איך מחברים את המסמכים? מדריך שלב אחר שלב</summary>
      <ol className="mt-2 list-decimal space-y-2 ps-5">
        <li><strong>מתחברים לחשבון Google.</strong> לחצו למטה על „חיבור Google Drive”, בחרו את החשבון שבו שמורים מסמכי המשרד ואשרו את הגישה. בסיום תחזרו לכאן ותראו „Google Drive מחובר”. ביישום למחשב החיבור נפתח בדפדפן: אם נדרש, התחברו גם שם ל-CRM, לחצו על חיבור Google Drive, ובסיום חזרו ליישום ולחצו על „רענון מצב החיבור”.</li>
        <li><strong>בוחרים תיקייה למסמכי המשרד.</strong> פתחו את <a className="text-teal-800 underline" href="https://drive.google.com" target="_blank" rel="noreferrer">Google Drive</a> בחשבון שבחרתם, ולחצו פעמיים על התיקייה הרצויה. העתיקו את הכתובת משורת הכתובת בראש הדפדפן והדביקו אותה בשדה „קישור לתיקיית הבסיס” למטה. לחצו על „שמירת תיקייה”. אין צורך לשנות את הרשאות השיתוף או להפוך את התיקייה לציבורית.</li>
        <li><strong>מוסיפים מסמכים מתוך התיקייה שנבחרה.</strong> פתחו לקוח או תיק ב-CRM, עברו לאזור „מסמכים” ולחצו על „בחירה מ-Drive”. המערכת קוראת קבצים מתוך התיקייה שבחרתם ומתיקיות המשנה שלה. מסמכים קיימים נשארים במקומם; מסמכים חדשים נשמרים בתיקיית CRM לפי הלקוח והתיק.</li>
      </ol>
      <details className="mt-3 border-t border-teal-200 pt-3" open={desktop}>
        <summary className="cursor-pointer font-semibold">משתמשים ביישום למחשב? כך מפעילים פתיחה ב-Word וב-Excel</summary>
        <ol className="mt-2 list-decimal space-y-2 ps-5">
          <li>ודאו ש-<a className="text-teal-800 underline" href="https://support.google.com/drive/answer/10838124?hl=he" target="_blank" rel="noreferrer">Google Drive למחשב מותקן ופועל</a>, ושאתם מחוברים בו לאותו חשבון Google. בסייר הקבצים אמורה להופיע תיקיית Google Drive ובה מסמכי המשרד.</li>
          <li>בהגדרות של יישום ה-CRM למחשב לחצו על „1. הכנת אימות סנכרון”. המערכת תיצור קובץ בדיקה קטן. המתינו עד ש-Google Drive יסיים לסנכרן את הקבצים.</li>
          <li>לחצו על „2. בחירת תיקייה ואימות” ובחרו בסייר הקבצים את אותה תיקייה שבחרתם ב-Drive. בחרו בתיקיית המשרד עצמה, ולא בתיקיית CRM שבתוכה. קובץ הבדיקה יימחק לאחר האימות.</li>
          <li>לאחר האימות, ליד כל מסמך מופיע „פתח קובץ” לפתיחה בתוכנה המתאימה במחשב, למשל Word, Excel או קורא PDF. „פתיחה ב-Google Drive” פותחת אותו בדפדפן. מסמכים שנוצרו כ-Google Docs או Google Sheets נפתחים ב-Google; לפתיחה ב-Office השתמשו בקובצי Word או Excel.</li>
        </ol>
      </details>
      <details className="mt-3 border-t border-teal-200 pt-3">
        <summary className="cursor-pointer font-semibold">החיבור או פתיחת הקובץ לא הצליחו?</summary>
        <ul className="mt-2 list-disc space-y-2 ps-5">
          <li>אם Google או ה-CRM מציגים שגיאת הרשאה, פנו למי שהתקין עבורכם את המערכת והעבירו את נוסח השגיאה. אין צורך למסור סיסמה. הגדרות החיבור הראשוניות בחשבון Google Cloud הן באחריות מתקין המערכת.</li>
          <li>אם התיקייה לא אומתה או הקובץ לא נמצא במחשב, ודאו ש-Drive למחשב פועל, המתינו לסיום הסנכרון ובחרו שוב את אותה תיקייה.</li>
          <li>אם היישום מבקש הפעלה מחדש, שמרו עבודה פתוחה, סגרו לגמרי את יישום ה-CRM ופתחו אותו שוב. רענון הדף בלבד אינו מספיק.</li>
        </ul>
      </details>
      <details className="mt-3 border-t border-teal-200 pt-3" open={!value?.configured}>
        <summary className="cursor-pointer font-semibold">למנהל/ת המערכת בלבד: הכנה חד-פעמית של החיבור ל-Google</summary>
        <p className="mt-2">השלבים הבאים מבוצעים פעם אחת עבור מערכת ה-CRM כולה. ה-Client ID וה-Client Secret מזהים את מערכת ה-CRM מול Google — הם אינם מזהים משתמש מסוים. משתמשים לא צריכים ליצור מזהה או סוד משלהם. אותו זוג מזהים משמש את כל משתמשי המשרד.</p>
        <ol className="mt-2 list-decimal space-y-2 ps-5">
          <li>פתחו את <a className="text-teal-800 underline" href="https://console.cloud.google.com" target="_blank" rel="noreferrer">Google Cloud Console</a>, צרו פרויקט חדש או בחרו בפרויקט הקיים של המשרד.</li>
          <li>עברו אל <strong>APIs &amp; Services → Library</strong>, חפשו <strong>Google Drive API</strong> ולחצו <strong>Enable</strong>. חשוב: זהו Google Drive API, ולא Google Drive Activity API.</li>
          <li>עברו אל <strong>Google Auth Platform → Audience</strong>. אם משתמשים בחשבונות Gmail אישיים, בחרו <strong>External</strong>. כל עוד האפליקציה במצב Testing, הוסיפו תחת <strong>Test users</strong> כל אדם שאמור להתחבר ל-Drive. כאשר מצטרף משתמש חדש, מוסיפים כאן את כתובת ה-Gmail שלו — אין צורך ליצור או להחליף Client ID או Client Secret.</li>
          <li>עברו אל <strong>Google Auth Platform → Clients</strong>, צרו <strong>OAuth client</strong> מסוג <strong>Web application</strong>, והוסיפו תחת Authorized redirect URIs את הכתובת המדויקת: <code dir="ltr" className="break-all rounded bg-white px-1">{callbackUrl}</code>.</li>
          <li>העתיקו את ה-Client ID ואת ה-Client Secret אל <strong>Vercel → Project → Settings → Environment Variables</strong>, בסביבת Production, תחת השמות <code>GOOGLE_DRIVE_CLIENT_ID</code> ו-<code>GOOGLE_DRIVE_CLIENT_SECRET</code>. הוסיפו גם <code>NEXT_PUBLIC_APP_URL</code> עם כתובת המערכת, ומפתח הצפנה קבוע בשם <code>DOCUMENT_TOKEN_ENCRYPTION_KEY</code>. אל תזינו את הסוד בשדה כלשהו ב-CRM ואל תשתפו אותו בצ׳אט. כדי להוסיף משתמש חדש, משאירים את שני המשתנים האלה כפי שהם.</li>
          <li>בצעו Redeploy ב-Vercel. לאחר מכן כל משתמש נכנס ל-CRM עם החשבון שלו, לוחץ על „חיבור Google Drive”, ומאשר את חשבון Google שלו. החיבור והתיקייה נשמרים בנפרד עבור אותו משתמש בלבד.</li>
        </ol>
        <p className="mt-3 text-stone-700">לדוגמה: כתובת Gmail של משתמש היא חשבון Google שמקבל גישה בזמן בדיקה; היא אינה ה-Client ID ואינה נשמרת במשתני הסביבה. משתני הסביבה מכילים רק את ההגדרות המשותפות של מערכת ה-CRM. אם משתמש יצר Client ID משלו, אין להוסיף אותו ל-Vercel או להחליף בו את הקיים — יש להוסיף את כתובת ה-Gmail שלו לרשימת Test users של פרויקט Google הקיים.</p>
      </details>
    </details>
    {settings && !settings.ok && <p role="alert" className="mt-3 text-red-700">{settings.error}</p>}
    {value && !value.configured && <p className="mt-3 text-amber-800">חיבור Google Drive עדיין לא הוכן בצד השרת של מערכת זו. מנהל/ת המערכת צריך/ה להשלים את השלבים „הכנה חד-פעמית של החיבור ל-Google” במדריך למעלה; לאחר מכן כל משתמש יוכל לחבר את חשבון Google האישי שלו.</p>}
    {value?.configured && <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3"><span>{value.connected ? "Google Drive מחובר" : "Google Drive אינו מחובר"}</span>
        <a className={buttonClass} href={desktop ? "/settings" : "/api/documents/google/start"} target={desktop ? "_blank" : undefined} rel="noreferrer">{desktop ? "חיבור Google Drive בדפדפן" : value.connected ? "חיבור מחדש" : "חיבור Google Drive"}</a>
        <button className={buttonClass} disabled={pending} onClick={() => action(async () => { setMessage("מצב החיבור עודכן."); })}>רענון מצב החיבור</button>
      </div>
      {desktop && <p className="text-sm text-stone-600">את ההרשאה לחשבון Google משלימים בדפדפן הרגיל. לאחר מכן חזרו לכאן ורעננו את מצב החיבור.</p>}
      {value.connected && <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); action(async () => { const result = await setDriveRoot(rootUrl); if (!result.ok) throw new Error(result.error); setMessage("תיקיית Drive נשמרה ותיקיית CRM מוכנה."); }); }}>
        {value.rootName && <p>תיקיית Drive: <bdi>{value.rootName}</bdi></p>}
        <label className="block text-sm">קישור לתיקיית הבסיס ב-Google Drive<input className={`${inputClass} mt-1`} dir="ltr" value={rootUrl} onChange={(event) => setRootUrl(event.target.value)} placeholder="https://drive.google.com/drive/folders/…" required /></label>
        <div className="flex flex-wrap gap-2"><button disabled={pending} className={buttonClass}>שמירת תיקייה</button><button type="button" className={buttonClass} onClick={() => setRootUrl("root")}>שימוש בכל האחסון שלי</button></div>
      </form>}
      {value.rootId && (desktop ? <div className="space-y-3 border-t border-stone-200 pt-4">
        <h3 className="font-semibold">תיקיית Drive במחשב זה</h3>
        {localRoot && <p className="break-all text-sm" dir="ltr">{localRoot}</p>}
        <p className="text-sm text-stone-600">האימות ייצור קובץ זמני ב-Drive. המתינו לסנכרון, ואז בחרו במחשב את אותה תיקייה. תיקייה רגילה או תיקיית Drive אחרת תידחה. קובץ האימות יימחק בסיום.</p>
        <div className="flex flex-wrap gap-2"><button className={buttonClass} disabled={pending} onClick={() => action(async () => { const result = await beginRootVerification(); if (!result.ok) throw new Error(result.error); setVerificationReady(true); setMessage("קובץ האימות נוצר. המתינו שיופיע בתיקיית Drive במחשב, ואז לחצו על בחירת תיקייה ואימות."); })}>1. הכנת אימות סנכרון</button>
          <button className={buttonClass} disabled={pending || !verificationReady} onClick={() => action(async () => { const result = await desktopDocuments.chooseRoot(); if (!result) return; setLocalRoot(result.localRoot); const cleanup = await finishRootVerification(); setVerificationReady(false); setMessage(cleanup.ok ? "תיקיית Google Drive אומתה ונשמרה במחשב זה." : `התיקייה אומתה ונשמרה. ${cleanup.error} קובץ האימות הזמני עדיין ב-Drive.`); })}>2. בחירת תיקייה ואימות</button>
          {verificationReady && <button className={buttonClass} disabled={pending} onClick={() => action(async () => { const result = await finishRootVerification(); if (!result.ok) throw new Error(result.error); setVerificationReady(false); setMessage("האימות בוטל והקובץ הזמני נמחק."); })}>ביטול אימות</button>}
        </div>
      </div> : <p className="text-sm text-stone-600">בחירת תיקייה מקומית ופתיחה ב-Word או Excel זמינות ביישום למחשב. בדפדפן בוחרים מסמכים מתוך Drive והם נפתחים ביישומי Google.</p>)}
    </div>}
    {pending && <p role="status" className="mt-3 text-sm">מבצע פעולה…</p>}
    {message && <p role="status" className="mt-3 whitespace-pre-wrap text-sm">{message}</p>}
    <Link className="mt-5 inline-block text-sm text-teal-700 underline" href="/clients">חזרה ללקוחות</Link>
  </section>;
}
