/**
 * كنز ميديا | KANZ MEDIA - Modern Interactive JavaScript
 * Ultra-lightweight Vanilla JS (Zero Bloat, Full Parity with Flutter App)
 */

document.addEventListener("DOMContentLoaded", () => {
  // =========================================================================
  // 0. Unified Version Control (Single Source of Truth + Supabase Delta Sync)
  // =========================================================================
  const SUPABASE_PROJECT_URL = "https://cviwcitikudsxwmvjozu.supabase.co";
  const SUPABASE_PUB_KEY = "sb_publishable_szRd3eKZXpO2OVjsyMptsQ_xT7lPTxl";
  const DEFAULT_APP_VERSION = "1.0.0";
  const DEFAULT_APK_URL = "https://kanz.sulaimansho.com/kanz_media.apk";

  let currentAppVersion = DEFAULT_APP_VERSION;
  let currentApkUrl = DEFAULT_APK_URL;
  let cachedUpdatedAt = "";

  try {
    const savedVer = localStorage.getItem("kanz_cached_version");
    const savedUrl = localStorage.getItem("kanz_cached_apk_url");
    const savedTs = localStorage.getItem("kanz_cached_updated_at");
    if (savedVer && /^[0-9]+\.[0-9]+/.test(savedVer)) {
      currentAppVersion = savedVer;
    }
    if (savedUrl && savedUrl.startsWith("http")) {
      currentApkUrl = savedUrl;
    }
    if (savedTs) {
      cachedUpdatedAt = savedTs;
    }
  } catch (_) {}

  function applyUnifiedVersion(versionStr, apkUrlStr) {
    if (versionStr && /^[0-9]+\.[0-9]+/.test(versionStr)) {
      currentAppVersion = versionStr.trim();
    }
    if (apkUrlStr && apkUrlStr.startsWith("http")) {
      currentApkUrl = apkUrlStr.trim();
    }

    document.querySelectorAll("[data-version-template]").forEach((el) => {
      const tpl = el.getAttribute("data-version-template");
      if (tpl) {
        el.textContent = tpl.replace(/\{v\}/g, currentAppVersion);
      }
    });

    document.querySelectorAll('a[href*="kanz_media.apk"]').forEach((link) => {
      link.href = currentApkUrl;
    });
  }

  // Apply cached version immediately (0ms, zero network wait)
  applyUnifiedVersion(currentAppVersion, currentApkUrl);

  // Conditional Delta Sync: only fetches data if latest_version or updated_at changed in Supabase
  async function syncVersionIfChanged() {
    try {
      // Avoid redundant checks on every reload within the same active tab session
      if (sessionStorage.getItem("kanz_ver_checked_session") === "1" && cachedUpdatedAt) {
        return;
      }

      let endpoint = `${SUPABASE_PROJECT_URL}/rest/v1/app_version_control?id=eq.app_version&select=latest_version,android_download_url,updated_at`;
      if (cachedUpdatedAt && currentAppVersion) {
        const encVer = encodeURIComponent(currentAppVersion);
        const encTs = encodeURIComponent(cachedUpdatedAt);
        endpoint = `${SUPABASE_PROJECT_URL}/rest/v1/app_version_control?id=eq.app_version&or=(latest_version.neq.${encVer},updated_at.gt.${encTs})&select=latest_version,android_download_url,updated_at`;
      }

      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          apikey: SUPABASE_PUB_KEY,
          Authorization: `Bearer ${SUPABASE_PUB_KEY}`,
          Accept: "application/json",
        },
      });

      if (res.ok) {
        sessionStorage.setItem("kanz_ver_checked_session", "1");
        const rows = await res.json();
        // If rows is [] (2 bytes), nothing changed in Supabase!
        if (Array.isArray(rows) && rows.length > 0) {
          const rec = rows[0];
          const newVer = rec.latest_version || DEFAULT_APP_VERSION;
          const newUrl = rec.android_download_url || DEFAULT_APK_URL;
          const newTs = rec.updated_at || "";

          cachedUpdatedAt = newTs;
          try {
            localStorage.setItem("kanz_cached_version", newVer);
            localStorage.setItem("kanz_cached_apk_url", newUrl);
            if (newTs) localStorage.setItem("kanz_cached_updated_at", newTs);
          } catch (_) {}

          applyUnifiedVersion(newVer, newUrl);
        }
      }
    } catch (_) {}
  }

  // Live Realtime WebSocket listener: pushes version changes from Supabase immediately
  function connectVersionRealtime() {
    if (typeof WebSocket === "undefined") return;
    try {
      const wsUrl = `${SUPABASE_PROJECT_URL.replace("https://", "wss://")}/realtime/v1/websocket?apikey=${SUPABASE_PUB_KEY}&vsn=1.0.0`;
      const ws = new WebSocket(wsUrl);
      let hbInterval = null;

      ws.addEventListener("open", () => {
        ws.send(
          JSON.stringify({
            topic: "realtime:public:app_version_control",
            event: "phx_join",
            payload: {
              config: {
                broadcast: { self: false },
                presence: { key: "" },
                postgres_changes: [
                  {
                    event: "*",
                    schema: "public",
                    table: "app_version_control",
                  },
                ],
              },
            },
            ref: "web_ver_1",
          })
        );

        hbInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                topic: "phoenix",
                event: "heartbeat",
                payload: {},
                ref: "hb",
              })
            );
          }
        }, 25000);
      });

      ws.addEventListener("message", (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg && msg.event === "postgres_changes") {
            const record = msg.payload && msg.payload.data && msg.payload.data.record;
            if (record && record.latest_version) {
              const newVer = String(record.latest_version);
              const newUrl = record.android_download_url
                ? String(record.android_download_url)
                : currentApkUrl;
              const newTs = record.updated_at ? String(record.updated_at) : "";
              cachedUpdatedAt = newTs;
              try {
                localStorage.setItem("kanz_cached_version", newVer);
                localStorage.setItem("kanz_cached_apk_url", newUrl);
                if (newTs) localStorage.setItem("kanz_cached_updated_at", newTs);
              } catch (_) {}
              applyUnifiedVersion(newVer, newUrl);
            }
          }
        } catch (_) {}
      });

      ws.addEventListener("close", () => {
        if (hbInterval) clearInterval(hbInterval);
      });
    } catch (_) {}
  }

  // =========================================================================
  // 0.5 Privacy-First Website Visitor Analytics (Same Phone vs Different Phones)
  // =========================================================================
  function getCookieValue(name) {
    try {
      const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
      return match ? decodeURIComponent(match[2]) : "";
    } catch (_) {
      return "";
    }
  }

  function setLongLivedCookie(name, value) {
    try {
      const maxAge = 400 * 24 * 60 * 60; // 400 days
      document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
    } catch (_) {}
  }

  async function sha256Hex16(input) {
    try {
      if (window.crypto && window.crypto.subtle) {
        const buf = new TextEncoder().encode(input);
        const hashBuf = await window.crypto.subtle.digest("SHA-256", buf);
        const hashArr = Array.from(new Uint8Array(hashBuf));
        return hashArr
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
          .slice(0, 16);
      }
    } catch (_) {}
    // Fallback deterministic 64-bit FNV-1a twin hash
    let h1 = 0x811c9dc5;
    let h2 = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      const c = input.charCodeAt(i);
      h1 ^= c;
      h1 = Math.imul(h1, 0x01000193);
      h2 ^= c ^ (i & 0xff);
      h2 = Math.imul(h2, 0x01000193);
    }
    return (
      (h1 >>> 0).toString(16).padStart(8, "0") +
      (h2 >>> 0).toString(16).padStart(8, "0")
    );
  }

  function detectDeviceTypeAndOs() {
    const ua = navigator.userAgent || "";
    let isMobile = false;
    try {
      if (navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean") {
        isMobile = navigator.userAgentData.mobile;
      } else {
        isMobile =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua) ||
          (navigator.maxTouchPoints > 1 &&
            Math.min(window.screen.width || 9999, window.screen.height || 9999) <= 840);
      }
    } catch (_) {}

    let osName = "Other";
    if (/Android/i.test(ua)) osName = "Android";
    else if (/iPhone|iPad|iPod/i.test(ua)) osName = "iOS";
    else if (/Windows/i.test(ua)) osName = "Windows";
    else if (/Mac OS X|Macintosh/i.test(ua)) {
      osName = navigator.maxTouchPoints > 1 ? "iOS" : "Mac";
      if (osName === "iOS") isMobile = true;
    } else if (/CrOS/i.test(ua)) osName = "ChromeOS";
    else if (/Linux/i.test(ua)) osName = "Linux";

    return {
      typeCode: isMobile ? "mob" : "pc",
      osName,
    };
  }

  async function computeAnonymousDeviceVisitorId() {
    const { typeCode, osName } = detectDeviceTypeAndOs();

    // 1. Check existing persistent device hash (localStorage or 400-day 1st-party Cookie)
    let storedId = "";
    try {
      storedId = localStorage.getItem("kanz_vid") || "";
    } catch (_) {}
    if (!storedId) {
      storedId = getCookieValue("kanz_vid");
    }
    if (storedId && /^web_v_(mob|pc)_[A-Za-z]+_[0-9a-f]{16}$/.test(storedId)) {
      try {
        localStorage.setItem("kanz_vid", storedId);
      } catch (_) {}
      setLongLivedCookie("kanz_vid", storedId);
      return storedId;
    }
    // Upgrade legacy web_v_<16_hex> IDs seamlessly while keeping the same device hash
    if (storedId && /^web_v_[0-9a-f]{16}$/.test(storedId)) {
      const legacyHex = storedId.slice(-16);
      const upgradedId = `web_v_${typeCode}_${osName}_${legacyHex}`;
      try {
        localStorage.setItem("kanz_vid", upgradedId);
      } catch (_) {}
      setLongLivedCookie("kanz_vid", upgradedId);
      return upgradedId;
    }

    // 2. Collect anonymous hardware & screen characteristics (never leaves the phone unhashed)
    let modelToken = "";
    try {
      if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
        const hi = await navigator.userAgentData.getHighEntropyValues([
          "model",
          "platformVersion",
          "architecture",
        ]);
        modelToken = [hi.model || "", hi.platformVersion || "", hi.architecture || ""].join("|");
      }
    } catch (_) {}

    if (!modelToken) {
      const ua = navigator.userAgent || "";
      const androidMatch = ua.match(/\((?:Linux; )?Android [^;]+; ([^)]+)\)/i);
      if (androidMatch && androidMatch[1]) {
        modelToken = androidMatch[1].replace(/Build\/.*$/i, "").trim();
      } else {
        modelToken = ua.replace(/\/[0-9.]+/g, "");
      }
    }

    // WebGL unmasked GPU renderer
    let gpuInfo = "";
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (gl) {
        const dbg = gl.getExtension("WEBGL_debug_renderer_info");
        const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
        const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
        gpuInfo = `${vendor || ""}|${renderer || ""}`;
      }
    } catch (_) {}

    // Orientation-independent physical screen resolution & pixel ratio
    const sw = Math.min(window.screen.width || 0, window.screen.height || 0);
    const sh = Math.max(window.screen.width || 0, window.screen.height || 0);
    const dpr = Number(window.devicePixelRatio || 1).toFixed(2);
    const screenSpec = `${sw}x${sh}@${dpr}c${window.screen.colorDepth || 24}`;

    // CPU cores, RAM tier, touch points, timezone
    const cores = navigator.hardwareConcurrency || 0;
    const mem = navigator.deviceMemory || 0;
    const touch = navigator.maxTouchPoints || 0;
    let tz = "";
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch (_) {}

    // Sub-pixel Canvas 2D rendering signature
    let canvasSig = "";
    try {
      const c2 = document.createElement("canvas");
      c2.width = 120;
      c2.height = 28;
      const ctx = c2.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#7c3aed";
        ctx.fillRect(10, 2, 45, 18);
        ctx.fillStyle = "#22d3ee";
        ctx.font = "13px sans-serif";
        ctx.fillText("KanzMedia_v1", 4, 18);
        canvasSig = c2.toDataURL().slice(-48);
      }
    } catch (_) {}

    // On generic iOS UAs where Apple hides the exact model name, add a persistent salt so different iPhones never collide
    let iosDeviceSalt = "";
    if (/iPhone|iPad/i.test(navigator.userAgent || "")) {
      iosDeviceSalt = getCookieValue("kanz_ios_salt");
      if (!iosDeviceSalt) {
        try {
          iosDeviceSalt = localStorage.getItem("kanz_ios_salt") || "";
        } catch (_) {}
      }
      if (!iosDeviceSalt) {
        iosDeviceSalt = Math.random().toString(36).slice(2) + Date.now().toString(36);
        setLongLivedCookie("kanz_ios_salt", iosDeviceSalt);
        try {
          localStorage.setItem("kanz_ios_salt", iosDeviceSalt);
        } catch (_) {}
      }
    }

    const rawFingerprint = [
      modelToken,
      gpuInfo,
      screenSpec,
      cores,
      mem,
      touch,
      tz,
      canvasSig,
      iosDeviceSalt,
    ].join("::");

    const hex16 = await sha256Hex16(rawFingerprint);
    const visitorId = `web_v_${typeCode}_${osName}_${hex16}`;

    try {
      localStorage.setItem("kanz_vid", visitorId);
    } catch (_) {}
    setLongLivedCookie("kanz_vid", visitorId);

    return visitorId;
  }

  async function recordWebsiteVisit() {
    try {
      // Prevent duplicate firing within the same 1.5s page load
      const nowMs = Date.now();
      let lastVisitMs = 0;
      try {
        lastVisitMs = parseInt(sessionStorage.getItem("kanz_last_visit_ts") || "0", 10);
      } catch (_) {}
      if (nowMs - lastVisitMs < 1500) {
        return;
      }
      try {
        sessionStorage.setItem("kanz_last_visit_ts", String(nowMs));
      } catch (_) {}

      const visitorId = await computeAnonymousDeviceVisitorId();

      // Atomic server-side increment via PostgreSQL RPC (record_website_visit)
      // 1 single lightweight request, 0 SELECT queries, 0 data leakage
      await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/record_website_visit`, {
        method: "POST",
        keepalive: true,
        headers: {
          apikey: SUPABASE_PUB_KEY,
          Authorization: `Bearer ${SUPABASE_PUB_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_device_hash: visitorId,
        }),
      });
    } catch (_) {}
  }

  // Run network tasks asynchronously after initial render so page load is 100% instant
  const scheduleIdle = window.requestIdleCallback || ((cb) => setTimeout(cb, 150));
  scheduleIdle(() => {
    syncVersionIfChanged();
    connectVersionRealtime();
    recordWebsiteVisit();
  });

  // =========================================================================
  // 1. Mobile Menu Drawer Management
  // =========================================================================
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const drawerCloseBtn = document.getElementById("drawerCloseBtn");
  const mobileDrawer = document.getElementById("mobileDrawer");
  const drawerBackdrop = document.getElementById("drawerBackdrop");
  const mobileLinks = document.querySelectorAll(".mobile-nav-links .m-link");

  function openDrawer() {
    if (!mobileDrawer) return;
    mobileDrawer.classList.add("open");
    if (drawerBackdrop) drawerBackdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    if (!mobileDrawer) return;
    mobileDrawer.classList.remove("open");
    if (drawerBackdrop) drawerBackdrop.classList.remove("open");
    document.body.style.overflow = "";
  }

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", openDrawer);
  }

  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener("click", closeDrawer);
  }

  if (drawerBackdrop) {
    drawerBackdrop.addEventListener("click", closeDrawer);
  }

  mobileLinks.forEach((link) => {
    link.addEventListener("click", closeDrawer);
  });

  // Close drawer if user clicks outside
  document.addEventListener("click", (e) => {
    if (
      mobileDrawer &&
      mobileDrawer.classList.contains("open") &&
      !mobileDrawer.contains(e.target) &&
      mobileMenuBtn &&
      !mobileMenuBtn.contains(e.target)
    ) {
      closeDrawer();
    }
  });

  // =========================================================================
  // 2. Mockup Interactive Controls (Paste, Close Reminder, Share Feedback)
  // =========================================================================
  const mockupPasteDemoBtn = document.getElementById("mockupPasteDemoBtn");
  const mockupPlaceholder = document.querySelector(".mockup-input-placeholder");
  if (mockupPasteDemoBtn && mockupPlaceholder) {
    mockupPasteDemoBtn.addEventListener("click", () => {
      const origHtml = mockupPasteDemoBtn.innerHTML;
      const origText = mockupPlaceholder.textContent;
      mockupPasteDemoBtn.innerHTML = '<i class="fa-solid fa-check" style="color: #34d399;"></i>';
      mockupPlaceholder.textContent = "https://www.instagram.com/reel/C8k9x...";
      mockupPlaceholder.style.color = "#ffffff";
      setTimeout(() => {
        mockupPasteDemoBtn.innerHTML = origHtml;
        mockupPlaceholder.textContent = origText;
        mockupPlaceholder.style.color = "";
      }, 2500);
    });
  }

  const mockupReminderCloseBtn = document.getElementById("mockupReminderCloseBtn");
  const mockupReminderCard = document.getElementById("mockupReminderCard");
  if (mockupReminderCloseBtn && mockupReminderCard) {
    mockupReminderCloseBtn.addEventListener("click", () => {
      mockupReminderCard.style.opacity = "0";
      mockupReminderCard.style.transform = "scale(0.96)";
      setTimeout(() => {
        mockupReminderCard.style.display = "none";
      }, 300);
    });
  }

  // =========================================================================
  // 3. Authentic Flutter App Trimmer Interactive Logic
  // =========================================================================
  const trimToggle = document.getElementById("trimToggleCheckbox");
  const trimSubtitle = document.getElementById("trimToggleSubtitle");
  const trimControls = document.getElementById("trimmerTimeControls");
  const trimPresetsWrapper = document.getElementById("trimmerPresets");
  const startMinInput = document.getElementById("startMin");
  const startSecInput = document.getElementById("startSec");
  const endMinInput = document.getElementById("endMin");
  const endSecInput = document.getElementById("endSec");
  const trimResultDuration = document.getElementById("trimResultDuration");
  const presetChips = document.querySelectorAll("#trimmerPresets .preset-chip");

  const TOTAL_VIDEO_SECONDS = 27 * 60 + 18; // 27:18 = 1638s

  function formatTrimTime(totalSec) {
    const m = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function syncTrimmer(startSecs, endSecs) {
    startSecs = Math.max(0, Math.min(startSecs, TOTAL_VIDEO_SECONDS));
    endSecs = Math.max(startSecs, Math.min(endSecs, TOTAL_VIDEO_SECONDS));

    if (startMinInput) startMinInput.value = Math.floor(startSecs / 60).toString().padStart(2, "0");
    if (startSecInput) startSecInput.value = (startSecs % 60).toString().padStart(2, "0");
    if (endMinInput) endMinInput.value = Math.floor(endSecs / 60).toString().padStart(2, "0");
    if (endSecInput) endSecInput.value = (endSecs % 60).toString().padStart(2, "0");

    if (trimResultDuration) {
      trimResultDuration.textContent = formatTrimTime(endSecs - startSecs);
    }
  }

  function handleManualInput() {
    let sMin = parseInt(startMinInput?.value || "0", 10) || 0;
    let sSec = parseInt(startSecInput?.value || "0", 10) || 0;
    let eMin = parseInt(endMinInput?.value || "27", 10) || 0;
    let eSec = parseInt(endSecInput?.value || "18", 10) || 0;

    let start = sMin * 60 + sSec;
    let end = eMin * 60 + eSec;

    if (start > end) {
      end = start;
    }
    if (end > TOTAL_VIDEO_SECONDS) {
      end = TOTAL_VIDEO_SECONDS;
    }

    // Update active preset chip state
    presetChips.forEach((chip) => {
      const cStart = parseInt(chip.dataset.start, 10);
      const cEnd = parseInt(chip.dataset.end, 10);
      if (cStart === start && cEnd === end) {
        chip.classList.add("active");
      } else {
        chip.classList.remove("active");
      }
    });

    if (trimResultDuration) {
      trimResultDuration.textContent = formatTrimTime(end - start);
    }
  }

  // Preset chips click
  if (presetChips.length > 0) {
    presetChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        if (trimToggle && !trimToggle.checked) return;
        presetChips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");

        const start = parseInt(chip.dataset.start, 10);
        const end = parseInt(chip.dataset.end, 10);
        syncTrimmer(start, end);
      });
    });
  }

  // Number input listeners
  [startMinInput, startSecInput, endMinInput, endSecInput].forEach((input) => {
    if (input) {
      input.addEventListener("input", handleManualInput);
      input.addEventListener("change", () => {
        // format nicely on blur/change
        let val = parseInt(input.value || "0", 10) || 0;
        input.value = val.toString().padStart(2, "0");
        handleManualInput();
      });
    }
  });

  // Toggle checkbox listener
  if (trimToggle) {
    trimToggle.addEventListener("change", () => {
      const isEnabled = trimToggle.checked;
      if (trimSubtitle) {
        trimSubtitle.textContent = isEnabled
          ? "تم تفعيل الاقتطاف: حدد وقت البداية والنهاية"
          : "تم إيقاف الاقتطاف: سيتم تحميل الفيديو كاملاً";
      }

      if (trimControls) {
        trimControls.style.opacity = isEnabled ? "1" : "0.4";
        trimControls.style.pointerEvents = isEnabled ? "auto" : "none";
      }
      if (trimPresetsWrapper) {
        trimPresetsWrapper.style.opacity = isEnabled ? "1" : "0.4";
        trimPresetsWrapper.style.pointerEvents = isEnabled ? "auto" : "none";
      }

      if (!isEnabled) {
        if (trimResultDuration) trimResultDuration.textContent = "27:18";
      } else {
        handleManualInput();
      }
    });
  }

  // =========================================================================
  // 3.1. Interactive Islamic Reminders Cycler
  // =========================================================================
  const reminderQuoteEl = document.getElementById("reminderQuote");
  const btnNextReminder = document.getElementById("btnNextReminder");
  const ISLAMIC_REMINDERS = [
    "اللهم اجعل ما حملته نافعاً لي في ديني ودنياي، واجعله شاهداً لي لا عليّ",
    "سبحان الله وبحمده، سبحان الله العظيم • تذكّر دائماً استثمار وقتك فيما يقرّبك إلى الله",
    "قال رسول الله ﷺ: «من دلَّ على خيرٍ فله مثلُ أجرِ فاعله» • انشر الخير والكلمة الطيبة",
    "اللهم إني أسألك علماً نافعاً، ورزقاً طيباً، وعملاً متقبلاً",
    "﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾ • بارك الله في وقتك ونفعك بما تعلمت"
  ];
  let reminderIndex = 0;

  if (btnNextReminder && reminderQuoteEl) {
    btnNextReminder.addEventListener("click", () => {
      reminderQuoteEl.style.opacity = "0";
      reminderQuoteEl.style.transform = "translateY(-6px)";
      setTimeout(() => {
        reminderIndex = (reminderIndex + 1) % ISLAMIC_REMINDERS.length;
        reminderQuoteEl.textContent = ISLAMIC_REMINDERS[reminderIndex];
        reminderQuoteEl.style.opacity = "1";
        reminderQuoteEl.style.transform = "translateY(0)";
      }, 200);
    });
  }

  // =========================================================================
  // 4. Authentic Live Simulator (Matches Screenshot 4 Confirmation Dialog)
  // =========================================================================
  const platformData = {
    tiktok: {
      url: "https://www.tiktok.com/@creator/video/73829104928172",
      name: "TikTok",
      size: "1.6 MB",
      duration: "00:43",
      desc: "تطبيق كنز ميديا: حمّل أي فيديو تيك توك بدون علامات مائية وبأعلى دقة بنقرة زر واحدة مجاناً! ⚡",
      thumb: "assets/og-preview.webp",
      iconSvg: '<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />'
    },
    instagram: {
      url: "https://www.instagram.com/reel/C8k9xLMtpA2/",
      name: "Instagram",
      size: "16.4 MB",
      duration: "00:54",
      desc: "ودّع القيود وحمّل فيديوهات ريلز وقصص إنستغرام بجودة فائقة وبدون إعلانات مزعجة عبر كنز ميديا 🚀",
      thumb: "assets/og-preview.webp",
      iconSvg: '<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />'
    },
    youtube: {
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      name: "YouTube",
      size: "48.5 MB",
      duration: "03:40",
      desc: "حمّل مقاطع يوتيوب وفيديوهات شورتس بدقة 4K مع إمكانية تحويلها إلى صوت MP3 نقي وسريع 🎧",
      thumb: "assets/og-preview.webp",
      iconSvg: '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />'
    },
    whatsapp: {
      url: "حالات واتساب الرسمية (فحص الحالات المكتشفة تلقائياً)",
      name: "WhatsApp",
      size: "4.2 MB",
      duration: "00:30",
      desc: "احفظ حالات الأصدقاء ومقاطع واتساب قبل أن تختفي مباشرة إلى استوديو هاتفك بلمسة زر واحدة 📱",
      thumb: "assets/og-preview.webp",
      iconSvg: '<path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm5.79 14.07c-.24.68-1.2 1.25-1.72 1.31-.49.06-1.12.08-3.64-.96-3.09-1.28-5.08-4.42-5.23-4.63-.16-.2-1.25-1.67-1.25-3.18 0-1.51.78-2.26 1.06-2.56.28-.3.62-.37.83-.37.21 0 .42 0 .6.01.19.01.44-.07.69.52.26.6.87 2.12.95 2.27.08.15.13.33.03.53-.1.2-.15.33-.3.51-.15.17-.32.39-.46.52-.15.15-.31.31-.13.62.18.31.79 1.3 1.7 2.11 1.17 1.04 2.15 1.37 2.46 1.52.31.15.49.13.67-.08.18-.21.78-.91.99-1.22.21-.31.42-.26.7-.15.28.1.79.85 2.1.1.28.15.47.23.54.34.07.11.07.65-.17 1.33z" />'
    },
  };

  const simTabs = document.querySelectorAll(".sim-tab");
  const simUrlInput = document.getElementById("simUrlInput");
  const simTitle = document.getElementById("simTitle");
  const simDuration = document.getElementById("simDuration");
  const simSize = document.getElementById("simSize");
  const simPlatformName = document.getElementById("simPlatformName");
  const simPlatformIcon = document.getElementById("simPlatformIcon");
  const simThumbImg = document.getElementById("simThumbImg");
  const simFill = document.getElementById("simFill");
  const simProgressBlock = document.getElementById("simProgressBlock");
  const simProgressStatus = document.getElementById("simProgressStatus");
  const simProgressPercent = document.getElementById("simProgressPercent");
  const simActionBtn = document.getElementById("simActionBtn");
  const simBtnText = document.getElementById("simBtnText");
  const simDownloadNowBtn = document.getElementById("simDownloadNowBtn");
  const simCancelBtn = document.getElementById("simCancelBtn");
  const simCancelBtnTop = document.getElementById("simCancelBtnTop");

  let simDownloadInterval = null;

  function setSimPlatform(platformKey) {
    const data = platformData[platformKey];
    if (!data) return;

    if (simUrlInput) {
      simUrlInput.value = data.url;
      if (data.url.startsWith("http")) {
        simUrlInput.style.direction = "ltr";
        simUrlInput.style.textAlign = "left";
      } else {
        simUrlInput.style.direction = "rtl";
        simUrlInput.style.textAlign = "right";
      }
    }
    if (simPlatformName) simPlatformName.textContent = data.name;
    if (simPlatformIcon && data.iconSvg) simPlatformIcon.innerHTML = data.iconSvg;
    if (simDuration) simDuration.textContent = data.duration;
    if (simSize) simSize.textContent = data.size;
    if (simThumbImg && data.thumb) simThumbImg.src = data.thumb;

    if (simTitle) {
      simTitle.style.opacity = "0";
      setTimeout(() => {
        simTitle.textContent = data.desc;
        simTitle.style.opacity = "1";
      }, 120);
    }

    simTabs.forEach((tab) => {
      if (tab.getAttribute("data-sim") === platformKey) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });

    resetSimProgress();
  }

  // 5-second automatic rotation between platforms
  const platformKeys = ["tiktok", "instagram", "youtube", "whatsapp"];
  let currentPlatformIndex = 0;
  let autoRotateInterval = null;
  let isUserInteractingWithSim = false;

  function startSimulatorAutoRotate() {
    if (autoRotateInterval) clearInterval(autoRotateInterval);
    autoRotateInterval = setInterval(() => {
      if (isUserInteractingWithSim || simDownloadInterval !== null) return;
      currentPlatformIndex = (currentPlatformIndex + 1) % platformKeys.length;
      setSimPlatform(platformKeys[currentPlatformIndex]);
    }, 5000);
  }

  const simulatorCardEl = document.querySelector(".interactive-simulator-card");
  if (simulatorCardEl) {
    simulatorCardEl.addEventListener("mouseenter", () => {
      isUserInteractingWithSim = true;
    });
    simulatorCardEl.addEventListener("mouseleave", () => {
      isUserInteractingWithSim = false;
    });
    simulatorCardEl.addEventListener("touchstart", () => {
      isUserInteractingWithSim = true;
    }, { passive: true });
    simulatorCardEl.addEventListener("touchend", () => {
      setTimeout(() => {
        isUserInteractingWithSim = false;
      }, 6000);
    }, { passive: true });
  }

  startSimulatorAutoRotate();

  function resetSimProgress() {
    if (simDownloadInterval) {
      clearInterval(simDownloadInterval);
      simDownloadInterval = null;
    }
    if (simProgressBlock) simProgressBlock.style.display = "none";
    if (simFill) simFill.style.width = "0%";
    if (simProgressPercent) simProgressPercent.textContent = "0%";
    if (simProgressStatus)
      simProgressStatus.textContent = "جاري التحميل بأقصى سرعة...";
    if (simBtnText) simBtnText.textContent = "فحص الرابط";
    if (simActionBtn) simActionBtn.style.opacity = "1";
    if (simDownloadNowBtn) {
      const span = simDownloadNowBtn.querySelector("span");
      if (span) span.textContent = "تحميل الآن";
    }
  }

  function runDownloadSimulation() {
    if (simDownloadInterval) {
      clearInterval(simDownloadInterval);
    }

    if (simProgressBlock) simProgressBlock.style.display = "block";
    if (simFill) simFill.style.width = "0%";
    if (simProgressPercent) simProgressPercent.textContent = "0%";
    if (simProgressStatus)
      simProgressStatus.textContent = "جاري الاتصال بالمحرك...";
    if (simBtnText) simBtnText.textContent = "جاري الفحص...";
    if (simDownloadNowBtn) {
      const span = simDownloadNowBtn.querySelector("span");
      if (span) span.textContent = "جاري التحميل...";
    }

    let progress = 0;
    simDownloadInterval = setInterval(() => {
      progress += Math.floor(Math.random() * 22) + 12;
      if (progress >= 100) {
        progress = 100;
        clearInterval(simDownloadInterval);
        simDownloadInterval = null;
        if (simFill) simFill.style.width = "100%";
        if (simProgressPercent) simProgressPercent.textContent = "100%";
        if (simProgressStatus)
          simProgressStatus.textContent = "تم التحميل بنجاح وحُفظ في المعرض";
        if (simBtnText) simBtnText.textContent = "فحص الرابط";
        if (simDownloadNowBtn) {
          const span = simDownloadNowBtn.querySelector("span");
          if (span) span.textContent = "تم التحميل";
        }
      } else {
        if (simFill) simFill.style.width = `${progress}%`;
        if (simProgressPercent) simProgressPercent.textContent = `${progress}%`;
        if (simProgressStatus)
          simProgressStatus.textContent = `جاري استخراج أعلى دقة (${progress}%)...`;
      }
    }, 120);
  }

  simTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const platformKey = tab.getAttribute("data-sim");
      const idx = platformKeys.indexOf(platformKey);
      if (idx !== -1) currentPlatformIndex = idx;
      setSimPlatform(platformKey);
      startSimulatorAutoRotate();
    });
  });

  if (simActionBtn) {
    simActionBtn.addEventListener("click", runDownloadSimulation);
  }

  if (simDownloadNowBtn) {
    simDownloadNowBtn.addEventListener("click", runDownloadSimulation);
  }

  if (simCancelBtn) {
    simCancelBtn.addEventListener("click", resetSimProgress);
  }

  if (simCancelBtnTop) {
    simCancelBtnTop.addEventListener("click", resetSimProgress);
  }

  // =========================================================================
  // 5. FAQ Accordion Interaction
  // =========================================================================
  const accordionHeaders = document.querySelectorAll(".accordion-header");

  accordionHeaders.forEach((header) => {
    header.addEventListener("click", () => {
      const item = header.parentElement;
      const isOpen = item.classList.contains("open");

      // Close all items
      document.querySelectorAll(".accordion-item").forEach((otherItem) => {
        otherItem.classList.remove("open");
        const otherHeader = otherItem.querySelector(".accordion-header");
        if (otherHeader) otherHeader.setAttribute("aria-expanded", "false");
      });

      // Toggle clicked item
      if (!isOpen) {
        item.classList.add("open");
        header.setAttribute("aria-expanded", "true");
      }
    });
  });

  // =========================================================================
  // 6. Header Scroll Effect
  // =========================================================================
  const siteHeader = document.querySelector(".site-header");

  window.addEventListener(
    "scroll",
    () => {
      if (!siteHeader) return;
      if (window.scrollY > 30) {
        siteHeader.style.background = "rgba(7, 10, 16, 0.94)";
        siteHeader.style.borderBottomColor = "rgba(139, 92, 246, 0.2)";
      } else {
        siteHeader.style.background = "rgba(7, 10, 16, 0.75)";
        siteHeader.style.borderBottomColor = "rgba(255, 255, 255, 0.07)";
      }
    },
    { passive: true }
  );

  // =========================================================================
  // 7. Universal Frosted Glass Modal & Bottom Sheet (Parity with Flutter)
  // =========================================================================
  const glassModalOverlay = document.getElementById("glassModalOverlay");
  const glassModalContainer = document.getElementById("glassModalContainer");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalTitle = document.getElementById("modalTitle");
  const modalSubtitle = document.getElementById("modalSubtitle");
  const modalIconBox = document.getElementById("modalIconBox");
  const modalBody = document.getElementById("modalBody");
  const modalFooter = document.getElementById("modalFooter");
  const modalRadialGlow = document.getElementById("modalRadialGlow");

  function openGlassModal(config) {
    if (!glassModalOverlay) return;

    if (modalTitle) modalTitle.textContent = config.title || "كَنْز المَيديا";
    if (modalSubtitle) modalSubtitle.textContent = config.subtitle || "";
    if (modalBody) modalBody.innerHTML = config.bodyHtml || "";
    if (modalFooter) modalFooter.innerHTML = "";

    // Set icon
    if (modalIconBox) {
      if (config.iconHtml) {
        modalIconBox.innerHTML = config.iconHtml;
      } else {
        modalIconBox.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="modal-icon-svg"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
      }
    }

    // Set custom glow if danger or custom color
    if (modalRadialGlow && glassModalContainer) {
      if (config.isDanger) {
        modalRadialGlow.style.background =
          "radial-gradient(circle, rgba(239, 68, 68, 0.35) 0%, transparent 70%)";
        glassModalContainer.style.borderColor = "rgba(239, 68, 68, 0.4)";
      } else {
        modalRadialGlow.style.background =
          "radial-gradient(circle, rgba(139, 92, 246, 0.32) 0%, transparent 70%)";
        glassModalContainer.style.borderColor = "rgba(167, 139, 250, 0.28)";
      }
    }

    // Render 50% / 50% Action Buttons
    if (modalFooter) {
      if (config.buttons && config.buttons.length > 0) {
        config.buttons.forEach((btnConfig) => {
          const btn = document.createElement(btnConfig.href ? "a" : "button");
          btn.className = btnConfig.className || "app-btn-primary";
          btn.textContent = btnConfig.text;
          if (btnConfig.href) {
            btn.href = btnConfig.href;
            btn.target = btnConfig.target || "_blank";
            btn.rel = "noopener";
          }
          if (btnConfig.onClick) {
            btn.addEventListener("click", (e) => {
              btnConfig.onClick(e);
            });
          }
          modalFooter.appendChild(btn);
        });
      } else {
        // Default 50/50 buttons: Close on RIGHT, Download APK on LEFT
        const closeBtn = document.createElement("button");
        closeBtn.className = "app-btn-outlined";
        closeBtn.textContent = "إغلاق";
        closeBtn.addEventListener("click", closeGlassModal);

        const downloadBtn = document.createElement("a");
        downloadBtn.className = "app-btn-primary";
        downloadBtn.textContent = "تحميل APK";
        downloadBtn.href = currentApkUrl;
        downloadBtn.target = "_blank";
        downloadBtn.rel = "noopener";

        modalFooter.appendChild(closeBtn);
        modalFooter.appendChild(downloadBtn);
      }
    }

    glassModalOverlay.classList.add("active");
    glassModalOverlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeGlassModal() {
    if (!glassModalOverlay) return;
    glassModalOverlay.classList.remove("active");
    glassModalOverlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closeGlassModal);
  }

  if (glassModalOverlay) {
    glassModalOverlay.addEventListener("click", (e) => {
      if (e.target === glassModalOverlay) {
        closeGlassModal();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && glassModalOverlay && glassModalOverlay.classList.contains("active")) {
      closeGlassModal();
    }
  });

  // Make globally available
  window.openGlassModal = openGlassModal;
  window.closeGlassModal = closeGlassModal;

  // =========================================================================
  // 8. Preset Modals Implementation (Monochrome & 50/50 Buttons)
  // =========================================================================

  // Modal 1: About App & Developer
  function showAboutModal() {
    openGlassModal({
      title: "كَنْز المَيديا | KANZ MEDIA",
      subtitle: "منظومة متطورة وعالية الأداء لتحميل وإدارة الوسائط المتعددة",
      iconHtml: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="modal-icon-svg"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>`,
      bodyHtml: `
        <div class="app-subcard">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 48px; height: 48px; border-radius: 14px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); display: flex; align-items: center; justify-content: center; color: #fff;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 22px; height: 22px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <div style="font-weight: 800; font-size: 1.05rem; color: #ffffff;">سليمان شو (SULAIMAN SHO)</div>
              <div style="font-size: 0.8rem; color: var(--primary-light);">المطور والمشرف العام على المنظومة</div>
            </div>
          </div>
          <p style="margin-top: 10px; font-size: 0.85rem; color: var(--text-muted); line-height: 1.6;">
            مهندس ومطور أنظمة وتطبيقات ذكية، متخصص في ابتكار وتطوير حلول الوسائط المتقدمة، مع التركيز الكامل على الخصوصية وحماية البيانات، والسرعة الفائقة، وتجربة الاستخدام السلسة والتصميم العصري الفاخر.
          </p>
        </div>

        <div class="modal-info-grid">
          <div class="modal-info-item">
            <span>إصدار التطبيق</span>
            <strong>v${currentAppVersion} المستقر</strong>
          </div>
          <div class="modal-info-item">
            <span>توافق النظام</span>
            <strong>Android 7.0 فما فوق</strong>
          </div>
          <div class="modal-info-item">
            <span>حالة الإعلانات</span>
            <strong style="color: var(--emerald-light);">خالٍ تماماً 100%</strong>
          </div>
          <div class="modal-info-item">
            <span>الأمان والتراخيص</span>
            <strong style="color: var(--cyan-light);">مجاني وآمن بالكامل</strong>
          </div>
        </div>

        <div class="app-subcard">
          <div style="font-weight: 700; font-size: 0.88rem; color: #ffffff; margin-bottom: 8px;">أبرز مميزات وقدرات المنظومة:</div>
          <ul class="modal-features-list">
            <li><span class="modal-check-bullet">✓</span> تحميل فائق السرعة يدعم أعلى جودات الفيديو (حتى 8K) وتنزيل الصوت النقي.</li>
            <li><span class="modal-check-bullet">✓</span> ميزة اقتطاع وقص الفيديوهات بدقة متناهية قبل التنزيل لحفظ باقة الإنترنت.</li>
            <li><span class="modal-check-bullet">✓</span> استعراض وحفظ حالات الأصدقاء في واتساب لكافة النسخ بنقرة زر واحدة.</li>
            <li><span class="modal-check-bullet">✓</span> حفظ الوسائط وتصديرها مباشرة إلى استوديو الهاتف بدون أي علامات مائية.</li>
            <li><span class="modal-check-bullet">✓</span> تجربة استخدام نظيفة تماماً بدون أي إعلانات أو نوافذ منبثقة أو أدوات تتبع.</li>
          </ul>
        </div>
      `,
      buttons: [
        {
          text: "إغلاق",
          className: "app-btn-outlined",
          onClick: closeGlassModal,
        },
        {
          text: "تحميل APK",
          className: "app-btn-primary",
          href: currentApkUrl,
        },
      ],
    });
  }

  // Modal 2: Download Confirmation & Package Specs
  function showDownloadModal() {
    openGlassModal({
      title: "تنزيل تطبيق كَنْز المَيديا (APK)",
      subtitle: `الحزمة الرسمية المستقرة (v${currentAppVersion}) بنظام التحديث الهوائي`,
      iconHtml: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="modal-icon-svg"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>`,
      bodyHtml: `
        <div class="modal-info-grid">
          <div class="modal-info-item">
            <span>حجم الملف التقديري</span>
            <strong>~34.8 MB</strong>
          </div>
          <div class="modal-info-item">
            <span>توافق النظام</span>
            <strong>Android 7.0+ (Nougat)</strong>
          </div>
          <div class="modal-info-item">
            <span>سلامة الحزمة</span>
            <strong style="color: var(--emerald-light);">فحص نظيف 100%</strong>
          </div>
          <div class="modal-info-item">
            <span>حالة التراخيص</span>
            <strong style="color: var(--cyan-light);">مجاني وخالٍ من الإعلانات</strong>
          </div>
        </div>

        <div class="app-subcard">
          <div style="font-weight: 700; font-size: 0.88rem; color: #fff; margin-bottom: 6px;">التنزيل السريع من خوادم R2 المخصصة:</div>
          <p style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.6;">
            الحزمة مستضافة سحابياً عبر شبكة Cloudflare R2 فائقة السرعة على نطاق خاص <code>kanz.sulaimansho.com</code> بدون قيود على سرعة التنزيل (Zero Egress)، مع دعم التحديث التلقائي الهوائي الصامت فور صدور أي إصدار جديد.
          </p>
        </div>
      `,
      buttons: [
        {
          text: "إغلاق",
          className: "app-btn-outlined",
          onClick: closeGlassModal,
        },
        {
          text: "تحميل APK",
          className: "app-btn-primary",
          href: currentApkUrl,
        },
      ],
    });
  }

  // Modal 3: Detailed Platform Capabilities Sheet
  const platformTechDetails = {
    instagram: {
      title: "محرك إنستغرام المتطور (Instagram)",
      subtitle: "استخراج الريلز، القصص، وألبومات الكاروسيل الكاملة",
      icon: `<i class="fa-brands fa-instagram" style="font-size: 24px; color: #ffffff;"></i>`,
      bullets: [
        "تنزيل مقاطع الريلز (Reels) بأعلى دقة 1080p FHD الأصلية مع الصوت المدمج بدون ضياع.",
        "دعم معارض وألبومات الكاروسيل الكاملة (Carousel Posts) وتنزيل كافة الصور والفيديوهات دفعة واحدة.",
        "استخراج دقيق للمدة الزمنية، وصورة الغلاف المصغرة، وحجم الملف الحقيقي قبل التنزيل.",
        "حفظ تلقائي وفوري في ألبوم الكاميرا (DCIM / VideoDownloader) لتظهر فوراً في استوديو الهاتف.",
      ],
    },
    tiktok: {
      title: "محرك تيك توك فائق السرعة (TikTok)",
      subtitle: "تنزيل الفيديوهات والألبومات بدون علامة مائية نهائياً",
      icon: `<i class="fa-brands fa-tiktok" style="font-size: 24px; color: #ffffff;"></i>`,
      bullets: [
        "إزالة كاملة للعلامة المائية وشعار تيك توك عبر استخراج تيار البث النقي الأصلي مباشرة من السيرفر.",
        "دعم ألبومات صور تيك توك (Slide Photos) مع إمكانية استخراج المقطع الصوتي المصاحب بصيغة MP3.",
        "معالجة متفجرة وفحص لحظي يستغرق أقل من 0.25 ثانية بمجرد التقاط الرابط من الحافظة.",
        "تنزيل بأعلى معدل إطارات متاح (60fps) دون أي تشويش أو ضغط إضافي.",
      ],
    },
    youtube: {
      title: "محرك يوتيوب والشورتس العتادي (YouTube)",
      subtitle: "دقات فائقة تصل إلى 8K مع دمج عتادي فوري للصوت واقتطاع ذكي",
      icon: `<i class="fa-brands fa-youtube" style="font-size: 24px; color: #ffffff;"></i>`,
      bullets: [
        "تقنية Burst Range Streaming بتحميل كتل متتالية 5MB لكسر خنق سيرفرات يوتيوب واستغلال كامل سرعة النت.",
        "دمج عتادي أصلي عبر Native MediaMuxer لدقات 1080p, 2K, 4K, 8K بتشابك زمني متزامن بدون إرهاق المعالج.",
        "محرك اقتطاع الفيديو الذكي: قص أي جزء زمني بدقة متناهية بدون إعادة ترميز (Lossless Zero-Reencode).",
        "استخراج صوت MP3 نقي بنظام VBR فائق الجودة (320kbps) وحفظه في مجلد AudioDownloader المستقل.",
      ],
    },
    whatsapp: {
      title: "مستعرض وحافظ حالات واتساب (WhatsApp)",
      subtitle: "فحص تلقائي وحفظ فوري لكافة الصور ومقاطع الفيديو",
      icon: `<i class="fa-brands fa-whatsapp" style="font-size: 24px; color: #ffffff;"></i>`,
      bullets: [
        "فحص تلقائي شامل لمجلدات الحالات الرسمية والمخبأة بمجرد فتح الشاشة المخصصة في التطبيق.",
        "دعم كامل لواتساب الرسمي، واتساب الأعمال (Business)، والنسخ المزدوجة في شاومي وأندرويد (Dual Apps / Storage 999).",
        "حفظ فوري ومباشر في مجلد Download/WhatsAppStatuses وتحديث فوري لاستوديو الهاتف دون علم صاحب الحالة.",
        "تصنيف ذكي (الكل / مقاطع الفيديو / الصور) مع فحص الأحجام والمشاركة المباشرة.",
      ],
    },
    x: {
      title: "محرك إكس وتويتر (X / Twitter)",
      subtitle: "استخراج وتنزيل وسائط التغريدات ومقاطع الفيديو بأعلى دقة",
      icon: `<i class="fa-brands fa-x-twitter" style="font-size: 24px; color: #ffffff;"></i>`,
      bullets: [
        "استخراج فوري لروابط الفيديو المباشرة في التغريدات مع اختيار أعلى دقة متوفرة.",
        "دعم معارض الصور المتعددة واستخراج الملفات النقية بالكامل.",
        "كشف ذكي للروابط المختصرة من t.co وتحليلها في أجزاء من الثانية.",
        "حفظ دائم للمقاطع في سجل التحميلات الداخلي لسهولة الوصول والمشاركة السريعة.",
      ],
    },
    telegram: {
      title: "بوابة وسائط تيليجرام وتخطي الحماية (Telegram)",
      subtitle: "عميل مستقل متكامل عبر بروتوكول MTProto ومكتبة Telethon",
      icon: `<i class="fa-brands fa-telegram" style="font-size: 24px; color: #ffffff;"></i>`,
      bullets: [
        "تخطي الحظر وتنزيل المحتوى من القنوات المقيدة التي تمنع الحفظ والمشاركة (Restricted Channels / noforwards).",
        "تسجيل دخول آمن مستقل برقم الهاتف ورمز OTP والتحقق بخطوتين 2FA لحسابك.",
        "دعم تنزيل الملفات الضخمة حتى 2GB مع استئناف التحميل عند انقطاع الاتصال.",
        "مزامنة وسائط تيليجرام مع شاشة سجل التحميلات وسرعة تشغيل ومشاركة فورية.",
      ],
    },
    facebook: {
      title: "محرك فيسبوك المطور (Facebook)",
      subtitle: "تحميل مقاطع الريلز، الفيديوهات العامة، والقصص",
      icon: `<i class="fa-brands fa-facebook-f" style="font-size: 24px; color: #ffffff;"></i>`,
      bullets: [
        "تحميل مقاطع الريلز (Reels) والفيديوهات بجودات تصل إلى 1080p Full HD الأصلية.",
        "دعم المنشورات العامة والمجموعات واستخراج روابط الفيديو المباشرة في أجزاء من الثانية.",
        "حفظ تلقائي وفوري في ألبوم الكاميرا مع نقاء الصوت وبدون أي تشويش.",
        "خالٍ تماماً من الإعلانات والتوجيهات المضللة لمواقع الطرف الثالث.",
      ],
    },
    snapchat: {
      title: "محرك سناب شات الذكي (Snapchat)",
      subtitle: "تحميل سنابات وقصص المشاهير والمقاطع العامة",
      icon: `<i class="fa-brands fa-snapchat" style="font-size: 24px; color: #ffffff;"></i>`,
      bullets: [
        "تنزيل قصص المشاهير وسنابات Spotlight بأعلى دقة متوفرة بدون علامات مزعجة.",
        "فحص مباشر للروابط المستخرجة من الحافظة بلمح البصر دون تعقيد.",
        "تخزين آمن ومباشر في الاستوديو بجودة الصوت والصورة الأصلية.",
        "دعم استئناف التحميل عند انقطاع الاتصال وسرعة تشغيل فورية.",
      ],
    },
    pinterest: {
      title: "محرك بينتريست الإبداعي (Pinterest)",
      subtitle: "حفظ مقاطع الفيديو والقصص والصور بأعلى دقة",
      icon: `<i class="fa-brands fa-pinterest-p" style="font-size: 24px; color: #ffffff;"></i>`,
      bullets: [
        "تنزيل مقاطع الفيديو الإبداعية والريلز من بينتريست بأعلى جودة نقية.",
        "استخراج الصور بدقة فائقة وحفظها في مجلد مخصص للمعرض.",
        "معالجة فورية وتخطي التوجيهات الخارجية بلمسة واحدة.",
        "تكامل كامل مع مشغل الوسائط الداخلي وسجل التحميلات في التطبيق.",
      ],
    },
  };

  function showPlatformModal(platformKey) {
    const data =
      platformTechDetails[platformKey] || platformTechDetails["instagram"];
    const bulletsHtml = data.bullets
      .map(
        (b) =>
          `<li><span class="modal-check-bullet">✓</span> ${b}</li>`
      )
      .join("");

    openGlassModal({
      title: data.title,
      subtitle: data.subtitle,
      iconHtml: data.icon,
      bodyHtml: `
        <div class="app-subcard">
          <div style="font-weight: 700; font-size: 0.9rem; color: #fff; margin-bottom: 8px;">القدرات والميزات التقنية المدعومة:</div>
          <ul class="modal-features-list">
            ${bulletsHtml}
          </ul>
        </div>
        <div class="modal-info-grid">
          <div class="modal-info-item">
            <span>سرعة التحليل</span>
            <strong>أقل من 0.3 ثانية</strong>
          </div>
          <div class="modal-info-item">
            <span>أعلى جودة</span>
            <strong>الأصلية بدون ضغط</strong>
          </div>
        </div>
      `,
      buttons: [
        {
          text: "إغلاق",
          className: "app-btn-outlined",
          onClick: closeGlassModal,
        },
        {
          text: "تحميل APK",
          className: "app-btn-primary",
          href: "https://kanz.sulaimansho.com/kanz_media.apk",
        },
      ],
    });
  }

  // =========================================================================
  // 9. Interactive Triggers Binding
  // =========================================================================

  // Desktop & Mobile About Buttons
  const aboutBtnDesktop = document.getElementById("aboutBtnDesktop");
  const aboutBtnMobile = document.getElementById("aboutBtnMobile");
  const aboutBtnFooter = document.getElementById("aboutBtnFooter");
  const downloadInfoBtnFooter = document.getElementById("downloadInfoBtnFooter");
  const heroPill = document.getElementById("heroPill");

  if (aboutBtnDesktop) aboutBtnDesktop.addEventListener("click", showAboutModal);
  if (aboutBtnMobile) aboutBtnMobile.addEventListener("click", showAboutModal);
  if (aboutBtnFooter) aboutBtnFooter.addEventListener("click", showAboutModal);
  if (downloadInfoBtnFooter)
    downloadInfoBtnFooter.addEventListener("click", showDownloadModal);
  if (heroPill) heroPill.addEventListener("click", showDownloadModal);

  // Platform Cards Click Listeners
  const platformCards = document.querySelectorAll(".platform-card");
  platformCards.forEach((card) => {
    card.addEventListener("click", () => {
      const pKey = card.getAttribute("data-platform");
      if (pKey) showPlatformModal(pKey);
    });

    // Keyboard Accessibility (Enter or Space)
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const pKey = card.getAttribute("data-platform");
        if (pKey) showPlatformModal(pKey);
      }
    });
  });
  // =========================================================================
  // Footer Interactive Actions (Copy URL & Share)
  // =========================================================================
  const footerCopyUrlBtn = document.getElementById("footerCopyUrlBtn");
  if (footerCopyUrlBtn) {
    footerCopyUrlBtn.addEventListener("click", () => {
      const url = currentApkUrl;
      function setSuccess() {
        const origHtml = footerCopyUrlBtn.innerHTML;
        footerCopyUrlBtn.innerHTML = '<i class="fa-solid fa-check" style="color: #34d399;"></i>';
        setTimeout(() => {
          footerCopyUrlBtn.innerHTML = origHtml;
        }, 2200);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(setSuccess).catch(fallback);
      } else {
        fallback();
      }
      function fallback() {
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setSuccess();
      }
    });
  }

  const footerShareBtn = document.getElementById("footerShareBtn");
  if (footerShareBtn) {
    footerShareBtn.addEventListener("click", () => {
      if (navigator.share) {
        navigator.share({
          title: "كَنْز المَيديا | KANZ MEDIA",
          text: "أقوى تطبيق أندرويد لتحميل الوسائط وحفظ الحالات بدقة 4K وخالٍ تماماً من الإعلانات",
          url: window.location.href,
        }).catch(() => {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href).then(() => {
          const orig = footerShareBtn.innerHTML;
          footerShareBtn.innerHTML = '<i class="fa-solid fa-check" style="color: #34d399;"></i>';
          setTimeout(() => { footerShareBtn.innerHTML = orig; }, 2000);
        });
      }
    });
  }

  const footerAboutIconBtn = document.getElementById("footerAboutIconBtn");
  if (footerAboutIconBtn) {
    footerAboutIconBtn.addEventListener("click", showAboutModal);
  }

  const footerDevLink = document.getElementById("footerDevLink");
  if (footerDevLink) {
    footerDevLink.addEventListener("click", showAboutModal);
  }
});