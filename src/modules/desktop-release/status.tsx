"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { desktopReleaseSchema, type DesktopRelease } from "./metadata";
import { compareDesktopVersions, detectDesktopVersion, type DesktopDetection } from "./version";

export function DesktopVersionStatus({ detail = false }: { detail?: boolean }) {
  const [detection, setDetection] = useState<DesktopDetection | null>(null);
  const [release, setRelease] = useState<DesktopRelease | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    let pending = false;
    let lastCheck = 0;
    let controller: AbortController | undefined;
    async function check(force = false) {
      if (pending || (!force && Date.now() - lastCheck < 60_000)) return;
      pending = true;
      lastCheck = Date.now();
      const detected = await detectDesktopVersion();
      if (!active) return;
      setDetection(detected);
      if (detected.kind === "web") { setChecking(false); pending = false; return; }
      controller = new AbortController();
      const timer = setTimeout(() => controller?.abort(), 8000);
      try {
        const response = await fetch("/api/desktop/release", { cache: "no-store", signal: controller.signal });
        const parsed = response.ok ? desktopReleaseSchema.safeParse(await response.json()) : null;
        if (active) setRelease(parsed?.success ? parsed.data : null);
      } catch {
        if (active) setRelease(null);
      } finally {
        clearTimeout(timer);
        pending = false;
        if (active) setChecking(false);
      }
    }
    void check(true);
    const onFocus = () => { void check(); };
    window.addEventListener("focus", onFocus);
    return () => { active = false; controller?.abort(); window.removeEventListener("focus", onFocus); };
  }, []);

  if (!detection || detection.kind === "web") return detail ? <p className="text-sm text-stone-600">{detection ? "האפליקציה פתוחה בדפדפן." : "בודק גרסת אפליקציה…"}</p> : null;
  const comparison = detection.kind === "desktop" && release ? compareDesktopVersions(detection.info.version, release.version) : null;
  if (!detail && comparison !== -1) return null;
  return <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600" role="status">
    {detail && (detection.kind === "desktop"
      ? <p>גרסה מותקנת: <bdi>{detection.info.version}</bdi> · <bdi>{detection.info.platform === "darwin" ? "macOS" : "Windows"} {detection.info.arch}</bdi></p>
      : <p>לא ניתן לזהות את הגרסה המותקנת. ייתכן שזו גרסת שולחן עבודה ישנה.</p>)}
    {comparison === -1 ? <p>גרסה חדשה זמינה: <bdi>{release?.version}</bdi>. <Link className="underline" href="/downloads">להורדה ולהתקנה ידנית</Link></p>
      : detail && <p>{checking ? "בודק גרסה זמינה…" : comparison === 0 ? "הגרסה המותקנת עדכנית." : comparison === 1 ? "הגרסה המותקנת חדשה מהגרסה המפורסמת." : "בדיקת הגרסה הזמינה אינה זמינה כרגע. אפשר לנסות שוב בטעינת העמוד."}</p>}
  </div>;
}
