import { Search, X } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { TopNavigationMenu } from '@/components/TopNavigationMenu';
import { UserMenu } from '@/components/UserMenu';

type AppTopBarProps = {
  eyebrow: string;
  title: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

export function AppTopBar({
  eyebrow,
  title,
  searchPlaceholder = '',
  searchValue,
  onSearchChange,
}: AppTopBarProps) {
  const isSearchable = onSearchChange !== undefined;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--app-border)] bg-[var(--app-panel)]/85 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-[var(--app-muted)]">{eyebrow}</p>
          <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
        </div>

        <div className="ml-auto hidden h-10 min-w-0 max-w-xl flex-1 md:flex">
          {isSearchable ? (
            <div className="relative flex h-full w-full items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 shrink-0 text-[var(--app-muted)]" />
              <input
                type="text"
                value={searchValue ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-full w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] pl-9 pr-8 text-sm text-[var(--app-text)] placeholder:text-[var(--app-muted)] outline-none focus:border-[var(--app-brand)] transition"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 rounded p-0.5 text-[var(--app-muted)] hover:text-[var(--app-text)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex h-full w-full items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-alt)] px-3 text-sm text-[var(--app-muted)]">
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">{searchPlaceholder}</span>
            </div>
          )}
        </div>

        <ThemeToggle />
        <LanguageSwitcher />
        <UserMenu />
        <TopNavigationMenu />
      </div>
    </header>
  );
}
