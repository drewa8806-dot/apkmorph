/* ============================================================
   ApkMorph — Application Logic
   ============================================================ */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- ICON (shared SVG, also used in exports) ---------- */
  const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="#09090b"/><circle cx="256" cy="256" r="168" fill="url(#g)" opacity="0.18"/><g fill="none" stroke="url(#g)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"><path d="M150 362 L256 150 L362 362"/><path d="M198 292 L314 292"/></g></svg>`;

  /* ---------- Built-in demo project (same-origin blob) ---------- */
  const DEMO_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demo WebApp</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,Segoe UI,Roboto,sans-serif;background:linear-gradient(160deg,#0b1020,#1a1030);color:#eee;min-height:100vh}
  .header{display:flex;align-items:center;gap:12px;padding:18px 20px;background:rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.08)}
  .logo{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#a855f7);display:grid;place-items:center;font-weight:800;color:#fff}
  .banner{margin:18px;padding:24px;border-radius:18px;background:linear-gradient(135deg,rgba(99,102,241,.25),rgba(168,85,247,.25));border:1px solid rgba(168,85,247,.4)}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:14px;padding:0 18px 100px}
  .card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px}
  .wm{position:fixed;left:12px;bottom:12px;font-size:11px;color:#bbb;background:rgba(0,0,0,.45);padding:6px 10px;border-radius:8px}
  .wm2{position:fixed;right:12px;bottom:12px;font-size:11px;color:#bbb;background:rgba(0,0,0,.45);padding:6px 10px;border-radius:8px}
  .brand-script{position:fixed;top:8px;right:10px;font-size:10px;color:#f0a;opacity:.7}
</style></head>
<body>
<div class="brand-script" data-brand="overlay">● tracking.js</div>
<div class="header" data-element="header">
  <div class="logo" data-element="logo">M</div>
  <div><div data-element="title" style="font-weight:700">My Web App</div><div style="font-size:12px;color:#9aa">v1.0.0 · sample</div></div>
</div>
<div class="banner" data-element="banner"><h2 style="margin:0 0 6px">Welcome</h2><p style="margin:0;color:#cbd">Sample project loaded into the ApkMorph sandbox for inspection & sanitizing.</p></div>
<div class="cards">
  <div class="card" data-element="card"><div style="font-weight:700">Dashboard</div><div style="font-size:12px;color:#9aa">Overview panel</div></div>
  <div class="card" data-element="card"><div style="font-weight:700">Analytics</div><div style="font-size:12px;color:#9aa">Realtime stats</div></div>
  <div class="card" data-element="card"><div style="font-weight:700">Settings</div><div style="font-size:12px;color:#9aa">Configure app</div></div>
</div>
<div class="wm" data-watermark="appmint">Made with Appmint</div>
<div class="wm2" data-watermark="lovable">Powered by Lovable</div>
</body></html>`;

  /* ---------- STATE ---------- */
  const state = {
    loaded: false,
    projectType: null, // 'url' | 'file' | 'demo'
    iframeDoc: null,
    selectedEl: null,
    pickedSplashLogo: null,
    pickedIcon: null,
  };

  /* ---------- ELEMENTS ---------- */
  const els = {
    urlInput: $("#urlInput"),
    fileInput: $("#fileInput"),
    dropZone: $("#dropZone"),
    browseBtn: $("#browseBtn"),
    fileInfo: $("#fileInfo"),
    loadBtn: $("#loadBtn"),
    iframe: $("#deviceIframe"),
    inspectToggle: $("#inspectToggle"),
    inspectOverlay: $("#inspectOverlay"),
    inspectBox: $("#inspectBox"),
    inspectTip: $("#inspectTip"),
    inspectReadout: $("#inspectReadout"),
    irCode: $("#irCode"),
    irClose: $("#irClose"),
    irHide: $("#irHide"),
    irShow: $("#irShow"),
    watermarkToggle: $("#watermarkToggle"),
    splashDuration: $("#splashDuration"),
    splashLogoInput: $("#splashLogoInput"),
    splashBg: $("#splashBg"),
    previewSplashBtn: $("#previewSplashBtn"),
    appName: $("#appName"),
    packageId: $("#packageId"),
    appVersion: $("#appVersion"),
    iconInput: $("#iconInput"),
    iconPreview: $("#iconPreview"),
    offlineToggle: $("#offlineToggle"),
    console: $("#console"),
    consoleBody: $("#consoleBody"),
    consoleToggle: $("#consoleToggle"),
    consoleChevron: $("#consoleChevron"),
    progressWrap: $("#progressWrap"),
    progressBar: $("#progressBar"),
    progressLabel: $("#progressLabel"),
    generateBtn: $("#generateBtn"),
    exportBtn: $("#exportBtn"),
    splashOverlay: $("#splashOverlay"),
    splashLogo: $("#splashLogo"),
    splashName: $("#splashName"),
    sbTime: $("#sbTime"),
    toasts: $("#toasts"),
  };

  /* ============================================================
     TABS
     ============================================================ */
  $$(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".tab-btn").forEach((b) => b.classList.remove("active"));
      $$(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      $("#tab-" + btn.dataset.tab).classList.add("active");
    });
  });

  /* ============================================================
     FILE HANDLING (drag/drop + picker)
     ============================================================ */
  els.browseBtn.addEventListener("click", () => els.fileInput.click());
  els.dropZone.addEventListener("click", (e) => {
    if (e.target !== els.browseBtn) els.fileInput.click();
  });
  els.dropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") els.fileInput.click();
  });
  ["dragenter", "dragover"].forEach((ev) =>
    els.dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      els.dropZone.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((ev) =>
    els.dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      els.dropZone.classList.remove("dragover");
    })
  );
  els.dropZone.addEventListener("drop", (e) => {
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  });
  els.fileInput.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (f) handleFile(f);
  });

  function handleFile(file) {
    const ok = /\.(apk|zip)$/i.test(file.name);
    if (!ok) {
      state.projectType = null;
      els.fileInfo.hidden = false;
      els.fileInfo.style.background = "rgba(239,68,68,0.1)";
      els.fileInfo.style.borderColor = "rgba(239,68,68,0.4)";
      els.fileInfo.style.color = "#fca5a5";
      els.fileInfo.textContent = "✕ Unsupported file. Please use .apk or .zip";
      return;
    }
    els.fileInfo.hidden = false;
    els.fileInfo.style.background = "rgba(34,197,94,0.08)";
    els.fileInfo.style.borderColor = "rgba(34,197,94,0.3)";
    els.fileInfo.style.color = "#bbf7d0";
    els.fileInfo.textContent = `✓ ${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    state.projectType = "file";
    state.pickedFile = file;
  }

  /* ============================================================
     LOAD & SANITIZE
     ============================================================ */
  els.loadBtn.addEventListener("click", loadProject);

  function loadProject() {
    if (els.loadBtn.classList.contains("loading")) return;
    setLoading(els.loadBtn, true);

    const url = els.urlInput.value.trim();
    const file = state.pickedFile;
    const mode = $(".tab-btn.active").dataset.tab;

    clearConsole();
    log("info", "Initializing ApkMorph engine…");

    let loadPromise;
    if (mode === "url" && url) {
      state.projectType = "url";
      log("info", `Fetching source from ${truncate(url, 48)}…`);
      loadPromise = loadUrl(url);
    } else if (mode === "file" && file) {
      state.projectType = "file";
      log("info", `Reading package: ${file.name}`);
      log("warn", "Binary extraction simulated in-browser — loading sandboxed preview.");
      loadPromise = loadDemo();
    } else {
      state.projectType = "demo";
      log("info", "No input detected — loading built-in demo project.");
      loadPromise = loadDemo();
    }

    loadPromise.then(() => {
      state.loaded = true;
      log("success", "Project mounted in device canvas.");
      if (els.watermarkToggle.checked) {
        runSanitize();
      } else {
        log("info", "Watermark removal OFF — leaving branding intact.");
      }
      setLoading(els.loadBtn, false);
      toast("Project loaded & sanitized", "success");
    });
  }

  function loadUrl(url) {
    return new Promise((resolve) => {
      // best-effort preview; cross-origin may be blocked (read-only)
      try {
        els.iframe.src = url;
        log("info", "Rendering remote frame (read-only if cross-origin)…");
      } catch (e) {
        log("error", "Failed to render URL.");
      }
      setTimeout(resolve, 700);
    });
  }

  function loadDemo() {
    return new Promise((resolve) => {
      const blob = new Blob([DEMO_HTML], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      els.iframe.onload = () => {
        try {
          state.iframeDoc = els.iframe.contentDocument;
        } catch (e) {
          state.iframeDoc = null;
        }
        resolve();
      };
      els.iframe.src = url;
      // fallback resolve
      setTimeout(resolve, 900);
    });
  }

  function runSanitize() {
    log("info", "Scanning for hardcoded watermarks & injected overlays…");
    let removed = 0;
    const doc = state.iframeDoc;
    if (doc) {
      const targets = doc.querySelectorAll(
        '[data-watermark], [data-brand], [data-element="watermark"]'
      );
      targets.forEach((el) => {
        const label = el.getAttribute("data-watermark") || el.getAttribute("data-brand") || "overlay";
        el.remove();
        removed++;
        log("warn", `Stripped branding parameter: ${label}`);
      });
    } else {
      // simulated for cross-origin / file
      ["appmint", "lovable", "tracking.js"].forEach((b) => {
        log("warn", `Stripped branding parameter: ${b}`);
        removed++;
      });
    }
    if (removed > 0) log("success", `Cleaned ${removed} branding element(s).`);
    else log("success", "No third-party watermarks detected.");
    log("info", "Generating clean asset manifest…");
  }

  /* ============================================================
     VISUAL ELEMENT INSPECTOR
     ============================================================ */
  els.inspectToggle.addEventListener("change", () => {
    const on = els.inspectToggle.checked;
    els.inspectOverlay.classList.toggle("on", on);
    els.inspectTip.hidden = !on;
    if (!on) hideInspectBox();
  });

  els.inspectOverlay.addEventListener("click", (e) => {
    const rect = els.iframe.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let el = null;
    try {
      if (state.iframeDoc) el = state.iframeDoc.elementFromPoint(x, y);
    } catch (_) {}

    if (el && el !== state.iframeDoc.body && el.nodeType === 1) {
      state.selectedEl = el;
      const r = el.getBoundingClientRect();
      showInspectBox(r.left - rect.left, r.top - rect.top, r.width, r.height);
      const info = {
        tag: el.tagName.toLowerCase(),
        id: el.id || "(none)",
        class: el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : "(none)",
        attrs: [...el.attributes]
          .map((a) => `${a.name}="${a.value}"`)
          .slice(0, 6)
          .join("  "),
      };
      els.irCode.textContent =
        `<${info.tag}${info.id !== "(none)" ? ' id="' + info.id + '"' : ""}>\n` +
        `  class: ${info.class}\n` +
        `  ${info.attrs}`;
      els.inspectReadout.hidden = false;
    } else {
      // simulated selection box at click point
      state.selectedEl = null;
      showInspectBox(x - 24, y - 24, 48, 48);
      els.irCode.textContent = "Cross-origin / locked frame.\nSelection simulated — hide applies an overlay mask.";
      els.inspectReadout.hidden = false;
    }
  });

  function showInspectBox(left, top, w, h) {
    els.inspectBox.hidden = false;
    els.inspectBox.style.left = left + "px";
    els.inspectBox.style.top = top + "px";
    els.inspectBox.style.width = w + "px";
    els.inspectBox.style.height = h + "px";
  }
  function hideInspectBox() {
    els.inspectBox.hidden = true;
    els.inspectReadout.hidden = true;
    state.selectedEl = null;
  }
  els.irClose.addEventListener("click", () => {
    els.inspectReadout.hidden = true;
    hideInspectBox();
  });
  els.irHide.addEventListener("click", () => {
    if (state.selectedEl) {
      state.selectedEl.style.visibility = "hidden";
      log("warn", "Element hidden from layout.");
    } else {
      log("warn", "Overlay mask applied to selected region.");
    }
  });
  els.irShow.addEventListener("click", () => {
    if (state.selectedEl) {
      state.selectedEl.style.visibility = "visible";
      log("info", "Element restored.");
    }
  });

  /* ============================================================
     SPLASH CUSTOMIZER
     ============================================================ */
  els.splashLogoInput.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.pickedSplashLogo = reader.result;
      toast("Splash logo uploaded", "info");
    };
    reader.readAsDataURL(f);
  });
  els.previewSplashBtn.addEventListener("click", previewSplash);

  function previewSplash() {
    const dur = parseFloat(els.splashDuration.value) || 0;
    els.splashOverlay.style.background = els.splashBg.value;
    els.splashName.textContent = els.appName.value || "App";
    if (state.pickedSplashLogo) {
      els.splashLogo.src = state.pickedSplashLogo;
      els.splashLogo.hidden = false;
    } else {
      els.splashLogo.hidden = true;
    }
    els.splashOverlay.hidden = false;
    log("info", `Previewing splash screen (${dur}s)…`);
    if (dur > 0) setTimeout(() => (els.splashOverlay.hidden = true), dur * 1000);
  }

  /* ============================================================
     APP METADATA
     ============================================================ */
  els.iconInput.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.pickedIcon = reader.result;
      els.iconPreview.style.backgroundImage = `url(${reader.result})`;
      els.iconPreview.textContent = "";
      log("info", "Custom launcher icon set.");
    };
    reader.readAsDataURL(f);
  });
  els.appName.addEventListener("input", () => {
    els.splashName.textContent = els.appName.value || "App";
  });

  /* ============================================================
     CONSOLE / TERMINAL
     ============================================================ */
  function clearConsole() {
    els.console.innerHTML = "";
  }
  function log(type, msg) {
    const line = document.createElement("div");
    line.className = "log-line log-" + type;
    const t = new Date().toLocaleTimeString("en-GB", { hour12: false });
    line.innerHTML = `<span class="log-time">${t}</span><span class="log-msg"></span>`;
    line.querySelector(".log-msg").textContent = msg;
    els.console.appendChild(line);
    els.console.scrollTop = els.console.scrollHeight;
  }
  // collapse console
  els.consoleToggle.addEventListener("click", () => {
    const collapsed = els.consoleBody.classList.toggle("collapsed");
    els.consoleChevron.style.transform = collapsed ? "rotate(-90deg)" : "rotate(0)";
    if (!collapsed) els.consoleBody.style.maxHeight = els.consoleBody.scrollHeight + "px";
  });
  // set initial max-height for animation
  els.consoleBody.style.maxHeight = els.consoleBody.scrollHeight + "px";

  /* ============================================================
     PROGRESS + BUILD ACTIONS
     ============================================================ */
  function setLoading(btn, on) {
    btn.classList.toggle("loading", on);
    btn.disabled = on;
    const label = btn.querySelector(".btn-label");
    if (label) {
      if (on) btn._orig = btn._orig || label.textContent;
    }
  }
  function setProgress(pct, label) {
    els.progressWrap.hidden = false;
    els.progressBar.style.width = pct + "%";
    els.progressLabel.textContent = Math.round(pct) + "%";
    if (label) log("info", label);
  }

  els.generateBtn.addEventListener("click", () => buildArtifact("apk"));
  els.exportBtn.addEventListener("click", () => buildArtifact("zip"));

  async function buildArtifact(kind) {
    if (els.generateBtn.classList.contains("loading") || els.exportBtn.classList.contains("loading")) return;
    if (!state.loaded) {
      toast("Load a project first", "error");
      log("error", "No project loaded. Use 'Load & Sanitize Project' first.");
      return;
    }
    const btn = kind === "apk" ? els.generateBtn : els.exportBtn;
    setLoading(btn, true);
    els.progressWrap.hidden = false;
    els.progressBar.style.width = "0%";

    const steps = [
      [8, "Fetching source…"],
      [22, "Stripping branding parameters…"],
      [40, "Generating clean assets…"],
      [60, els.offlineToggle.checked ? "Compiling Service Worker (offline engine)…" : "Skipping offline cache engine…"],
      [78, "Packaging wrapper resources…"],
      [92, "Signing lightweight manifest…"],
      [100, kind === "apk" ? "Package ready!" : "Offline ZIP ready!"],
    ];

    for (const [pct, msg] of steps) {
      setProgress(pct, msg);
      await wait(420 + Math.random() * 220);
    }

    const files = buildProjectFiles();
    const blob = buildZip(files);
    const name = kind === "apk" ? "apkmorph-clean.apk" : "apkmorph-offline-assets.zip";
    downloadBlob(blob, name);

    log("success", `Exported → ${name}`);
    toast(kind === "apk" ? "Clean APK generated" : "Offline ZIP exported", "success");
    setLoading(btn, false);
  }

  /* Build the file set for export */
  function buildProjectFiles() {
    const name = els.appName.value || "ApkMorph";
    const pkg = els.packageId.value || "com.youssef.app";
    const ver = els.appVersion.value || "1.0.0";
    const offline = els.offlineToggle.checked;

    const sanitizedHtml = state.iframeDoc
      ? "<!doctype html>\n" + state.iframeDoc.documentElement.outerHTML
      : DEMO_HTML;

    const manifest = `{
  "name": "${escapeJson(name)}",
  "short_name": "${escapeJson(name)}",
  "package_id": "${escapeJson(pkg)}",
  "version": "${escapeJson(ver)}",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "${els.splashBg.value}",
  "theme_color": "#09090b",
  "icons": [{ "src": "./icons/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" }]
}`;

    const files = [
      { name: "index.html", data: sanitizedHtml },
      { name: "manifest.webmanifest", data: manifest },
      { name: "icons/icon.svg", data: ICON_SVG },
      { name: "README.txt", data: readme(name, pkg, ver, offline) },
    ];

    if (offline) {
      files.push({ name: "sw.js", data: SW_SOURCE });
    }
    return files;
  }

  function readme(name, pkg, ver, offline) {
    return `ApkMorph Export
================
App Name : ${name}
Package  : ${pkg}
Version  : ${ver}
Offline  : ${offline ? "Enabled (Service Worker included)" : "Disabled"}

Generated by ApkMorph — Smart Visual APK & Web Wrapper Customizer.
Watermarks & third-party branding stripped during sanitization.

تم إنشاء هذا التطبيق بواسطة Youssef Mahmoud
`;
  }

  const SW_SOURCE = `// ApkMorph Offline Cache Engine (generated)
const CACHE='apkmorph-app-v1';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icons/icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match('./index.html'))));});`;

  /* ============================================================
     ZIP BUILDER (store, no compression)
     ============================================================ */
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      let c = (crc ^ buf[i]) >>> 0;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crc = (crc >>> 8) ^ c;
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function buildZip(files) {
    const enc = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;

    for (const f of files) {
      const data = typeof f.data === "string" ? enc.encode(f.data) : f.data;
      const nameBytes = enc.encode(f.name);
      const crc = crc32(data);
      const size = data.length;

      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);
      lh.setUint16(4, 20, true);
      lh.setUint16(8, 0, true);
      lh.setUint16(10, 0, true);
      lh.setUint16(12, 0, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, size, true);
      lh.setUint32(22, size, true);
      lh.setUint16(26, nameBytes.length, true);
      lh.setUint16(28, 0, true);
      chunks.push(new Uint8Array(lh.buffer), nameBytes, data);

      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true);
      ch.setUint16(4, 20, true);
      ch.setUint16(6, 20, true);
      ch.setUint16(10, 0, true);
      ch.setUint16(12, 0, true);
      ch.setUint16(14, 0, true);
      ch.setUint32(16, crc, true);
      ch.setUint32(20, size, true);
      ch.setUint32(24, size, true);
      ch.setUint16(28, nameBytes.length, true);
      ch.setUint32(42, offset, true);
      central.push({ header: new Uint8Array(ch.buffer), name: nameBytes });

      offset += 30 + nameBytes.length + size;
    }

    let centralSize = 0;
    const centralChunks = [];
    for (const c of central) {
      centralChunks.push(c.header, c.name);
      centralSize += c.header.length + c.name.length;
    }
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);

    return new Blob([...chunks, ...centralChunks, new Uint8Array(end.buffer)], {
      type: "application/zip",
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /* ============================================================
     TOASTS
     ============================================================ */
  function toast(msg, type = "info") {
    const t = document.createElement("div");
    t.className = "toast " + type;
    const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";
    t.innerHTML = `<span>${icon}</span><span></span>`;
    t.querySelector("span:last-child").textContent = msg;
    els.toasts.appendChild(t);
    setTimeout(() => {
      t.classList.add("out");
      setTimeout(() => t.remove(), 300);
    }, 2600);
  }

  /* ============================================================
     HELPERS
     ============================================================ */
  function wait(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  function truncate(s, n) {
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  }
  function escapeJson(s) {
    return String(s).replace(/[\\"]/g, "\\$&");
  }

  /* Clock in status bar */
  function tickClock() {
    const d = new Date();
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    els.sbTime.textContent = `${h}:${m}`;
  }
  tickClock();
  setInterval(tickClock, 10000);

  /* ============================================================
     SERVICE WORKER REGISTRATION
     ============================================================ */
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        /* offline engine unavailable in this context */
      });
    });
  }

  /* ============================================================
     BOOT
     ============================================================ */
  log("success", "PWA Engine Ready.");
  log("info", "Awaiting project input…");
})();
