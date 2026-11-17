(function () {
  "use strict";

  // PLACEHOLDER: replace with the roastery's real email address. Messages from the contact form go here.
  var CONTACT_EMAIL = "hello@example.com";

  var reduce = matchMedia("(prefers-reduced-motion: reduce)");

  // Header line once the page scrolls
  var header = document.getElementById("top-bar");
  function onScroll() { header.classList.toggle("scrolled", window.scrollY > 8); }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile menu
  var btn = document.querySelector(".menu-btn");
  var nav = document.getElementById("site-nav");
  function setMenu(open) {
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
  }
  btn.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { setMenu(false); btn.focus(); } });

  // Entrances on scroll (content stays visible if this never runs)
  var items = [].slice.call(document.querySelectorAll(".reveal"));
  function showAll() { items.forEach(function (el) { el.classList.add("in", "done"); }); }
  if ("IntersectionObserver" in window && !reduce.matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var t = en.target;
        t.classList.add("in");
        setTimeout(function () { t.classList.add("done"); }, 1200); // retire the stagger so hovers never lag
        io.unobserve(t);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(function (el, i) {
      el.style.transitionDelay = (i % 3) * 90 + "ms";
      io.observe(el);
    });
  } else {
    showAll();
  }
  if (reduce.addEventListener) reduce.addEventListener("change", function (e) { if (e.matches) showAll(); });

  // Brew method: pick one, the photo and the bean suggestion change
  var methods = [].slice.call(document.querySelectorAll(".method"));
  var advs = [].slice.call(document.querySelectorAll(".adv"));
  var pics = [].slice.call(document.querySelectorAll(".bp"));
  function choose(m) {
    methods.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.m === m)); });
    advs.forEach(function (a) { a.classList.toggle("on", a.dataset.for === m); });
    pics.forEach(function (p) { p.classList.toggle("on", p.dataset.for === m); });
  }
  // Change on click only (never on hover or focus), so the button under the pointer stays put
  methods.forEach(function (b) {
    b.addEventListener("click", function () { choose(b.dataset.m); });
  });
  if (methods.length) choose("espresso");

  // "Open now" line, in Philippine time (Monday to Saturday, 8:00 am to 5:00 pm)
  function openLine() {
    var parts;
    try {
      parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", weekday: "short", hour: "numeric", hour12: false }).formatToParts(new Date());
    } catch (e) { return ""; }
    var day = "", hour = 0;
    parts.forEach(function (p) { if (p.type === "weekday") day = p.value; if (p.type === "hour") hour = Number(p.value) % 24; });
    if (day !== "Sun" && hour >= 8 && hour < 17) return "<b>Open now.</b> We close at 5:00 pm.";
    return "<b>Closed right now.</b> The store is always open.";
  }
  var line = openLine();
  if (line) [].slice.call(document.querySelectorAll("[data-open-line]")).forEach(function (el) { el.innerHTML = line; });

  // Footer year
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // Contact form: opens the visitor's email app with the message filled in
  var form = document.getElementById("contact-form");
  var err = document.getElementById("form-error");
  var ok = document.getElementById("form-ok");
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    ok.hidden = true;
    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var msg = form.message.value.trim();
    var valid = name && msg && EMAIL_RE.test(email);
    err.hidden = !!valid;
    if (!valid) { (!name ? form.name : !EMAIL_RE.test(email) ? form.email : form.message).focus(); return; }
    var body = "Name: " + name + "\nEmail: " + email + "\n\n" + msg;
    window.location.href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent("Website enquiry from " + name) + "&body=" + encodeURIComponent(body);
    ok.hidden = false;
    form.reset();
  });
})();
