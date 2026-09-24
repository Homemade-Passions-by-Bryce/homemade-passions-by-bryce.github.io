(() => {
  "use strict";

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const menuButton = document.getElementById("menuButton");
  const mainNav = document.getElementById("mainNav");
  const mobileQuery = window.matchMedia("(max-width: 800px)");

  if (menuButton && mainNav) {
    const menuLabel = menuButton.querySelector("[data-menu-label]");
    const setMenuOpen = (open, restoreFocus = false) => {
      menuButton.setAttribute("aria-expanded", String(open));
      mainNav.classList.toggle("is-open", open);
      document.body.classList.toggle("menu-open", open);
      if (menuLabel) menuLabel.textContent = open ? "Close" : "Menu";
      if (restoreFocus) menuButton.focus();
    };

    menuButton.addEventListener("click", () => {
      const open = menuButton.getAttribute("aria-expanded") === "true";
      setMenuOpen(!open && mobileQuery.matches);
    });

    mainNav.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (!link) return;
      const wasOpen = menuButton.getAttribute("aria-expanded") === "true";
      setMenuOpen(false);
      if (!wasOpen || !mobileQuery.matches) return;

      const href = link.getAttribute("href") || "";
      const destination = href.startsWith("#") ? document.getElementById(href.slice(1)) : null;
      if (destination) {
        const temporaryTabIndex = !destination.hasAttribute("tabindex");
        if (temporaryTabIndex) {
          destination.setAttribute("tabindex", "-1");
          destination.addEventListener("blur", () => destination.removeAttribute("tabindex"), { once: true });
        }
        destination.focus({ preventScroll: true });
      } else {
        menuButton.focus({ preventScroll: true });
      }
    });

    const closeWhenLeavingMenu = (event) => {
      if (!mainNav.contains(event.target) && !menuButton.contains(event.target)) {
        const restoreFocus = mobileQuery.matches && mainNav.contains(document.activeElement);
        setMenuOpen(false, restoreFocus);
      }
    };
    document.addEventListener("click", closeWhenLeavingMenu);
    document.addEventListener("focusin", closeWhenLeavingMenu);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
        setMenuOpen(false, true);
      }
    });

    const handleBreakpoint = () => {
      if (!mobileQuery.matches) setMenuOpen(false);
    };
    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", handleBreakpoint);
    } else {
      mobileQuery.addListener(handleBreakpoint);
    }
    setMenuOpen(false);
  }

  const siteHeader = document.getElementById("siteHeader");
  if (siteHeader) {
    const updateHeader = () => siteHeader.classList.toggle("is-scrolled", window.scrollY > 16);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  }

  const filterButtons = Array.from(document.querySelectorAll("[data-filter]"));
  const galleryItems = Array.from(document.querySelectorAll("[data-gallery-item]"));
  const galleryStatus = document.getElementById("galleryStatus");

  if (filterButtons.length && galleryItems.length) {
    const filterGallery = (filter) => {
      let visibleCount = 0;
      galleryItems.forEach((item) => {
        const categories = (item.dataset.category || "").split(/\s+/);
        const visible = filter === "all" || categories.includes(filter);
        item.hidden = !visible;
        if (visible) visibleCount += 1;
      });
      filterButtons.forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
      });
      if (galleryStatus) {
        galleryStatus.textContent = `Showing ${visibleCount} ${visibleCount === 1 ? "photo" : "photos"}.`;
      }
    };

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => filterGallery(button.dataset.filter));
    });
    const initialFilter = filterButtons.find((button) => button.getAttribute("aria-pressed") === "true");
    filterGallery(initialFilter ? initialFilter.dataset.filter : "all");
  }

  const galleryDialog = document.getElementById("galleryDialog");
  const dialogImage = document.getElementById("dialogImage");
  const dialogTitle = document.getElementById("dialogTitle");
  const dialogClose = document.getElementById("dialogClose");

  // Ordinary image links remain usable when native dialogs are unavailable.
  if (galleryDialog && dialogImage && dialogTitle && dialogClose &&
      typeof galleryDialog.showModal === "function") {
    let opener = null;

    document.querySelectorAll("[data-gallery-open]").forEach((link) => {
      link.addEventListener("click", (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
            link.hasAttribute("download") || (link.target && link.target !== "_self")) return;

        const thumbnail = link.querySelector("img");
        dialogImage.src = link.href;
        dialogImage.alt = thumbnail ? thumbnail.alt : (link.dataset.title || "Bakery photo");
        dialogTitle.textContent = link.dataset.title || dialogImage.alt;

        try {
          galleryDialog.showModal();
        } catch {
          return;
        }
        event.preventDefault();
        opener = link;
        dialogClose.focus();
      });
    });

    dialogClose.addEventListener("click", () => galleryDialog.close());
    galleryDialog.addEventListener("click", (event) => {
      if (event.target !== galleryDialog) return;
      const bounds = galleryDialog.getBoundingClientRect();
      const outside = event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom;
      if (outside) galleryDialog.close();
    });
    galleryDialog.addEventListener("close", () => {
      dialogImage.removeAttribute("src");
      dialogImage.alt = "";
      if (opener && opener.isConnected && opener.getClientRects().length) opener.focus();
      opener = null;
    });
  }
})();
