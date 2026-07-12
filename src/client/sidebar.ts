// Mobile sidebar drawer toggle.

export function initSidebarToggle(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-sidebar-toggle]');
  if (!toggle) return;
  const backdrop = document.querySelector<HTMLElement>('[data-sidebar-backdrop]');
  const sidebar = document.querySelector<HTMLElement>('.sidebar-left');
  if (!sidebar) return;

  const setOpen = (open: boolean, restoreFocus = true): void => {
    const wasOpen = document.body.classList.contains('sidebar-open');
    document.body.classList.toggle('sidebar-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    const background = document.querySelectorAll<HTMLElement>(
      '.content, .sidebar-right, .powered-by-mdgarden, .mobile-bar .site-title',
    );
    for (const element of background) element.inert = open;

    if (open) {
      const first = sidebar.querySelector<HTMLElement>('a, button');
      window.requestAnimationFrame(() => first?.focus());
    } else if (wasOpen && restoreFocus) {
      toggle.focus();
    }
  };

  toggle.addEventListener('click', () => {
    setOpen(!document.body.classList.contains('sidebar-open'));
  });
  backdrop?.addEventListener('click', () => setOpen(false));
  sidebar?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false, false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
      setOpen(false);
      return;
    }
    if (e.key !== 'Tab' || !document.body.classList.contains('sidebar-open')) return;

    const focusable = Array.from(
      sidebar.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  window.matchMedia('(min-width: 80.01rem)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false, false);
  });
}

export function initThemeToggle(): void {
  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.theme-toggle-btn');
    if (!btn) return;

    let theme = document.documentElement.dataset.theme;
    if (!theme) {
      theme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem('mdgarden-theme', nextTheme);
  });
}
