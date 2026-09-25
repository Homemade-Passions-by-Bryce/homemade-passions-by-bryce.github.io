// Both inquiry types share one Formspree endpoint, configured on #inquiryForm.
// If the endpoint is removed, the form falls back to preparing an email draft.
function initializeInquiryForm(form) {
  if (!form) return;
  const doc = form.ownerDocument;
  const fields = doc.getElementById("inquiryFields");
  const submit = doc.getElementById("inquirySubmit");
  const submitLabel = submit && submit.querySelector("[data-submit-label]");
  const modeNote = doc.getElementById("inquiryModeNote");
  const status = doc.getElementById("inquiryStatus");
  const errorSummary = doc.getElementById("inquiryErrorSummary");
  const errorList = doc.getElementById("inquiryErrors");
  const fallback = doc.getElementById("inquiryEmailFallback");
  const emailLink = doc.getElementById("inquiryEmailLink");
  const emailText = doc.getElementById("inquiryEmailText");
  const copyButton = doc.getElementById("inquiryCopy");
  if (!fields || !submit || !submitLabel || !modeNote || !status || !errorSummary ||
      !errorList || !fallback || !emailLink || !emailText || !copyButton) return;

  const recipient = "homemadepassionsbybryce@gmail.com";
  const radios = Array.from(form.querySelectorAll('input[name="request_type"]'));
  const panels = Array.from(form.querySelectorAll("[data-request-fields]"));
  const inputs = Array.from(fields.querySelectorAll("input[id], select[id], textarea[id]"))
    .filter((input) => !["radio", "hidden", "submit", "button"].includes(input.type) && input.name !== "_gotcha");
  const errors = new Map();
  const names = {
    name: "Your name", email: "Email address", phone: "Phone number", message: "Your message",
    order_type: "Order type", event_date: "Preferred date", quantity: "Quantity or guest count",
    budget: "Budget", inspiration: "Gallery inspiration", business_name: "Business name",
    business_type: "Type of business", business_location: "Business location",
    products: "Products of interest", estimated_volume: "Estimated volume", frequency: "Order frequency"
  };
  let busy = false;
  let generalErrors = [];

  const configuredEndpoint = (form.dataset.formspreeEndpoint || "").trim();
  // Do not accidentally send personal details to an example endpoint or another host.
  const endpointMatch = /^https:\/\/formspree\.io\/f\/([a-z0-9]+)$/i.exec(configuredEndpoint);
  const endpoint = endpointMatch && !/^(?:your.*|example.*|placeholder.*|formid|x{4,}|test)$/i.test(endpointMatch[1])
    ? configuredEndpoint : "";
  const defaultLabel = endpoint ? "Send inquiry" : "Prepare email inquiry";
  submitLabel.textContent = defaultLabel;
  modeNote.textContent = endpoint
    ? "This is an inquiry. Bryce will confirm availability, pricing, and next steps with you."
    : "We’re taking inquiries by email. Fill this out to prepare a draft, then send it from your email app.";

  const selectedType = () => radios.find((radio) => radio.checked)?.value === "wholesale" ? "wholesale" : "custom";
  const localToday = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  };
  const eventDate = doc.getElementById("eventDate");
  const updateMinimumDate = () => { if (eventDate) eventDate.min = localToday(); };

  const showStatus = (message, state = "info", focus = false) => {
    status.textContent = message;
    status.dataset.state = state;
    status.hidden = false;
    if (focus) status.focus();
  };
  const clearFeedback = () => {
    status.hidden = true;
    status.textContent = "";
    delete status.dataset.state;
    fallback.hidden = true;
    emailText.value = "";
    emailLink.href = `mailto:${recipient}`;
    copyButton.textContent = "Copy inquiry";
  };
  const renderErrors = () => {
    errorList.replaceChildren();
    inputs.forEach((input) => {
      const message = errors.get(input.id);
      const inline = doc.getElementById(`${input.id}Error`);
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
      if (inline) {
        inline.textContent = message || "";
        inline.hidden = !message;
      }
      if (!message) return;
      const item = doc.createElement("li");
      const link = doc.createElement("a");
      link.href = `#${input.id}`;
      link.textContent = message;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        input.focus();
      });
      item.append(link);
      errorList.append(item);
    });
    generalErrors.forEach((message) => {
      const item = doc.createElement("li");
      item.textContent = message;
      errorList.append(item);
    });
    errorSummary.hidden = errors.size === 0 && generalErrors.length === 0;
  };
  const clearErrors = () => {
    errors.clear();
    generalErrors = [];
    renderErrors();
  };
  const updatePanels = () => {
    const type = selectedType();
    panels.forEach((panel) => {
      const inactive = panel.dataset.requestFields !== type;
      panel.hidden = inactive;
      panel.disabled = inactive;
    });
  };
  const validateInput = (input) => {
    if (!input.willValidate) return "";
    const value = input.value.trim();
    const label = names[input.name] || "This field";
    if (input.required && !value) return `${label} is required.`;
    if (input.validity.badInput) return `${label}: enter a valid ${input.type === "number" ? "number" : "value"}.`;
    if (!value) return "";
    if (input.type === "email" && input.validity.typeMismatch) return "Enter a valid email address, such as name@example.com.";
    if (input.maxLength > -1 && value.length > input.maxLength) return `${label} must be ${input.maxLength} characters or fewer.`;
    if (input.type === "date" && value < localToday()) return "Choose today or a future date, or leave the preferred date blank.";
    if (input.validity.rangeUnderflow || input.validity.rangeOverflow) return `${label} must be between ${input.min} and ${input.max}.`;
    if (input.validity.stepMismatch) return `${label}: enter a whole number.`;
    if (!input.validity.valid) return `${label}: please check this value.`;
    return "";
  };
  const validate = () => {
    clearErrors();
    updateMinimumDate();
    inputs.forEach((input) => {
      // Trimming does not change punctuation, accents, or the meaning of a message.
      if (input.willValidate && input.type !== "number" && input.type !== "date") input.value = input.value.trim();
      const message = validateInput(input);
      if (message) errors.set(input.id, message);
    });
    renderErrors();
    if (errors.size) inputs.find((input) => errors.has(input.id)).focus();
    return errors.size === 0;
  };
  const requestSubject = () => selectedType() === "wholesale"
    ? "Wholesale inquiry | Homemade Passions by Bryce"
    : "Custom order inquiry | Homemade Passions by Bryce";
  const createSummary = () => {
    const lines = [requestSubject(), ""];
    inputs.forEach((input) => {
      if (!input.willValidate || !input.value.trim()) return;
      const value = input.tagName === "SELECT" ? input.selectedOptions[0].textContent.trim() : input.value.trim();
      lines.push(`${names[input.name] || input.name}: ${value}`);
    });
    lines.push("", "Please let me know about availability, pricing, and next steps.");
    return lines.join("\n");
  };
  const showEmailFallback = (summary, subject) => {
    emailText.value = summary;
    emailLink.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(summary)}`;
    fallback.hidden = false;
  };
  const setBusy = (sending) => {
    busy = sending;
    fields.disabled = sending;
    form.setAttribute("aria-busy", String(sending));
    submitLabel.textContent = sending ? "Sending…" : defaultLabel;
    if (!sending) updatePanels();
  };
  const showRemoteErrors = (result) => {
    const entries = Array.isArray(result?.errors) ? result.errors : [];
    entries.forEach((entry) => {
      const message = typeof entry === "string" ? entry : entry?.message;
      if (typeof message !== "string" || !message.trim()) return;
      const safeMessage = message.trim().slice(0, 500);
      const input = inputs.find((field) => field.name === entry.field && field.willValidate);
      if (input) errors.set(input.id, safeMessage);
      else generalErrors.push(safeMessage);
    });
    if (!entries.length && typeof result?.error === "string") generalErrors.push(result.error.slice(0, 500));
    renderErrors();
  };

  radios.forEach((radio) => radio.addEventListener("change", () => {
    if (busy) return;
    updatePanels();
    clearErrors();
    clearFeedback();
  }));
  form.addEventListener("input", (event) => {
    if (busy || !inputs.includes(event.target)) return;
    clearFeedback();
    generalErrors = [];
    if (errors.has(event.target.id)) {
      const message = validateInput(event.target);
      if (message) errors.set(event.target.id, message);
      else errors.delete(event.target.id);
    }
    renderErrors();
  });
  copyButton.addEventListener("click", async () => {
    if (!emailText.value) return;
    try {
      await navigator.clipboard.writeText(emailText.value);
      copyButton.textContent = "Copied";
      showStatus("Inquiry copied. Paste it into an email to Bryce and send it when you’re ready.");
    } catch {
      emailText.focus();
      emailText.select();
      showStatus("Select and copy the inquiry below, then paste it into your email to Bryce.");
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    clearFeedback();
    if (!validate()) return;
    const honeypot = form.querySelector('[name="_gotcha"]');
    if (honeypot && honeypot.value.trim()) {
      showStatus("We couldn’t prepare this inquiry. Please contact Bryce by email or phone.", "error", true);
      return;
    }
    const summary = createSummary();
    const subject = requestSubject();
    if (!endpoint) {
      showEmailFallback(summary, subject);
      showStatus("Your email draft is ready. Nothing has been sent yet—open it in your email app or copy the details below, then send it to Bryce.", "info", true);
      return;
    }

    // Capture the active fields before disabling them; disabled fields are omitted by FormData.
    const payload = new FormData(form);
    payload.set("subject", subject);
    payload.set("request_type", selectedType());
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    setBusy(true);
    showStatus("Sending your inquiry…");
    try {
      const response = await fetch(endpoint, {
        method: "POST", body: payload, headers: { Accept: "application/json" },
        signal: controller.signal, redirect: "error"
      });
      let result = null;
      try { result = await response.json(); } catch { /* An unreadable response cannot confirm receipt. */ }
      setBusy(false);
      // Formspree's SDK recognizes { next: string }; older responses also use { ok: true }.
      // Stay on this page and let explicit errors take priority over either success marker.
      const hasErrors = Boolean(result?.error) || (result?.errors != null &&
        (!Array.isArray(result.errors) || result.errors.length > 0));
      const accepted = result?.ok !== false &&
        (result?.ok === true || typeof result?.next === "string");
      if (response.ok && accepted && !hasErrors) {
        form.reset();
        updatePanels();
        clearErrors();
        showStatus("Thank you—your inquiry has been submitted. Bryce will confirm availability, pricing, and next steps with you. Your order or wholesale account is not confirmed yet.", "success", true);
      } else {
        showEmailFallback(summary, subject);
        showRemoteErrors(result);
        const message = response.status === 429
          ? "We’re receiving too many requests right now. Please wait a few minutes before trying again, or contact Bryce by email. Your details are still here."
          : response.ok
            ? "We couldn’t confirm that your inquiry was received. Please contact Bryce before sending it again to avoid a duplicate. Your details are still here."
            : "Your inquiry couldn’t be submitted. Please check any details highlighted below, try again later, or contact Bryce by email. Your details are still here.";
        showStatus(message, "error");
        const invalid = inputs.find((input) => errors.has(input.id));
        (invalid || status).focus();
      }
    } catch {
      setBusy(false);
      showEmailFallback(summary, subject);
      showStatus("We couldn’t confirm whether your inquiry went through. Please contact Bryce before sending it again to avoid a duplicate. Your details are still here, and you can copy them below.", "error", true);
    } finally {
      window.clearTimeout(timeout);
      setBusy(false);
    }
  });

  doc.querySelectorAll("[data-inquiry-type]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (busy) { event.preventDefault(); return; }
      const type = link.dataset.inquiryType;
      if (!["custom", "wholesale"].includes(type)) return;
      radios.forEach((radio) => { radio.checked = radio.value === type; });
      updatePanels();
      clearErrors();
      clearFeedback();
      const orderType = doc.getElementById("orderType");
      if (type === "custom" && orderType && link.dataset.orderType &&
          Array.from(orderType.options).some((option) => option.value === link.dataset.orderType)) {
        orderType.value = link.dataset.orderType;
      }
      if (link.id === "dialogInquiry") {
        const inspiration = doc.getElementById("inquiryInspiration");
        const title = doc.getElementById("dialogTitle");
        if (inspiration && title) inspiration.value = title.textContent.trim();
        const dialog = doc.getElementById("galleryDialog");
        if (dialog && dialog.open) {
          dialog.dataset.inquiryNavigation = "true";
          dialog.close();
        }
      }
      const section = doc.getElementById("inquire");
      if (section) {
        if (!section.hasAttribute("tabindex")) section.setAttribute("tabindex", "-1");
        section.focus({ preventScroll: true });
      }
    });
  });

  updatePanels();
  updateMinimumDate();
  // Enable only after validation and submission handlers are installed.
  fields.disabled = false;
  form.dataset.ready = "true";
}

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
      if (galleryDialog.dataset.inquiryNavigation === "true") {
        delete galleryDialog.dataset.inquiryNavigation;
        document.getElementById("inquire")?.focus({ preventScroll: true });
      } else if (opener && opener.isConnected && opener.getClientRects().length) opener.focus();
      opener = null;
    });
  }
  initializeInquiryForm(document.getElementById("inquiryForm"));
})();
