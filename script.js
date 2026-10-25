// Both inquiry types share the endpoint on #inquiryForm. No customer photos are uploaded.
function initializeInquiryForm(form) {
  if (!form) return;
  const doc = form.ownerDocument;
  const get = (id) => doc.getElementById(id);
  const fields = get("inquiryFields");
  const submit = get("inquirySubmit");
  const submitLabel = submit?.querySelector("[data-submit-label]");
  const modeNote = get("inquiryModeNote");
  const status = get("inquiryStatus");
  const errorSummary = get("inquiryErrorSummary");
  const errorList = get("inquiryErrors");
  const fallback = get("inquiryEmailFallback");
  const emailLink = get("inquiryEmailLink");
  const emailText = get("inquiryEmailText");
  const copyButton = get("inquiryCopy");
  const next = get("inquiryNext");
  const back = get("inquiryBack");
  const review = get("inquiryReview");
  const quickReview = get("inquiryQuickReview");
  const photoFollowup = get("inquiryPhotoFollowup");
  const photoEmail = get("inquiryPhotoEmail");
  if (![fields, submit, submitLabel, modeNote, status, errorSummary, errorList, fallback,
    emailLink, emailText, copyButton, next, back, review, quickReview, photoFollowup, photoEmail].every(Boolean)) return;

  const recipient = "homemadepassionsbybryce@gmail.com";
  const radios = Array.from(form.querySelectorAll('input[name="request_type"]'));
  const panels = Array.from(form.querySelectorAll("[data-request-fields]"));
  const products = Array.from(form.querySelectorAll("[data-product-fields]"));
  const conditionals = Array.from(form.querySelectorAll("[data-when]"));
  const steps = Array.from(form.querySelectorAll("[data-form-step]"));
  const progress = Array.from(form.querySelectorAll("[data-step-go]"));
  const disclosures = Array.from(form.querySelectorAll("details[data-responsive-details]"));
  const compactView = window.matchMedia("(max-width: 800px)");
  const inputs = Array.from(fields.querySelectorAll("input[id], select[id], textarea[id]"))
    .filter((input) => !["radio", "hidden", "submit", "button"].includes(input.type) && input.name !== "_gotcha");
  const errors = new Map();
  const stepNames = ["Your request", "The details", "Review & send"];
  let busy = false;
  let currentStep = 0;
  let generalErrors = [];

  const configuredEndpoint = (form.dataset.formspreeEndpoint || "").trim();
  const endpointMatch = /^https:\/\/formspree\.io\/f\/([a-z0-9]+)$/i.exec(configuredEndpoint);
  const endpoint = endpointMatch && !/^(?:your.*|example.*|placeholder.*|formid|x{4,}|test)$/i.test(endpointMatch[1])
    ? configuredEndpoint : "";
  const defaultLabel = endpoint ? "Send inquiry" : "Prepare email inquiry";
  submitLabel.textContent = defaultLabel;
  modeNote.textContent = endpoint
    ? "This is an inquiry. Bryce will confirm availability, pricing, and next steps with you."
    : "We’re taking inquiries by email. Fill this out to prepare a draft, then send it from your email app.";

  const valueOf = (id) => get(id)?.value.trim() || "";
  const selectedType = () => radios.find((radio) => radio.checked)?.value === "wholesale" ? "wholesale" : "custom";
  const labelOf = (input) => input.dataset.summaryLabel || input.name;
  const stepOf = (input) => Number(input.closest("[data-form-step]")?.dataset.formStep || 0);
  const localToday = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  };
  const updateMinimumDates = () => inputs.filter((input) => input.type === "date")
    .forEach((input) => { input.min = localToday(); });
  const requestSubject = () => `${selectedType() === "wholesale" ? "Wholesale" : "Custom order"} inquiry | Homemade Passions by Bryce`;
  const answers = () => inputs.filter((input) => input.willValidate && input.value.trim()).map((input) => ({
    label: labelOf(input),
    value: input.tagName === "SELECT" ? input.selectedOptions[0].textContent.trim() : input.value.trim()
  }));
  // One set of fields on every device. Closing an optional section never disables it.
  const adaptDisclosures = () => {
    disclosures.forEach((details) => {
      if (details.dataset.interacted === "true") return;
      const focused = doc.activeElement;
      if (focused && details.contains(focused) && focused.tagName !== "SUMMARY") return;
      details.open = !compactView.matches;
    });
  };
  const rememberDisclosure = (input) => {
    let parent = input.parentElement;
    while (parent && parent !== form) {
      if (parent.matches("details[data-responsive-details]")) parent.dataset.interacted = "true";
      parent = parent.parentElement;
    }
  };
  const activeAnswer = (id) => {
    const input = get(id);
    if (!input?.willValidate || !input.value.trim()) return "";
    return input.tagName === "SELECT" ? input.selectedOptions[0].textContent.trim() : input.value.trim();
  };
  const renderReview = () => {
    review.replaceChildren();
    quickReview.replaceChildren();
    const add = (target, label, value) => {
      if (!value) return;
      const row = doc.createElement("div");
      const term = doc.createElement("dt");
      const detail = doc.createElement("dd");
      term.textContent = label;
      detail.textContent = value;
      row.append(term, detail);
      target.append(row);
    };
    add(review, "Request", selectedType() === "wholesale" ? "Wholesale" : "Custom order");
    answers().forEach(({ label, value }) => add(review, label, value));
    const brief = (value) => Array.from(value).length > 160 ? `${Array.from(value).slice(0, 160).join("")}…` : value;
    const quick = (label, value) => add(quickReview, label, value);
    if (selectedType() === "custom") {
      quick("Request", activeAnswer("orderType"));
      const date = activeAnswer("eventDate");
      quick("When", date ? `${date}${valueOf("eventTiming") === "flexible" ? " (flexible)" : ""}` : activeAnswer("eventTiming"));
      const quantity = activeAnswer("orderQuantity");
      const unit = ["cake", "catering"].includes(valueOf("orderType")) ? "guests / servings"
        : valueOf("orderType") === "pies" ? "pies" : "pieces";
      quick("How many", quantity ? `${quantity} ${unit}` : activeAnswer("quantityPlan"));
      quick("Your idea", brief(activeAnswer("designBrief") || activeAnswer("bakeDetails") || activeAnswer("cateringDetails")));
      const inspirationCount = activeAnswer("inspirationLinks").split(/\r?\n/).filter((line) => line.trim()).length;
      quick("Inspiration", [activeAnswer("inquiryInspiration"), inspirationCount
        ? `${inspirationCount} photo ${inspirationCount === 1 ? "link" : "links"}` : ""].filter(Boolean).join(" · "));
      quick("Budget", activeAnswer("orderBudget"));
      quick("Fulfillment", activeAnswer("customFulfillment"));
    } else {
      quick("Business", [activeAnswer("businessName"), activeAnswer("businessLocation")].filter(Boolean).join("\n"));
      quick("Products", brief(activeAnswer("wholesaleProducts")));
      quick("Per order", activeAnswer("wholesaleVolume") || "Quantity to discuss with Bryce");
      quick("Frequency", activeAnswer("wholesaleFrequency"));
      quick("Fulfillment", activeAnswer("wholesaleFulfillment"));
    }
    // Always show the full dietary note, even when the rest of the review is compact.
    quick("Dietary needs", activeAnswer("dietaryDetails") || activeAnswer("dietaryNeeds"));
  };
  const showStep = (index, focus = false) => {
    currentStep = Math.max(0, Math.min(steps.length - 1, index));
    // Hidden steps remain enabled: all relevant answers must be included in FormData.
    steps.forEach((step) => { step.hidden = Number(step.dataset.formStep) !== currentStep; });
    progress.forEach((button) => {
      if (Number(button.dataset.stepGo) === currentStep) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    back.hidden = currentStep === 0;
    next.hidden = currentStep === steps.length - 1;
    submit.hidden = !next.hidden;
    get("inquiryStepStatus").textContent = `Step ${currentStep + 1} of ${steps.length}: ${stepNames[currentStep]}.`;
    form.dataset.step = String(currentStep);
    if (currentStep === 2) renderReview();
    if (focus) get(`inquiryStepTitle${currentStep}`).focus();
  };
  const focusInput = (input) => {
    showStep(stepOf(input));
    let parent = input.parentElement;
    while (parent && parent !== form) {
      if (parent.tagName === "DETAILS") {
        parent.open = true;
        parent.dataset.interacted = "true";
      }
      parent = parent.parentElement;
    }
    input.focus();
  };
  const showStatus = (message, state = "info", focus = false) => {
    status.textContent = message;
    status.dataset.state = state;
    status.hidden = false;
    if (focus) status.focus();
  };
  const clearFeedback = () => {
    fields.hidden = false;
    modeNote.hidden = false;
    get("inquiryStartAgain").hidden = true;
    status.hidden = true;
    status.textContent = "";
    delete status.dataset.state;
    fallback.hidden = true;
    emailText.value = "";
    emailLink.href = `mailto:${recipient}`;
    copyButton.textContent = "Copy inquiry";
    photoFollowup.hidden = true;
    photoEmail.href = `mailto:${recipient}`;
    get("inquiryPhotoMatch").textContent = "";
  };
  const renderErrors = () => {
    errorList.replaceChildren();
    inputs.forEach((input) => {
      const message = errors.get(input.id);
      const inline = get(`${input.id}Error`);
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
        focusInput(input);
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
    const toggle = (panel, active) => { panel.hidden = !active; panel.disabled = !active; };
    panels.forEach((panel) => toggle(panel, panel.dataset.requestFields === selectedType()));
    products.forEach((panel) => toggle(panel, selectedType() === "custom" &&
      panel.dataset.productFields.split(/\s+/).includes(valueOf("orderType"))));
    conditionals.forEach((panel) => toggle(panel,
      panel.dataset.values.split(/\s+/).includes(valueOf(panel.dataset.when))));
    get("eventDate").required = valueOf("eventTiming") === "fixed";
    get("eventDateLabel").textContent = get("eventDate").required ? "Date needed *" : "Preferred date (optional)";
    const quantityLabel = ["cake", "catering"].includes(valueOf("orderType")) ? "Guests / servings needed"
      : valueOf("orderType") === "pies" ? "Number of pies needed" : "Total pieces needed";
    get("orderQuantityLabel").textContent = `${quantityLabel} *`;
    get("orderQuantity").dataset.summaryLabel = quantityLabel;
    get("inquiryStepTitle1").textContent = selectedType() === "wholesale" ? "A little about your needs" : "Tell Bryce your idea";
    inputs.filter((input) => !input.willValidate).forEach((input) => errors.delete(input.id));
  };
  const validateInput = (input) => {
    if (!input.willValidate) return "";
    const value = input.value.trim();
    const label = labelOf(input);
    if (input.required && !value) return `${label}: please choose an option or enter an answer.`;
    if (input.validity.badInput) return `${label}: enter a valid ${input.type === "number" ? "number" : "value"}.`;
    if (!value) return "";
    if (input.type === "email" && input.validity.typeMismatch) return "Enter a valid email address, such as name@example.com.";
    if (input.maxLength > -1 && value.length > input.maxLength) return `${label} must be ${input.maxLength} characters or fewer.`;
    if (input.type === "date" && value < localToday()) return input.required
      ? `${label}: choose today or a future date. If unsure, change your timing choice to flexible or still planning.`
      : `${label}: choose today or a future date, or leave this optional date blank.`;
    if (input.validity.rangeUnderflow || input.validity.rangeOverflow) return `${label} must be between ${input.min} and ${input.max}.`;
    if (input.validity.stepMismatch) return `${label}: enter a whole number.`;
    if (input.id === "inspirationLinks") {
      const links = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (links.length > 3) return "Please include no more than 3 inspiration links, one per line.";
      const invalid = links.some((link) => {
        try { const url = new URL(link); return !/^https?:\/\//i.test(link) || !["http:", "https:"].includes(url.protocol) || !url.hostname || Boolean(url.username || url.password); }
        catch { return true; }
      });
      if (invalid) return "Use complete http:// or https:// inspiration links, one per line, without a username or password in the link.";
    }
    if (!input.validity.valid) return `${label}: please check this value.`;
    return "";
  };
  const validate = (predicate = () => true) => {
    clearErrors();
    updateMinimumDates();
    inputs.filter(predicate).forEach((input) => {
      if (input.willValidate && input.type !== "number" && input.type !== "date") input.value = input.value.trim();
      const message = validateInput(input);
      if (message) errors.set(input.id, message);
    });
    renderErrors();
    if (errors.size) focusInput(inputs.find((input) => errors.has(input.id)));
    return errors.size === 0;
  };
  const navigate = (destination) => {
    if (busy) return;
    if (destination > currentStep && !validate((input) => stepOf(input) < destination)) return;
    clearErrors();
    showStep(destination, true);
  };
  const createSummary = () => [requestSubject(), "", ...answers().map(({ label, value }) => `${label}: ${value}`),
    "", "Please let me know about availability, pricing, and next steps."].join("\n");
  const showEmailFallback = (summary, subject) => {
    emailText.value = summary;
    emailLink.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(summary)}`;
    fallback.hidden = false;
  };
  const showPhotoFollowup = (identity, subject) => {
    const body = `Hi Bryce,\n\nI just submitted this inquiry on your website:\n${identity}\n\nI have attached inspiration photos for this request.\n\nThank you!`;
    photoEmail.href = `mailto:${recipient}?subject=${encodeURIComponent(`Inspiration photos | ${subject}`)}&body=${encodeURIComponent(body)}`;
    get("inquiryPhotoMatch").textContent = `Use this email draft to match your photos to the inquiry you just sent: ${identity.replace(/\n/g, " · ")}`;
    photoFollowup.hidden = false;
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
    showStep(0);
  }));
  const updateAnswer = (event) => {
    if (busy || !inputs.includes(event.target)) return;
    rememberDisclosure(event.target);
    clearFeedback();
    generalErrors = [];
    updatePanels();
    if (errors.has(event.target.id)) {
      const message = validateInput(event.target);
      if (message) errors.set(event.target.id, message);
      else errors.delete(event.target.id);
    }
    renderErrors();
    if (currentStep === 2) renderReview();
  };
  form.addEventListener("input", updateAnswer);
  form.addEventListener("change", updateAnswer);
  disclosures.forEach((details) => {
    const summary = details.querySelector(":scope > summary");
    summary.addEventListener("click", () => { details.dataset.interacted = "true"; });
    summary.addEventListener("keydown", (event) => {
      if (["Enter", " "].includes(event.key)) details.dataset.interacted = "true";
    });
  });
  if (typeof compactView.addEventListener === "function") compactView.addEventListener("change", adaptDisclosures);
  else compactView.addListener(adaptDisclosures);
  next.addEventListener("click", () => navigate(currentStep + 1));
  back.addEventListener("click", () => navigate(currentStep - 1));
  progress.forEach((button) => button.addEventListener("click", () => navigate(Number(button.dataset.stepGo))));
  // Enter advances the current stage; textareas keep their normal multiline behavior.
  form.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.isComposing && event.keyCode !== 229 && currentStep < 2 && event.target.tagName === "INPUT" && event.target.type !== "radio") {
      event.preventDefault();
      navigate(currentStep + 1);
    }
  });
  get("inquiryStartAgain").addEventListener("click", () => {
    clearFeedback();
    clearErrors();
    showStep(0, true);
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
    if (currentStep < 2) { navigate(currentStep + 1); return; }
    clearFeedback();
    if (!validate()) return;
    const honeypot = form.querySelector('[name="_gotcha"]');
    if (honeypot?.value.trim()) {
      showStatus("We couldn’t prepare this inquiry. Please contact Bryce by email or phone.", "error", true);
      return;
    }
    const summary = createSummary();
    const subject = requestSubject();
    const identity = [`Name: ${valueOf("contactName")}`, `Email: ${valueOf("contactEmail")}`,
      selectedType() === "wholesale" ? `Business: ${valueOf("businessName")}`
        : `Request: ${get("orderType").selectedOptions[0].textContent.trim()}${get("eventDate").willValidate && valueOf("eventDate") ? `; date: ${valueOf("eventDate")}` : "; date still being planned"}`].join("\n");
    if (!endpoint) {
      showEmailFallback(summary, subject);
      showStatus("Your email draft is ready. Nothing has been sent yet. Open it in your email app or copy the details below, then send it to Bryce.", "info", true);
      return;
    }
    // Capture before disabling controls. Irrelevant branches are disabled and omitted.
    const payload = new FormData(form);
    payload.set("subject", subject);
    payload.set("request_type", selectedType());
    payload.set("inquiry_summary", summary);
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
      try { result = await response.json(); } catch { /* Unreadable responses cannot confirm receipt. */ }
      setBusy(false);
      const hasErrors = Boolean(result?.error) || (result?.errors != null &&
        (!Array.isArray(result.errors) || result.errors.length > 0));
      const accepted = result?.ok !== false && (result?.ok === true || typeof result?.next === "string");
      if (response.ok && accepted && !hasErrors) {
        form.reset();
        disclosures.forEach((details) => { delete details.dataset.interacted; });
        adaptDisclosures();
        updatePanels();
        clearErrors();
        showStep(0);
        fields.hidden = true;
        modeNote.hidden = true;
        get("inquiryStartAgain").hidden = false;
        showPhotoFollowup(identity, subject);
        showStatus("Thank you—your inquiry has been submitted. Bryce will confirm availability, pricing, and next steps with you. Your order or wholesale account is not confirmed yet.", "success", true);
      } else {
        showEmailFallback(summary, subject);
        showRemoteErrors(result);
        const message = response.status === 429
          ? "We’re receiving too many requests right now. Please wait a few minutes before trying again, or contact Bryce by email. Your details are still here."
          : response.ok
            ? "We couldn’t confirm that your inquiry was received. Please contact Bryce before sending it again to avoid a duplicate. Your details are still here."
            : "Your inquiry couldn’t be submitted. Please check any highlighted details, try again later, or contact Bryce by email. Your details are still here.";
        showStatus(message, "error");
        const invalid = inputs.find((input) => errors.has(input.id));
        if (invalid) focusInput(invalid);
        else status.focus();
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
      const orderType = get("orderType");
      if (type === "custom" && link.dataset.orderType &&
          Array.from(orderType.options).some((option) => option.value === link.dataset.orderType)) orderType.value = link.dataset.orderType;
      if (link.id === "dialogInquiry") {
        get("inquiryInspiration").value = get("dialogTitle").textContent.trim();
        get("customInspiration").open = true;
        get("customInspiration").dataset.interacted = "true";
        const dialog = get("galleryDialog");
        if (dialog?.open) { dialog.dataset.inquiryNavigation = "true"; dialog.close(); }
      }
      updatePanels();
      clearErrors();
      clearFeedback();
      showStep(0);
      form.focus({ preventScroll: true });
    });
  });

  fields.disabled = false;
  updatePanels();
  updateMinimumDates();
  showStep(0);
  adaptDisclosures();
  form.dataset.ready = "true";
  // With JavaScript ready, inquiry links land on the controls, including on phones.
  // Without JavaScript, the original section anchor still reaches the email fallback.
  doc.querySelectorAll('a[href="#inquire"]').forEach((link) => {
    link.setAttribute("href", "#inquiryForm");
    link.dataset.section = "inquire";
    if (!link.dataset.inquiryType) link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (busy) { event.preventDefault(); return; }
      // Start a fresh inquiry after confirmation; otherwise resume the current draft.
      if (fields.hidden) {
        clearFeedback();
        clearErrors();
        showStep(0);
      }
      form.focus({ preventScroll: true });
    });
  });
}

function initializePageMotion() {
  const header = document.getElementById("siteHeader");
  const main = document.getElementById("main");
  if (!header || !main) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktopMotion = window.matchMedia("(min-width: 801px) and (hover: hover) and (pointer: fine)");
  // The general inquiry link represents the section; mode shortcuts do not label it.
  const navLinks = Array.from(header.querySelectorAll('nav a[href^="#"]'))
    .filter((link) => !link.dataset?.inquiryType);
  const sections = Array.from(main.children).filter((element) => element.tagName === "SECTION");
  const heroArt = main.querySelector(".hero-art");
  const photoLayers = Array.from(main.querySelectorAll("[data-scroll-shift]"));
  const revealTargets = Array.from(main.querySelectorAll([
    ".hero-description", ".hero-copy > .button-row", ".section-heading", ".product-card",
    ".custom-intro", ".gallery-toolbar", ".gallery-card", ".custom-note",
    ".wholesale-copy", ".wholesale-photo", ".gathering-photo", ".gathering-copy",
    ".story-art", ".story-copy", ".visit-copy", ".hours-card",
    ".mystery-copy", ".mystery-photo"
  ].join(",")));
  const cardDelays = new Map();
  [".product-card", ".gallery-card"].forEach((selector) => {
    main.querySelectorAll(selector).forEach((card, index) => cardDelays.set(card, (index % 4) * 65));
  });
  const revealed = new Set();
  const animations = new Map();
  let revealObserver = null;
  let frame = 0;
  let currentLink = null;
  let photosShifted = false;

  const resetPhotos = () => {
    if (!photosShifted) return;
    photoLayers.forEach((photo) => photo.style.removeProperty("translate"));
    photosShifted = false;
  };
  const cancelReveals = () => {
    animations.forEach((animation) => animation.cancel());
    animations.clear();
  };
  const updateScroll = () => {
    frame = 0;
    if (document.hidden) return;

    // Batch geometry reads before style writes; there is no animation loop when idle.
    const viewportHeight = window.innerHeight;
    const headerHeight = header.getBoundingClientRect().height;
    const marker = headerHeight + Math.max(0, (viewportHeight - headerHeight) * .22);
    const positions = sections.map((section) => ({ section, bounds: section.getBoundingClientRect() }));
    const current = positions.find(({ bounds }) => bounds.top <= marker && bounds.bottom > marker)?.section;
    const nextLink = navLinks.find((link) =>
      (link.dataset?.section || link.getAttribute("href").slice(1)) === current?.id) || null;
    const scrollRange = document.documentElement.scrollHeight - viewportHeight;
    const progress = scrollRange > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollRange)) : 0;
    const heroBounds = !reducedMotion.matches && desktopMotion.matches && heroArt
      ? heroArt.getBoundingClientRect() : null;

    header.classList.toggle("is-scrolled", window.scrollY > 16);
    if (!reducedMotion.matches) header.style.setProperty("--scroll-progress", progress.toFixed(4));
    if (nextLink !== currentLink) {
      currentLink?.removeAttribute("aria-current");
      nextLink?.setAttribute("aria-current", "location");
      currentLink = nextLink;
    }
    if (heroBounds && heroBounds.bottom > headerHeight && heroBounds.top < viewportHeight) {
      const phase = Math.max(-1, Math.min(1,
        (viewportHeight / 2 - heroBounds.top - heroBounds.height / 2) / ((viewportHeight + heroBounds.height) / 2)));
      photoLayers.forEach((photo) => {
        // Individual translate preserves the original photograph and stamp rotations.
        photo.style.translate = `0 ${(phase * Number(photo.dataset.scrollShift)).toFixed(2)}px`;
      });
      photosShifted = true;
    } else resetPhotos();
  };
  const scheduleUpdate = () => {
    if (!frame && !document.hidden) frame = window.requestAnimationFrame(updateScroll);
  };
  const configureMotion = () => {
    revealObserver?.disconnect();
    cancelReveals();
    resetPhotos();
    if (reducedMotion.matches) {
      header.style.removeProperty("--scroll-progress");
    } else if (typeof window.IntersectionObserver === "function") {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting, boundingClientRect }) => {
          if (!isIntersecting && boundingClientRect.bottom >= 0) return;
          revealObserver.unobserve(target);
          revealed.add(target);
          // Hash destinations and keyboard-focused content should be immediately steady.
          if (!isIntersecting || reducedMotion.matches || document.hidden ||
              target.contains(document.activeElement) || target.closest(":target") ||
              typeof target.animate !== "function") return;
          const animation = target.animate([
            { opacity: .35, translate: `0 ${desktopMotion.matches ? 22 : 12}px` },
            { opacity: 1, translate: "0 0" }
          ], {
            duration: desktopMotion.matches ? 620 : 440,
            delay: desktopMotion.matches ? (cardDelays.get(target) || 0) : 0,
            easing: "cubic-bezier(.2,.7,.2,1)",
            fill: "backwards"
          });
          animations.set(target, animation);
          const cleanup = () => {
            if (animations.get(target) === animation) animations.delete(target);
          };
          animation.finished.then(cleanup, cleanup);
        });
      }, { threshold: .08, rootMargin: "0px 0px -24px 0px" });
      revealTargets.forEach((target) => {
        if (!revealed.has(target)) revealObserver.observe(target);
      });
    }
    scheduleUpdate();
  };

  document.addEventListener("focusin", (event) => {
    animations.forEach((animation, target) => {
      if (target.contains(event.target)) {
        animation.cancel();
        animations.delete(target);
      }
    });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(frame);
      frame = 0;
      cancelReveals();
    } else scheduleUpdate();
  });
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  window.addEventListener("load", scheduleUpdate, { once: true });
  [reducedMotion, desktopMotion].forEach((query) => {
    if (typeof query.addEventListener === "function") query.addEventListener("change", configureMotion);
    else query.addListener(configureMotion);
  });
  // Gallery filtering and late-loading content can change the page's scroll range.
  if (typeof window.ResizeObserver === "function") new ResizeObserver(scheduleUpdate).observe(main);
  header.dataset.motionReady = "true";
  configureMotion();
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
        const category = link.closest("[data-gallery-item]")?.dataset.category;
        const inquiryLink = document.getElementById("dialogInquiry");
        if (inquiryLink) inquiryLink.dataset.orderType = ({ cakes: "cake", cookies: "cookies", cupcakes: "cupcakes" })[category] || "other";

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
        document.getElementById("inquiryForm")?.focus({ preventScroll: true });
      } else if (opener && opener.isConnected && opener.getClientRects().length) opener.focus();
      opener = null;
    });
  }
  initializeInquiryForm(document.getElementById("inquiryForm"));
  initializePageMotion();
})();
