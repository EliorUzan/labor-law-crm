import Image from "next/image";

type FirmBrandProps = {
  compact?: boolean;
};

/** The office mark stays deliberately restrained so legal work remains primary. */
export function FirmBrand({ compact = false }: Readonly<FirmBrandProps>) {
  const logoSize = compact ? { width: 27, height: 38 } : { width: 36, height: 51 };

  return (
    <div className="flex items-center gap-3">
      <span className="flex shrink-0 items-center justify-center border-e border-[#6d255f]/25 pe-3">
        <Image
          alt=""
          aria-hidden="true"
          className="h-auto w-auto"
          height={logoSize.height}
          preload
          src="/firm-logo.png"
          width={logoSize.width}
        />
      </span>
      <p className={compact ? "max-w-[230px] text-sm font-semibold leading-snug text-stone-900" : "text-base font-semibold leading-snug text-stone-900"}>
        שמואל-אוזן משרד עורכי דין
      </p>
    </div>
  );
}
