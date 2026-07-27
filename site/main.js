(() => {
  const carousel = document.querySelector('[data-carousel]');
  if (carousel) {
    const track = carousel.querySelector('.carousel-track');
    const cards = [...carousel.querySelectorAll('.surface-card')];
    const dots = [...carousel.querySelectorAll('.carousel-dots button')];
    const progress = document.createElement('div');
    progress.className = 'carousel-progress';
    progress.innerHTML = '<span></span>';
    carousel.querySelector('.carousel-controls').before(progress);
    let index = 0;
    const move = (next) => {
      index = (next + cards.length) % cards.length;
      const offset = index * (cards[0].getBoundingClientRect().width + 16);
      track.style.transform = `translateX(-${offset}px)`;
      cards.forEach((card, cardIndex) => card.classList.toggle('is-active', cardIndex === index));
      dots.forEach((dot, dotIndex) => dot.setAttribute('aria-selected', String(dotIndex === index)));
      progress.firstElementChild.style.width = `${((index + 1) / cards.length) * 100}%`;
    };
    carousel.querySelector('[data-prev]').addEventListener('click', () => move(index - 1));
    carousel.querySelector('[data-next]').addEventListener('click', () => move(index + 1));
    dots.forEach((dot, dotIndex) => dot.addEventListener('click', () => move(dotIndex)));
    carousel.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') move(index - 1);
      if (event.key === 'ArrowRight') move(index + 1);
    });
    let autoplay = window.setInterval(() => move(index + 1), 6000);
    const pause = () => window.clearInterval(autoplay);
    const resume = () => {
      pause();
      autoplay = window.setInterval(() => move(index + 1), 6000);
    };
    carousel.addEventListener('mouseenter', pause);
    carousel.addEventListener('mouseleave', resume);
    carousel.addEventListener('focusin', pause);
    carousel.addEventListener('focusout', resume);
    window.addEventListener('resize', () => move(index), {passive: true});
    move(0);
  }
  const demo = document.querySelector('[data-demo]');
  if (demo) {
    const output = demo.querySelector('[data-demo-output]');
    const status = demo.querySelector('[data-demo-status]');
    const tabs = [...demo.querySelectorAll('[data-demo-surface]')];
    const outputBySurface = {
      cli: '$ project-tool inspect --path src\n✓ validated against inspectSchema\n→ { "path": "src", "files": 18, "status": "ready" }',
      mcp: '{\n  "name": "inspect",\n  "arguments": { "path": "src" },\n  "result": { "files": 18, "status": "ready" }\n}',
      skill: '## inspect\n\nInspect a project path.\n\n- path: string (required)\n- result: { files, status }',
      command: '/inspect --path src\n\n→ command contract accepted\n→ result: ready'
    };
    const labelBySurface = {cli: 'CLI OUTPUT', mcp: 'MCP TOOL CALL', skill: 'SKILL MANIFEST', command: 'COMMAND OUTPUT'};
    const show = (surface) => {
      tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.demoSurface === surface)));
      output.textContent = outputBySurface[surface];
      status.textContent = labelBySurface[surface];
    };
    tabs.forEach((tab) => tab.addEventListener('click', () => show(tab.dataset.demoSurface)));
    demo.querySelector('[data-demo-run]').addEventListener('click', () => {
      demo.classList.add('is-running');
      status.textContent = 'VALIDATING CONTRACT…';
      window.setTimeout(() => {
        demo.classList.remove('is-running');
        show(tabs.find((tab) => tab.getAttribute('aria-selected') === 'true')?.dataset.demoSurface ?? 'cli');
      }, 420);
    });
  }
  const sections = [...document.querySelectorAll('main section[id]')];
  const links = [...document.querySelectorAll('.toc a')];
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) links.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
    });
  }, {rootMargin: '-20% 0px -65% 0px'});
  sections.forEach((section) => observer.observe(section));
})();
