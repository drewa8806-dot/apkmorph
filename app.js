/* ============================================================
   ApkMorph — Simplified App Logic
   - Pick APK/ZIP -> parse (real icon + manifest) -> live canvas
   - Inspect elements -> floating options menu (Hide / Edit / Cancel)
   - PWA file_handlers + launchQueue (open .apk/.zip from file manager)
   ============================================================ */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);

  const els = {
    pickBtn: $("#pickBtn"),
    fileInput: $("#fileInput"),
    fileChip: $("#fileChip"),
    urlToggle: $("#urlToggle"),
    urlRow: $("#urlRow"),
    urlInput: $("#urlInput"),
    urlBtn: $("#urlBtn"),
    dropZone: $("#dropZone"),
    screen: $("#screen"),
    emptyState: $("#emptyState"),
    preview: $("#preview"),
    webFrame: $("#webFrame"),
    inspectToggle: $("#inspectToggle"),
    inspectOverlay: $("#inspectOverlay"),
    inspectBox: $("#inspectBox"),
    optionsMenu: $("#optionsMenu"),
    editPanel: $("#editPanel"),
    epText: $("#epText"),
    epColor: $("#epColor"),
    epSize: $("#epSize"),
    epApply: $("#epApply"),
    epClose: $("#epClose"),
    splash: $("#splash"),
    splashIcon: $("#splashIcon"),
    splashName: $("#splashName"),
    splashSub: $("#splashSub"),
    status: $("#status"),
    sbTime: $("#sbTime"),
    toasts: $("#toasts"),
  };

  const state = {
    current: null,
    selectedEl: null,
    editEl: null,
  };

  /* ---------------- helpers ---------------- */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  function showStatus(msg) { els.status.textContent = msg; }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }
  function fmtSize(b) {
    if (b > 1048576) return (b / 1048576).toFixed(2) + " MB";
    if (b > 1024) return (b / 1024).toFixed(1) + " KB";
    return b + " B";
  }
  function blobToDataUrl(blob) {
    return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
  }
  function rgbToHex(c) {
    const m = c.match(/\d+/g);
    if (!m || m.length < 3) return "#ffffff";
    return "#" + m.slice(0, 3).map((n) => (+n).toString(16).padStart(2, "0")).join("");
  }
  function toast(msg, type = "info") {
    const t = document.createElement("div");
    t.className = "toast " + type;
    const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";
    t.innerHTML = `<span>${icon}</span><span></span>`;
    t.querySelector("span:last-child").textContent = msg;
    els.toasts.appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, 2600);
  }

  /* ---------------- file input / drag-drop ---------------- */
  els.pickBtn.addEventListener("click", () => els.fileInput.click());
  els.dropZone.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (f) handleFile(f);
  });

  ["dragenter", "dragover"].forEach((ev) =>
    els.dropZone.addEventListener(ev, (e) => { e.preventDefault(); els.dropZone.classList.add("dragover"); })
  );
  ["dragleave", "drop"].forEach((ev) =>
    els.dropZone.addEventListener(ev, (e) => { e.preventDefault(); els.dropZone.classList.remove("dragover"); })
  );
  els.dropZone.addEventListener("drop", (e) => {
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  });

  /* ---------------- URL preview ---------------- */
  els.urlToggle.addEventListener("click", () => {
    els.urlRow.hidden = !els.urlRow.hidden;
    els.urlToggle.textContent = els.urlRow.hidden ? "أو أدخل رابط ويب ▾" : "إخفاء رابط الويب ▴";
  });
  els.urlBtn.addEventListener("click", () => {
    const url = els.urlInput.value.trim();
    if (!url) return;
    loadUrl(url);
  });

  /* ---------------- handle a file ---------------- */
  async function handleFile(file) {
    const lower = file.name.toLowerCase();
    els.fileChip.hidden = false;
    els.fileChip.textContent = `📄 ${file.name} · ${fmtSize(file.size)}`;

    if (!lower.endsWith(".apk") && !lower.endsWith(".zip")) {
      toast("الرجاء اختيار ملف APK أو ZIP", "error");
      showStatus("نوع ملف غير مدعوم");
      return;
    }
    showStatus("جارٍ معالجة " + file.name + " …");
    try {
      const info = await parseApk(file);
      renderApkPreview(info);
      toast("تم فتح " + file.name, "success");
    } catch (e) {
      console.error(e);
      toast("تعذّر قراءة الملف: " + e.message, "error");
      showStatus("فشل في قراءة الملف");
    }
  }

  /* ============================================================
     APK / ZIP parsing
     ============================================================ */
  function parseZip(buf) {
    const dv = new DataView(buf);
    let eocd = -1;
    for (let i = buf.byteLength - 22; i >= 0; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("ملف غير صالح (ليس ZIP/APK)");
    const cdOffset = dv.getUint32(eocd + 16, true);
    const cdCount = dv.getUint16(eocd + 10, true);
    const entries = [];
    let p = cdOffset;
    for (let i = 0; i < cdCount; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true);
      const compSize = dv.getUint32(p + 20, true);
      const nameLen = dv.getUint16(p + 28, true);
      const extraLen = dv.getUint16(p + 30, true);
      const commentLen = dv.getUint16(p + 32, true);
      const localOffset = dv.getUint32(p + 42, true);
      const name = new TextDecoder("utf-8").decode(new Uint8Array(buf, p + 46, nameLen));
      entries.push({ name, method, compSize, localOffset });
      p += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
  }

  function readEntryData(buf, entry) {
    const dv = new DataView(buf);
    let p = entry.localOffset;
    if (dv.getUint32(p, true) !== 0x04034b50) throw new Error("ترويسة غير صالحة");
    const nameLen = dv.getUint16(p + 26, true);
    const extraLen = dv.getUint16(p + 28, true);
    p += 30 + nameLen + extraLen;
    return new Uint8Array(buf, p, entry.compSize);
  }

  async function inflate(data) {
    if (typeof DecompressionStream === "undefined") throw new Error("المتصفح لا يدعم فك الضغط");
    const ds = new DecompressionStream("deflate-raw");
    const writer = ds.writable.getWriter();
    writer.write(data);
    writer.close();
    const ab = await new Response(ds.readable).arrayBuffer();
    return new Uint8Array(ab);
  }

  function pickIcon(entries) {
    const rank = (n) => {
      let r = 0;
      if (/xxxhdpi/.test(n)) r += 5; else if (/xxhdpi/.test(n)) r += 4;
      else if (/xhdpi/.test(n)) r += 3; else if (/hdpi/.test(n)) r += 2; else if (/mdpi/.test(n)) r += 1;
      return r;
    };
    const cands = entries.filter(
      (e) => /\.(png|webp)$/i.test(e.name) &&
             /(mipmap|drawable)/i.test(e.name) &&
             /(ic_launcher|icon|app_icon|ic_launcher_foreground|logo)/i.test(e.name)
    );
    const pool = cands.length
      ? cands
      : entries.filter((e) => /\.png$/i.test(e.name) && /(mipmap|drawable)/i.test(e.name));
    if (!pool.length) return null;
    pool.sort((a, b) => rank(b.name) - rank(a.name));
    return pool[0];
  }

  async function parseApk(file) {
    const buf = await file.arrayBuffer();
    const entries = parseZip(buf);

    let iconDataUrl = null;
    const iconEntry = pickIcon(entries);
    if (iconEntry) {
      const raw = await readEntryData(buf, iconEntry);
      const png = iconEntry.method === 8 ? await inflate(raw) : raw;
      iconDataUrl = await blobToDataUrl(new Blob([png], { type: "image/png" }));
    }

    let meta = {};
    const man = entries.find((e) => e.name.toLowerCase() === "androidmanifest.xml");
    if (man) {
      const raw = await readEntryData(buf, man);
      const xml = man.method === 8 ? await inflate(raw) : raw;
      try { meta = parseAxml(xml.buffer || xml); } catch (_) { meta = {}; }
    }

    const baseName = file.name.replace(/\.(apk|zip)$/i, "");
    return {
      fileName: file.name,
      size: file.size,
      iconDataUrl,
      package: meta.package || "com.youssef.app",
      versionName: meta.versionName || "1.0.0",
      versionCode: meta.versionCode || "",
      label: meta.label || baseName,
      entries: entries.length,
    };
  }

  /* ---- Minimal AndroidManifest.xml (binary AXML) parser ---- */
  function parseAxml(buf) {
    const dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x00080003) throw new Error("ليس AXML");
    let p = 8;
    if (dv.getUint16(p, true) !== 0x0001) throw new Error("لا توجد سلسلة نصوص");
    const spSize = dv.getUint32(p + 4, true);
    const stringCount = dv.getUint32(p + 8, true);
    const flags = dv.getUint32(p + 16, true);
    const stringsStart = dv.getUint32(p + 20, true);
    const isUtf8 = (flags & 0x00000100) !== 0;
    const offsets = [];
    for (let i = 0; i < stringCount; i++) offsets.push(dv.getUint32(p + 28 + i * 4, true));
    const strDataStart = p + stringsStart;
    const strings = offsets.map((o) => readString(buf, strDataStart + o, isUtf8, dv));

    const manifestAttrs = {};
    const appAttrs = {};
    let cp = p + spSize;
    while (cp + 8 <= buf.byteLength) {
      const type = dv.getUint16(cp, true);
      const size = dv.getUint32(cp + 4, true);
      if (size === 0) break;
      if (type === 0x0102) {
        const nameIdx = dv.getUint32(cp + 20, true);
        const attrStart = dv.getUint16(cp + 24, true);
        const attrSize = dv.getUint16(cp + 26, true) || 20;
        const attrCount = dv.getUint16(cp + 28, true);
        const elemName = strings[nameIdx] || "";
        const target = elemName === "manifest" ? manifestAttrs : elemName === "application" ? appAttrs : null;
        if (target) {
          const ab = cp + attrStart;
          for (let i = 0; i < attrCount; i++) {
            const a = ab + i * attrSize;
            const an = strings[dv.getUint32(a + 4, true)] || "";
            const rawVal = dv.getUint32(a + 8, true);
            const valueType = dv.getUint8(a + 14);
            const valueData = dv.getUint32(a + 18, true);
            target[an] = valueType === 0x03 ? strings[rawVal] : valueData;
          }
        }
      }
      cp += size;
    }
    return {
      package: manifestAttrs["package"] || "",
      versionName: manifestAttrs["versionName"] || "",
      versionCode: manifestAttrs["versionCode"] || "",
      label: appAttrs["label"] || "",
      icon: appAttrs["icon"] || "",
    };
  }

  function readString(buf, off, isUtf8, dv) {
    try {
      if (isUtf8) {
        let pos = off;
        let len = dv.getUint8(pos); pos++;
        if (len & 0x80) { len = ((len & 0x7f) << 8) | dv.getUint8(pos); pos++; }
        let slen = dv.getUint8(pos); pos++;
        if (slen & 0x80) { slen = ((slen & 0x7f) << 8) | dv.getUint8(pos); pos += 2; }
        return new TextDecoder("utf-8").decode(new Uint8Array(buf, pos, len));
      }
      let pos = off;
      let len = dv.getUint16(pos, true); pos += 2;
      if (len & 0x8000) { len = ((len & 0x7fff) << 16) | dv.getUint16(pos, true); pos += 2; }
      let s = "";
      for (let i = 0; i < len; i++) s += String.fromCharCode(dv.getUint16(pos + i * 2, true));
      return s;
    } catch (_) { return ""; }
  }

  /* ============================================================
     Rendering the live canvas
     ============================================================ */
  function renderApkPreview(info) {
    state.current = info;
    els.emptyState.hidden = true;
    els.webFrame.hidden = true;
    els.webFrame.removeAttribute("src");
    els.preview.hidden = false;
    hideMenu();
    els.editPanel.hidden = true;

    const icon = info.iconDataUrl || "";
    const iconStyle = icon ? `background-image:url('${icon}')` : "";
    const code = info.versionCode ? ` (${escapeHtml(String(info.versionCode))})` : "";
    els.preview.innerHTML = `
      <div class="app-meta">
        <div class="app-icon" style="${iconStyle}">${icon ? "" : "📦"}</div>
        <div class="app-name">${escapeHtml(info.label)}</div>
        <div class="app-pkg">${escapeHtml(info.package)}</div>
        <div class="app-row"><span>الإصدار</span><b>${escapeHtml(info.versionName)}${code}</b></div>
        <div class="app-row"><span>الحجم</span><b>${fmtSize(info.size)}</b></div>
        <div class="app-row"><span>الملف</span><b>${escapeHtml(info.fileName)}</b></div>
        <div class="app-row"><span>الموارد</span><b>${info.entries} عنصر</b></div>
        <button class="btn-launch" id="launchBtn">▶ فتح التطبيق</button>
      </div>`;
    els.preview.querySelector("#launchBtn").addEventListener("click", () => launchApp(info));
    showStatus("تم استخراج بيانات التطبيق بنجاح");
  }

  function launchApp(info) {
    const icon = info.iconDataUrl || "";
    els.splashIcon.src = icon;
    els.splashIcon.hidden = !icon;
    els.splashName.textContent = info.label;
    els.splash.hidden = false;
    showStatus("جارٍ تشغيل " + info.label + " …");
    setTimeout(() => {
      els.splash.hidden = true;
      const iconStyle = icon ? `background-image:url('${icon}')` : "";
      els.preview.innerHTML = `
        <div class="run-screen">
          <div class="run-icon" style="${iconStyle}">${icon ? "" : "📦"}</div>
          <div class="run-name">${escapeHtml(info.label)}</div>
          <div class="run-status">● يعمل الآن</div>
          <button class="btn-ghost sm" id="backBtn">رجوع</button>
        </div>`;
      els.preview.querySelector("#backBtn").addEventListener("click", () => renderApkPreview(info));
    }, 1300);
  }

  function loadUrl(url) {
    els.emptyState.hidden = true;
    els.preview.hidden = true;
    els.preview.innerHTML = "";
    els.webFrame.src = url;
    els.webFrame.hidden = false;
    showStatus("جارٍ تحميل " + url);
  }

  /* ============================================================
     Inspect -> floating options menu
     ============================================================ */
  els.inspectToggle.addEventListener("change", () => {
    const on = els.inspectToggle.checked;
    els.inspectOverlay.classList.toggle("on", on);
    if (!on) hideMenu();
  });

  els.inspectOverlay.addEventListener("click", (e) => {
    if (!els.inspectToggle.checked) return;
    const rect = els.screen.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // temporarily disable overlay so elementFromPoint sees the element beneath
    els.inspectOverlay.style.pointerEvents = "none";
    const t = document.elementFromPoint(e.clientX, e.clientY);
    els.inspectOverlay.style.pointerEvents = "";

    let el = null;
    if (t && els.screen.contains(t) && t !== els.inspectOverlay &&
        !els.optionsMenu.contains(t) && !els.editPanel.contains(t)) {
      el = t;
    }
    if (!el) { hideMenu(); return; }

    state.selectedEl = el;
    const r = el.getBoundingClientRect();
    showInspectBox(r.left - rect.left, r.top - rect.top, r.width, r.height);
    showMenuAt(x + 8, y + 8);
  });

  function showInspectBox(l, t, w, h) {
    els.inspectBox.hidden = false;
    els.inspectBox.style.left = l + "px";
    els.inspectBox.style.top = t + "px";
    els.inspectBox.style.width = w + "px";
    els.inspectBox.style.height = h + "px";
  }
  function hideMenu() {
    els.optionsMenu.hidden = true;
    els.inspectBox.hidden = true;
  }
  function positionEl(el, x, y) {
    const sw = els.screen.clientWidth, sh = els.screen.clientHeight;
    const w = el.offsetWidth || 160, h = el.offsetHeight || 130;
    if (x + w > sw) x = sw - w - 6;
    if (y + h > sh) y = sh - h - 6;
    if (x < 6) x = 6;
    if (y < 6) y = 6;
    el.style.left = x + "px";
    el.style.top = y + "px";
  }
  function showMenuAt(x, y) {
    els.optionsMenu.hidden = false;
    positionEl(els.optionsMenu, x, y);
  }

  els.optionsMenu.addEventListener("click", (e) => {
    const act = e.target.dataset.act;
    if (!act) return;
    if (act === "hide") {
      if (state.selectedEl) {
        state.selectedEl.style.visibility = "hidden";
        toast("تم إخفاء العنصر", "info");
      }
    } else if (act === "edit") {
      openEdit(state.selectedEl);
    }
    hideMenu();
  });

  function openEdit(el) {
    if (!el) return;
    state.editEl = el;
    const cs = getComputedStyle(el);
    els.epText.value = (el.textContent && el.textContent.trim().slice(0, 200)) || "";
    els.epColor.value = rgbToHex(cs.color) || "#ffffff";
    const fs = parseFloat(cs.fontSize) || 14;
    els.epSize.value = Math.min(64, Math.max(8, fs));
    const rect = els.screen.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    els.editPanel.hidden = false;
    positionEl(els.editPanel, r.left - rect.left, r.bottom - rect.top + 6);
  }

  els.epApply.addEventListener("click", () => {
    const el = state.editEl;
    if (!el) return;
    if (els.epText.value !== (el.textContent || "") &&
        el.tagName !== "IMG" && el.tagName !== "INPUT" && el.tagName !== "BR") {
      el.textContent = els.epText.value;
    }
    el.style.color = els.epColor.value;
    el.style.fontSize = els.epSize.value + "px";
    toast("تم تعديل العنصر", "success");
    els.editPanel.hidden = true;
  });
  els.epClose.addEventListener("click", () => { els.editPanel.hidden = true; });

  /* ============================================================
     PWA File Handling — open .apk/.zip from the file manager
     ============================================================ */
  if ("launchQueue" in window && window.launchQueue && "setConsumer" in window.launchQueue) {
    window.launchQueue.setConsumer(async (params) => {
      try {
        const f = params.files && params.files[0];
        if (f) {
          const file = await f.getFile();
          handleFile(file);
          showStatus("تم فتح الملف من مدير الملفات");
        }
      } catch (_) {}
    });
  }

  /* ============================================================
     Service worker (offline PWA)
     ============================================================ */
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  /* clock */
  function tickClock() {
    const d = new Date();
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    h = h % 12 || 12;
    els.sbTime.textContent = `${h}:${m}`;
  }
  tickClock();
  setInterval(tickClock, 10000);

  /* boot */
  showStatus("جاهز — اختر ملف APK للبدء");
})();
