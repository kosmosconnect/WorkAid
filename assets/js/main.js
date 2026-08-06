/* =====================================================================
   WORKAID — shared behaviour
   Theme toggle · mobile nav · reveal · counters · slider · accordion ·
   project filters · form validation. No dependencies.
   ===================================================================== */
(function () {
  "use strict";

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- Theme ------------------------------------------------- */
  // The inline snippet in <head> has already applied the stored theme so the
  // page never flashes; here we only wire up the toggle.
  var root = document.documentElement;

  function setTheme(name, persist) {
    root.setAttribute("data-theme", name);
    $$(".theme-toggle").forEach(function (btn) {
      btn.setAttribute("aria-label", name === "dark" ? "Switch to light theme" : "Switch to dark theme");
      btn.setAttribute("aria-pressed", String(name === "dark"));
    });
    if (persist) {
      try { localStorage.setItem("workaid-theme", name); } catch (e) { /* private mode */ }
    }
  }

  setTheme(root.getAttribute("data-theme") || "light", false);

  $$(".theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark", true);
    });
  });

  // Light is the brand default and stays the default regardless of the OS
  // setting — dark is opt-in via the toggle, and the choice is remembered.

  /* ---------- Header state + mobile nav ----------------------------- */
  var header = $(".site-header");
  var nav = $("#site-nav");
  var navToggle = $(".nav-toggle");

  if (header) {
    var onScroll = function () { header.classList.toggle("is-stuck", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function closeNav() {
    if (!nav) return;
    nav.classList.remove("is-open");
    if (navToggle) navToggle.setAttribute("aria-expanded", "false");
  }

  if (navToggle && nav) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", closeNav); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        closeNav();
        navToggle.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(e.target) || navToggle.contains(e.target)) return;
      closeNav();
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) closeNav();
    });
  }

  /* ---------- Reveal on scroll -------------------------------------- */
  var reveals = $$(".reveal");
  if (reveals.length) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          // Stagger siblings so rows of cards cascade rather than pop together.
          var delay = parseInt(entry.target.getAttribute("data-delay") || "0", 10);
          setTimeout(function () { entry.target.classList.add("is-in"); }, delay);
          io.unobserve(entry.target);
        });
        // threshold 0: reveal as soon as any part enters. A percentage
        // threshold would strand any block taller than the viewport, which can
        // never show that share of itself — and it would stay invisible.
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
      reveals.forEach(function (el, i) {
        if (!el.hasAttribute("data-delay")) {
          var parent = el.parentElement;
          var idx = parent ? Array.prototype.indexOf.call(parent.children, el) : i;
          el.setAttribute("data-delay", String(Math.min(idx, 5) * 70));
        }
        io.observe(el);
      });
    } else {
      reveals.forEach(function (el) { el.classList.add("is-in"); });
    }
  }

  /* ---------- Animated counters ------------------------------------- */
  var counters = $$("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        cio.unobserve(el);
        var target = parseFloat(el.getAttribute("data-count")) || 0;
        var suffix = el.getAttribute("data-suffix") || "";
        if (reduced) { el.textContent = target + suffix; return; }
        var start = performance.now();
        var dur = 1400;
        (function tick(now) {
          var p = Math.min((now - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        })(start);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(function (el) {
      el.textContent = el.getAttribute("data-count") + (el.getAttribute("data-suffix") || "");
    });
  }

  /* ---------- Testimonial slider ------------------------------------ */
  $$("[data-slider]").forEach(function (slider) {
    var slides = $$(".slides > *", slider);
    var dotWrap = $(".dots", slider);
    if (slides.length < 2 || !dotWrap) return;

    var index = 0;
    var timer = null;

    var dots = slides.map(function (_, i) {
      var b = document.createElement("button");
      b.className = "dot";
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", "Testimonial " + (i + 1));
      b.addEventListener("click", function () { go(i); restart(); });
      dotWrap.appendChild(b);
      return b;
    });

    function go(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) { s.classList.toggle("is-active", n === index); });
      dots.forEach(function (d, n) { d.setAttribute("aria-selected", String(n === index)); });
    }
    function restart() {
      clearInterval(timer);
      timer = setInterval(function () { go(index + 1); }, 7000);
    }

    go(0);
    restart();
    slider.addEventListener("mouseenter", function () { clearInterval(timer); });
    slider.addEventListener("mouseleave", restart);
    slider.addEventListener("focusin", function () { clearInterval(timer); });
  });

  /* ---------- Accordion --------------------------------------------- */
  $$(".acc").forEach(function (acc) {
    var single = acc.hasAttribute("data-single");
    $$(".acc-btn", acc).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        if (single) {
          $$(".acc-btn", acc).forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
        }
        btn.setAttribute("aria-expanded", String(!open));
      });
    });
  });

  /* ---------- Filters (case studies / resources) -------------------- */
  $$("[data-filter-group]").forEach(function (group) {
    var buttons = $$(".filter", group);
    var targetSel = group.getAttribute("data-filter-group");
    var items = $$(targetSel + " [data-cat]");
    var empty = $(targetSel + "-empty");

    function apply(btn) {
      var cat = btn.getAttribute("data-cat");
      buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      var shown = 0;
      items.forEach(function (item) {
        var match = cat === "all" || item.getAttribute("data-cat").split(" ").indexOf(cat) > -1;
        item.classList.toggle("is-hidden", !match);
        if (match) shown++;
      });
      if (empty) empty.classList.toggle("is-hidden", shown > 0);
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () { apply(btn); });
    });

    // Links such as case-studies.html#residential arrive pre-filtered.
    var hash = (window.location.hash || "").replace("#", "");
    if (hash) {
      var preset = buttons.filter(function (b) { return b.getAttribute("data-cat") === hash; })[0];
      if (preset) apply(preset);
    }
  });

  /* ---------- Forms -------------------------------------------------- */
  // resources.html links here as contact.html?request=monsoon-checklist#quote —
  // prefill the message so the visitor does not retype what they clicked.
  (function () {
    var match = /[?&]request=([^&#]+)/.exec(window.location.search);
    var message = document.getElementById("f-message");
    if (!match || !message || message.value) return;
    var labels = {
      "monsoon-checklist": "Please send me the pre-monsoon building checklist.",
      "compliance-calendar": "Please send me the MSME compliance calendar template.",
      "scope-worksheet": "Please send me the renovation scope worksheet."
    };
    message.value = labels[decodeURIComponent(match[1])] || "";
  })();

  $$("form[data-validate]").forEach(function (form) {
    var status = $(".form-status", form);

    function fail(field, msg) {
      field.classList.add("is-invalid");
      var err = $(".err", field);
      if (err) err.textContent = msg;
    }
    function clear(field) {
      field.classList.remove("is-invalid");
      var err = $(".err", field);
      if (err) err.textContent = "";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      var firstBad = null;

      $$(".field", form).forEach(function (field) {
        var input = $("input, select, textarea", field);
        if (!input) return;
        clear(field);
        var value = (input.value || "").trim();

        if (input.required && !value) {
          ok = false; fail(field, "This field is required.");
          firstBad = firstBad || input;
          return;
        }
        if (input.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
          ok = false; fail(field, "Enter a valid email address.");
          firstBad = firstBad || input;
          return;
        }
        if (input.type === "tel" && value && value.replace(/\D/g, "").length < 10) {
          ok = false; fail(field, "Enter a valid phone number.");
          firstBad = firstBad || input;
        }
      });

      if (!ok) {
        if (status) status.textContent = "Please correct the highlighted fields.";
        if (firstBad) firstBad.focus();
        return;
      }

      // A form with an action posts to it for real. HTMLFormElement.submit()
      // is used deliberately: unlike requestSubmit() it does not re-fire this
      // handler, so there is no loop.
      if (form.getAttribute("action")) {
        if (status) status.textContent = "Sending your enquiry…";
        var btn = $("button[type=submit]", form);
        if (btn) { btn.disabled = true; }
        form.submit();
        return;
      }

      // No endpoint configured — fall back to handing the details to the
      // visitor's mail client. Note this silently does nothing for anyone on
      // webmail with no desktop mail client, which is why the real form has an
      // action. See README.
      var data = new FormData(form);
      var lines = [];
      data.forEach(function (v, k) {
        if (k.charAt(0) !== "_" && String(v).trim()) lines.push(k + ": " + v);
      });

      var to = form.getAttribute("data-mailto") || "info@workaid.com";
      var subject = form.getAttribute("data-subject") || "Website enquiry";
      window.location.href = "mailto:" + to +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(lines.join("\n"));

      if (status) {
        status.textContent = "Thanks — your mail client is opening with the details filled in.";
      }
      form.reset();
    });
  });

  /* ---------- Footer year ------------------------------------------- */
  $$("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
})();
