// Highlights the table-of-contents entry for whichever heading is in view.

export function initToc(): void {
  const tocLinks = document.querySelectorAll('.toc-list a');
  if (tocLinks.length === 0) return;

  // Treat a heading as "active" once it's past the top 50px, before it's 60% down the viewport.
  const observerOptions = { root: null, rootMargin: '-50px 0px -60% 0px', threshold: 0 };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const observer = new IntersectionObserver((entries) => {
    let activeId = '';
    for (const entry of entries) {
      if (entry.isIntersecting) activeId = entry.target.getAttribute('id') || '';
    }
    if (!activeId) return;

    tocLinks.forEach((link) => link.classList.remove('is-active'));
    const activeLink = document.querySelector(`.toc-list a[href="#${CSS.escape(activeId)}"]`);
    if (activeLink) {
      activeLink.classList.add('is-active');
      activeLink.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }, observerOptions);

  // Observe the heading behind each TOC link.
  tocLinks.forEach((link) => {
    const hash = new URL(link.getAttribute('href') || '', window.location.href).hash;
    if (!hash) return;
    const target = document.getElementById(hash.slice(1));
    if (target) observer.observe(target);
  });
}
