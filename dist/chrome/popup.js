const extApi = typeof browser !== "undefined" ? browser : chrome;

const DEFAULT_SHORTCUTS = {
  "0": "Alt+Shift+1",
  "1": "Alt+Shift+2",
  "2": "Alt+Shift+3",
  "3": "Alt+Shift+4"
};

let currentShortcuts = { ...DEFAULT_SHORTCUTS };
let recordingIndex = null;

function t(key, substitutions) {
  if (extApi.i18n && extApi.i18n.getMessage) {
    const val = extApi.i18n.getMessage(key, substitutions);
    if (val) return val;
  }
  return null;
}

function applyLocalization() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const msg = t(key);
    if (msg) el.textContent = msg;
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const msg = t(key);
    if (msg) el.setAttribute("placeholder", msg);
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    const msg = t(key);
    if (msg) el.setAttribute("title", msg);
  });

  document.querySelectorAll("[data-user-index]").forEach((el) => {
    const idx = el.getAttribute("data-user-index");
    const msg = t("userLabel", [idx]) || `Người dùng ${idx}`;
    el.textContent = msg;
  });
}

function detectAccountIndex(urlStr) {
  try {
    const url = new URL(urlStr);
    const uMatch = url.pathname.match(/\/u\/(\d+)(\/|$)/);
    if (uMatch) return parseInt(uMatch[1], 10);

    if (url.searchParams.has("authuser")) {
      return parseInt(url.searchParams.get("authuser"), 10);
    }
  } catch (e) {}
  return null;
}

async function triggerSwitch(targetIndex) {
  try {
    await extApi.runtime.sendMessage({
      action: "switch",
      index: targetIndex
    });
    window.close();
  } catch (err) {
    console.error("[Popup] Switch error:", err);
  }
}

function updateShortcutBadges() {
  document.querySelectorAll(".key-badge-btn").forEach((btn) => {
    const idx = btn.getAttribute("data-key-index");
    const badge = btn.querySelector(".key-badge");
    if (badge && currentShortcuts[idx]) {
      badge.textContent = currentShortcuts[idx];
    }
  });
}

async function loadSavedShortcuts() {
  if (extApi.storage && extApi.storage.local) {
    const data = await extApi.storage.local.get("customShortcuts");
    if (data && data.customShortcuts) {
      currentShortcuts = { ...DEFAULT_SHORTCUTS, ...data.customShortcuts };
    }
  }
  updateShortcutBadges();
}

function saveCustomShortcut(indexStr, combo) {
  currentShortcuts[indexStr] = combo;
  if (extApi.storage && extApi.storage.local) {
    extApi.storage.local.set({ customShortcuts: currentShortcuts });
  }
  updateShortcutBadges();
}

function getPressedKeyCombo(e) {
  const parts = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Meta");

  const key = e.key;
  if (["Control", "Alt", "Shift", "Meta"].includes(key)) {
    return null; // Chỉ có phím bổ trợ, chưa đủ tổ hợp
  }

  const normalized = key.length === 1 ? key.toUpperCase() : key;
  parts.push(normalized);
  return parts.join("+");
}

function startRecording(btn, indexStr) {
  // Hủy nếu đang record nút khác
  if (recordingIndex !== null) {
    stopRecording();
  }

  recordingIndex = indexStr;
  btn.classList.add("recording");
  const badge = btn.querySelector(".key-badge");
  badge.textContent = t("recordingKey") || "Nhấn phím...";

  const onKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Phím Esc để hủy
    if (e.key === "Escape") {
      stopRecording();
      return;
    }

    const combo = getPressedKeyCombo(e);
    if (combo) {
      saveCustomShortcut(indexStr, combo);
      stopRecording();
    }
  };

  function stopRecording() {
    window.removeEventListener("keydown", onKeyDown, true);
    btn.classList.remove("recording");
    updateShortcutBadges();
    recordingIndex = null;
  }

  window.addEventListener("keydown", onKeyDown, true);
}

document.addEventListener("DOMContentLoaded", async () => {
  applyLocalization();
  await loadSavedShortcuts();

  const badge = document.getElementById("current-badge");
  const rows = document.querySelectorAll(".account-row");
  const form = document.getElementById("custom-form");
  const customInput = document.getElementById("custom-index");
  const resetBtn = document.getElementById("reset-shortcuts-btn");

  // 1. Quét trạng thái tab hiện tại
  try {
    const tabs = await extApi.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      const activeUrl = tabs[0].url;
      const currentIndex = detectAccountIndex(activeUrl);

      if (currentIndex !== null) {
        const activeText = t("currentUser", [currentIndex.toString()]) || `Đang dùng: Người dùng ${currentIndex}`;
        badge.textContent = activeText;
        badge.classList.add("active");

        rows.forEach((row) => {
          if (parseInt(row.dataset.index, 10) === currentIndex) {
            row.classList.add("current");
          }
        });

        if (customInput) {
          customInput.placeholder = (currentIndex + 1).toString();
        }
      } else {
        const isGoogle = activeUrl.includes("google.com") || activeUrl.includes("youtube.com");
        badge.textContent = isGoogle ? (t("defaultUser") || "Người dùng 0") : (t("notGoogle") || "Không phải Google");
      }
    }
  } catch (err) {
    console.error("[Popup] Tab query error:", err);
  }

  // 2. Click chuyển tài khoản
  document.querySelectorAll(".account-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetIndex = parseInt(btn.dataset.index, 10);
      triggerSwitch(targetIndex);
    });
  });

  // 3. Click đổi phím tắt bất kỳ
  document.querySelectorAll(".key-badge-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = btn.getAttribute("data-key-index");
      startRecording(btn, idx);
    });
  });

  // 4. Form nhập số người dùng tùy ý
  if (form && customInput) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = parseInt(customInput.value.trim(), 10);
      if (!isNaN(val) && val >= 0) {
        triggerSwitch(val);
      }
    });
  }

  // 5. Khôi phục phím tắt gốc
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      currentShortcuts = { ...DEFAULT_SHORTCUTS };
      if (extApi.storage && extApi.storage.local) {
        extApi.storage.local.remove("customShortcuts");
      }
      updateShortcutBadges();
    });
  }
});
