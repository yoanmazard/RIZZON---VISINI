import { BrandLogo } from '@/components/brand/brand-logo';
import { cn } from '@/lib/utils';

export function AuthShell({
  children,
  eyebrow = 'Acquisition immobilière',
  title = 'Projet RIZZON',
  description,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  return (
    <main className="min-h-screen bg-[var(--gerimalp-bg-2)] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center gap-8">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <BrandLogo priority />
          </div>
          <div className="space-y-2">
            <p className="eyebrow text-[var(--gerimalp-fg-3)]">{eyebrow}</p>
            <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--gerimalp-blue-primary)]">
              {title}
            </h1>
            {description && (
              <p className="text-sm leading-relaxed text-[var(--gerimalp-fg-2)]">{description}</p>
            )}
          </div>
        </div>

        <div className={cn('rounded-[var(--gerimalp-radius-lg)] border border-[var(--gerimalp-line-1)] bg-white p-6 shadow-[var(--gerimalp-shadow-sm)]')}>
          {children}
        </div>

        <p className="baseline text-center text-[10px] text-[var(--gerimalp-fg-3)]">
          Notre indépendance est notre fierté et votre garantie
        </p>
      </div>
    </main>
  );
}
