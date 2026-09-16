import { requireAuthenticatedUserId } from "@/lib/auth";
import { getDesktopRelease } from "@/modules/desktop-release/config";
import { DesktopVersionStatus } from "@/modules/desktop-release/status";

export default async function DownloadsPage() {
  await requireAuthenticatedUserId();
  const release = getDesktopRelease();
  const linkClass = "inline-flex rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm font-medium hover:bg-stone-50";
  return <div className="max-w-3xl space-y-6">
    <div className="space-y-2">
      <h1 className="text-3xl font-bold">האפליקציה למחשב</h1>
      <p className="text-stone-600">אותה מערכת ואותו חשבון, בחלון נפרד במחשב. נדרש חיבור לאינטרנט. אין צורך ב-Terminal, ב-npm או בכלי פיתוח.</p>
    </div>
    <DesktopVersionStatus detail />
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5" aria-labelledby="download-title">
      <h2 className="text-xl font-semibold" id="download-title">הגרסה האחרונה להורדה</h2>
      {release ? <>
        <p>גרסה <bdi>{release.version}</bdi></p>
        <div className="flex flex-wrap gap-3">
          <a className={linkClass} href={release.downloads.windows} target="_blank" rel="noreferrer">Windows · מתקין ‎.exe (x64)</a>
          <a className={linkClass} href={release.downloads.macArm64} target="_blank" rel="noreferrer">macOS · Apple Silicon (M1 ומעלה)</a>
          <a className={linkClass} href={release.downloads.macX64} target="_blank" rel="noreferrer">macOS · Intel</a>
        </div>
        <p className="text-sm text-stone-600">ב-Mac: בתפריט Apple ← אודות Mac זה, בדקו אם מופיע שבב Apple או מעבד Intel. הורדת Mac היא קובץ ZIP המכיל את האפליקציה ‎.app.</p>
      </> : <p className="text-stone-600">ההורדות עדיין אינן זמינות. קישורי ההורדה יוצגו כאן לאחר פרסום הגרסה הראשונה.</p>}
    </section>
    <section className="space-y-3" aria-labelledby="mac-install-title">
      <h2 className="text-xl font-semibold" id="mac-install-title">התקנה ב-macOS</h2>
      <ol className="list-decimal space-y-2 ps-5">
        <li>הורידו את הקובץ המתאים, לחצו עליו פעמיים לחילוץ וגררו את <bdi>Labor Law CRM.app</bdi> לתיקיית Applications (יישומים).</li>
        <li>פתחו את האפליקציה. היא אינה חתומה ואינה מאומתת על ידי Apple, ולכן ייתכן שתיחסם בפתיחה הראשונה.</li>
        <li>לאחר ניסיון הפתיחה, עברו אל הגדרות המערכת ← פרטיות ואבטחה (<bdi>Privacy &amp; Security</bdi>), ולחצו על <bdi>Open Anyway</bdi> ליד הודעת החסימה. אשרו את הפתיחה והזינו סיסמת מחשב אם תתבקשו.</li>
      </ol>
      <p className="text-sm text-stone-600">אשרו רק את האפליקציה שהורדתם מהעמוד הזה ושמקורה מוכר לכם. במחשב מנוהל או כאשר אין אפשרות לפתוח בכל זאת, פנו למנהל המחשב והמשיכו בינתיים בדפדפן. אין צורך לבטל את Gatekeeper או להשתמש בפקודות Terminal. ההתקנה ללא חתימה אינה מובטחת בכל תצורת macOS.</p>
      <a className="text-sm underline" href="https://support.apple.com/102445" target="_blank" rel="noreferrer">הנחיות Apple לפתיחת אפליקציה ממפתח לא מזוהה</a>
    </section>
    <section className="space-y-3" aria-labelledby="windows-install-title">
      <h2 className="text-xl font-semibold" id="windows-install-title">התקנה ב-Windows</h2>
      <ol className="list-decimal space-y-2 ps-5">
        <li>הורידו ופתחו את קובץ ה-‎.exe. אם הדפדפן מזהיר שהקובץ אינו מוכר, בחרו לשמור אותו רק לאחר שבדקתם שמקורו בעמוד הזה.</li>
        <li>אם מופיעה הודעת <bdi>Windows protected your PC</bdi>, לחצו על <bdi>More info</bdi> (מידע נוסף) ואז על <bdi>Run anyway</bdi> (הפעל בכל זאת), אם האפשרות מוצעת. המפרסם יוצג כלא מוכר משום שהמתקין אינו חתום.</li>
        <li>השלימו את אשף ההתקנה ופתחו את <bdi>Labor Law CRM</bdi> מתפריט ההתחלה או מקיצור הדרך בשולחן העבודה.</li>
      </ol>
      <p className="text-sm text-stone-600">Smart App Control, מצב S או מדיניות ארגונית עשויים למנוע הפעלה ללא אפשרות עקיפה. במקרה כזה פנו למנהל המחשב או השתמשו בדפדפן; אין צורך לכבות הגנות מערכת.</p>
      <a className="text-sm underline" href="https://support.microsoft.com/en-us/windows/security/threat-malware-protection/smart-app-control-frequently-asked-questions" target="_blank" rel="noreferrer">מידע של Microsoft על Smart App Control</a>
    </section>
    <section className="space-y-2 border-t border-stone-200 pt-5">
      <h2 className="text-xl font-semibold">עדכון ידני</h2>
      <p>אין עדכון אוטומטי. כאשר מופיעה הודעה על גרסה חדשה, הורידו אותה, סגרו את האפליקציה והתקינו מחדש. ב-Mac החליפו את האפליקציה בתיקיית Applications; ב-Windows הפעילו את המתקין החדש באותה תיקיית התקנה. ההתקנה אינה מוחקת את נתוני ה-CRM.</p>
    </section>
  </div>;
}
