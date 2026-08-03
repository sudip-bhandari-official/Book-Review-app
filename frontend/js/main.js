/* ============================================================
   BookNest — Main JavaScript
   Handles: mobile navigation, sticky header state,
   search form, and dynamic footer year.
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  /* ---------- Mobile Navigation ---------- */
  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");
  const closeMenu = () => {
    navMenu.classList.remove("is-open");
    navToggle.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  };
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("is-open");
      navToggle.classList.toggle("is-open", isOpen);
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
    // Close the menu when a link is clicked (mobile)
    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
  }
  /* ---------- Sticky Header Shadow on Scroll ---------- */
  const header = document.getElementById("siteHeader");
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  /* ---------- Search Form ---------- */
  // Ready for a Node.js backend: replace the console.log with a fetch()
  // call to your API endpoint (e.g. `/api/search?q=...`).
  const searchForm = document.querySelector(".hero__search");
  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = searchForm.querySelector("#heroSearch").value.trim();
      if (!query) return;
      console.log("Search submitted:", query);
      // Example backend integration:
      // fetch(`/api/search?q=${encodeURIComponent(query)}`)
      //   .then((res) => res.json())
      //   .then((data) => console.log(data));
    });
  }
  /* ---------- Dynamic Footer Year ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
});