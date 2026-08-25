/* ==========================================================================
   DG COBRANÇAS — script.js
   JavaScript vanilla, sem dependências externas.

   Blocos:
   1. Helpers
   2. Reveal on scroll (IntersectionObserver + stagger)
   3. Header on scroll (encolher + blur)
   4. SEÇÕES (comportamentos específicos entram abaixo)
   ========================================================================== */

(function () {
  "use strict";

  /* ========================================================================
     1. HELPERS
     ======================================================================== */

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  /** Stagger padrão entre elementos irmãos de um mesmo grupo (ms). */
  var STAGGER_STEP = 90;
  var STAGGER_MAX = 6; // a partir daqui o delay para de crescer

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call(
      (scope || document).querySelectorAll(selector)
    );
  }

  /* ========================================================================
     2. REVEAL ON SCROLL
     Elementos com [data-reveal] entram com fade + blur-to-focus + translateY.
     [data-reveal-group] no pai aplica delay incremental aos filhos revelados.
     [data-reveal-out] faz o elemento desaparecer suavemente ao sair pelo topo.
     ======================================================================== */

  function initReveal() {
    var targets = $$("[data-reveal]");
    if (!targets.length) return;

    // Sem suporte a IntersectionObserver ou com movimento reduzido:
    // mostra tudo imediatamente.
    if (!("IntersectionObserver" in window) || prefersReducedMotion.matches) {
      targets.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    // Aplica o stagger dos grupos antes de observar.
    $$("[data-reveal-group]").forEach(function (group) {
      var step = parseInt(group.getAttribute("data-reveal-group"), 10);
      if (isNaN(step)) step = STAGGER_STEP;

      $$("[data-reveal]", group).forEach(function (child, index) {
        // Delay explícito no HTML tem prioridade.
        if (child.hasAttribute("data-reveal-delay")) return;
        var steps = Math.min(index, STAGGER_MAX);
        child.style.setProperty("--reveal-delay", steps * step + "ms");
      });
    });

    // Delays declarados manualmente no HTML.
    $$("[data-reveal-delay]").forEach(function (el) {
      el.style.setProperty(
        "--reveal-delay",
        el.getAttribute("data-reveal-delay") + "ms"
      );
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var el = entry.target;

          if (entry.isIntersecting) {
            el.classList.add("is-animating", "is-visible");
            el.classList.remove("is-leaving");

            // Libera o will-change assim que a animação termina.
            el.addEventListener("transitionend", function onEnd() {
              el.classList.remove("is-animating");
              el.removeEventListener("transitionend", onEnd);
            });

            // Elementos comuns são revelados uma única vez.
            if (!el.hasAttribute("data-reveal-out")) {
              observer.unobserve(el);
            }
            return;
          }

          // Fade-out sutil apenas para quem optou e apenas ao sair pelo topo.
          if (
            el.hasAttribute("data-reveal-out") &&
            entry.boundingClientRect.top < 0
          ) {
            el.classList.add("is-leaving");
          }
        });
      },
      {
        // Dispara um pouco antes do elemento aparecer por completo.
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.12,
      }
    );

    targets.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ========================================================================
     3. HEADER ON SCROLL
     Encolhe e ganha fundo translúcido com blur após o primeiro scroll.
     ======================================================================== */

  function initHeader() {
    var header = $("[data-header]");
    if (!header) return;

    var SCROLL_THRESHOLD = 24;
    var ticking = false;
    var isScrolled = false;

    function update() {
      var shouldScroll = window.scrollY > SCROLL_THRESHOLD;

      if (shouldScroll !== isScrolled) {
        isScrolled = shouldScroll;
        header.classList.toggle("is-scrolled", isScrolled);
      }

      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    update();
  }

  /* ========================================================================
     4. SEÇÕES
     Comportamentos específicos de cada seção entram abaixo, na ordem do
     index.html (nav mobile, acordeão de dúvidas, carrossel etc.).
     ======================================================================== */

  /* ------------------------------------------------------------------------
     SEÇÃO: HEADER — drawer de navegação mobile
     A mesma <nav> do desktop vira overlay abaixo de 768px.
     ------------------------------------------------------------------------ */

  function initNav() {
    var toggle = $("[data-nav-toggle]");
    var nav = $("[data-nav]");
    if (!toggle || !nav) return;

    // Mesmo breakpoint do CSS: acima disso o drawer não existe.
    var desktop = window.matchMedia("(min-width: 768px)");
    var isOpen = false;

    function setOpen(open) {
      if (open === isOpen) return;
      isOpen = open;

      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      document.body.classList.toggle("is-nav-open", open);
    }

    toggle.addEventListener("click", function () {
      setOpen(!isOpen);
    });

    // Navegar para uma âncora fecha o drawer antes do scroll.
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !isOpen) return;
      setOpen(false);
      toggle.focus();
    });

    // Ao cruzar para o desktop, garante que a trava de scroll seja liberada.
    function onBreakpointChange(event) {
      if (event.matches) setOpen(false);
    }

    if (typeof desktop.addEventListener === "function") {
      desktop.addEventListener("change", onBreakpointChange);
    } else {
      desktop.addListener(onBreakpointChange); // Safari < 14
    }
  }

  /* ------------------------------------------------------------------------
     SEÇÃO: O QUE VOCÊ NÃO PRECISA CARREGAR SOZINHO — tabs verticais
     Ativa por hover, foco ou clique. O crossfade é todo CSS: aqui só
     alternamos .is-active e o estado ARIA.
     ------------------------------------------------------------------------ */

  function initTabs() {
    $$("[data-tabs]").forEach(function (group) {
      var tabs = $$("[data-tab]", group);
      var panes = $$("[data-pane]", group);
      if (!tabs.length || tabs.length !== panes.length) return;

      var activeIndex = 0;

      function activate(index) {
        if (index === activeIndex) return;
        activeIndex = index;

        tabs.forEach(function (tab, i) {
          var isActive = i === index;
          tab.classList.toggle("is-active", isActive);
          tab.setAttribute("aria-selected", String(isActive));
          // Roving tabindex: só a aba ativa entra na ordem de tabulação;
          // as demais são alcançadas pelas setas.
          tab.tabIndex = isActive ? 0 : -1;
        });

        panes.forEach(function (pane, i) {
          pane.classList.toggle("is-active", i === index);
        });
      }

      tabs.forEach(function (tab, index) {
        function select() {
          activate(index);
        }

        tab.addEventListener("mouseenter", select);
        tab.addEventListener("focus", select);
        tab.addEventListener("click", select);
      });

      // Setas / Home / End movem o foco, e o handler de focus ativa a aba.
      group.addEventListener("keydown", function (event) {
        var current = tabs.indexOf(document.activeElement);
        if (current === -1) return;

        var next;
        switch (event.key) {
          case "ArrowDown":
          case "ArrowRight":
            next = (current + 1) % tabs.length;
            break;
          case "ArrowUp":
          case "ArrowLeft":
            next = (current - 1 + tabs.length) % tabs.length;
            break;
          case "Home":
            next = 0;
            break;
          case "End":
            next = tabs.length - 1;
            break;
          default:
            return;
        }

        event.preventDefault();
        tabs[next].focus();
      });
    });
  }

  /* ------------------------------------------------------------------------
     SEÇÃO: COMO FUNCIONA — carrossel dirigido pelo scroll da página
     A seção fica fixada e o scroll vertical avança os cards na horizontal.
     Quando o último card chega, a fixação solta e a página volta a rolar.
     ------------------------------------------------------------------------ */

  function initCarousels() {
    $$("[data-carousel]").forEach(function (root) {
      var pin = $("[data-carousel-pin]", root);
      var sticky = $("[data-carousel-sticky]", root);
      var viewport = $("[data-carousel-viewport]", root);
      var track = $("[data-carousel-track]", root);
      var fill = $("[data-carousel-progress]", root);
      if (!pin || !sticky || !viewport || !track) return;

      var slides = $$("[data-carousel-slide]", track);
      var slideCount = slides.length || 1;
      var travel = 0;       // distância horizontal a percorrer, em px
      var pinTop = 0;       // topo do pin em coordenadas do documento
      var pinSpan = 0;      // scroll vertical consumido pela fixação, em px
      var isStatic = false; // true = sem fixação (movimento reduzido)

      /* Scroll vertical gasto por pixel de avanço horizontal. Abaixo de 1
         o trilho anda mais rápido que o dedo e a seção solta antes — era
         o 1:1 que fazia a fixação parecer travada. */
      var SCROLL_SPAN = 0.8;

      /* Quanto o trilho precisa andar para o último card encostar na
         margem direita. Medido pela geometria real do último card: o
         trilho não é mais um contêiner de rolagem, então scrollWidth
         colapsaria para a largura da caixa. */
      function measureTravel() {
        if (!slides.length) return 0;

        var previous = track.style.transform;
        track.style.transform = "none";

        var padRight = parseFloat(getComputedStyle(track).paddingRight) || 0;
        var lastRight = slides[slides.length - 1].getBoundingClientRect().right;
        var distance = lastRight + padRight - viewport.getBoundingClientRect().right;

        track.style.transform = previous;
        return Math.max(0, Math.round(distance));
      }

      /* --- Medição ---
         A altura do pin é a da tela mais o percurso a consumir: é esse
         excedente que o navegador gasta mantendo o bloco fixado. O topo
         do pin fica em cache para o scroll não precisar medir nada. */

      function measure() {
        isStatic = prefersReducedMotion.matches;
        root.classList.toggle("is-static", isStatic);

        if (isStatic) {
          pin.style.height = "";
          travel = 0;
          pinSpan = 0;
          render(true);
          return;
        }

        travel = measureTravel();
        pinSpan = Math.round(travel * SCROLL_SPAN);
        pinTop = pin.getBoundingClientRect().top + window.scrollY;
        pin.style.height = sticky.offsetHeight + pinSpan + "px";

        // Medir e redimensionar reposicionam na hora, sem deslizar.
        render(true);
      }

      /* --- Progresso ---
         Fixado: quanto do excedente do pin já passou pelo topo da tela,
         lido de window.scrollY para não medir layout a cada evento.
         Estático: a posição do scroller horizontal nativo. */

      function getProgress() {
        if (isStatic) {
          var max = viewport.scrollWidth - viewport.clientWidth;
          return max > 0 ? viewport.scrollLeft / max : 0;
        }

        if (pinSpan <= 0) return 0;
        var offset = window.scrollY - pinTop;
        return Math.min(1, Math.max(0, offset / pinSpan));
      }

      /* O scroll só define o alvo; quem suaviza o caminho até ele é a
         transição CSS do trilho. `instant` desliga a transição por um
         frame, para medição e resize não virarem um deslize. */
      function render(instant) {
        var progress = getProgress();

        if (!isStatic && travel > 0) {
          if (instant) track.style.transition = "none";

          track.style.transform =
            "translate3d(" + (-progress * travel).toFixed(2) + "px, 0, 0)";

          if (instant) {
            void track.offsetWidth; // aplica o salto antes de religar
            track.style.transition = "";
          }
        }

        if (fill) {
          // Começa em 1/N e termina em 1: lê como "etapa atual de N".
          fill.style.transform =
            "scaleX(" + (1 + progress * (slideCount - 1)) / slideCount + ")";
        }
      }

      function onScroll() {
        // Só escreve estilo: nada aqui força o navegador a medir layout,
        // então não precisa passar por requestAnimationFrame.
        render(false);
      }

      window.addEventListener("scroll", onScroll, { passive: true });
      // Só dispara no modo estático; com overflow:hidden não há scroll interno.
      viewport.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", measure);
      // Fontes e imagens já resolvidas podem mudar a altura do bloco fixado.
      window.addEventListener("load", measure);

      if (typeof prefersReducedMotion.addEventListener === "function") {
        prefersReducedMotion.addEventListener("change", measure);
      }

      measure();
    });
  }


  /* ------------------------------------------------------------------------
     SEÇÃO: PRINCIPAIS DÚVIDAS — accordion exclusivo
     Abrir um item fecha o que estava aberto. A animação de altura é 100%
     CSS (grid-template-rows), então aqui só cuidamos de estado e ARIA.
     ------------------------------------------------------------------------ */

  function initAccordions() {
    $$("[data-faq]").forEach(function (group) {
      var items = $$("[data-faq-item]", group);
      if (!items.length) return;

      // Item aberto no momento (só um por grupo).
      var current = null;

      function setOpen(item, open) {
        var trigger = $("[data-faq-trigger]", item);
        var panel = $("[data-faq-panel]", item);

        item.classList.toggle("is-open", open);
        if (trigger) trigger.setAttribute("aria-expanded", String(open));
        // Tira o painel fechado da árvore de acessibilidade sem
        // interromper a transição (inert não afeta a renderização).
        if (panel) panel.inert = !open;
      }

      items.forEach(function (item) {
        var trigger = $("[data-faq-trigger]", item);
        if (!trigger) return;

        // Estado inicial: o que o HTML já declarou.
        var startsOpen = trigger.getAttribute("aria-expanded") === "true";
        setOpen(item, startsOpen);
        if (startsOpen) current = item;

        trigger.addEventListener("click", function () {
          var willOpen = item !== current;

          if (current) setOpen(current, false);
          if (willOpen) setOpen(item, true);

          current = willOpen ? item : null;
        });
      });
    });
  }


  /* ========================================================================
     BOOT
     ======================================================================== */

  function init() {
    initHeader();
    initNav();
    initTabs();
    initCarousels();
    initAccordions();
    initReveal();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
