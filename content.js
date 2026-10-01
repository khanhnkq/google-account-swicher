/**
 * Fast Google Account Switcher - Content Script
 * Lắng nghe phím tắt theo số lượng tài khoản đã cấu hình
 */

const extApi = typeof browser !== "undefined" ? browser : chrome;

let accountCount = 4;
let customShortcuts = {};
let activeShortcuts = {};

function rebuildShortcuts() {
  const result = {};
  for (let i = 0; i < accountCount; i++) {
    if (i < 9) {
      result[i.toString()] = `Alt+Shift+${i + 1}`;
    }
  }
  if (customShortcuts) {
    for (const [k, v] of Object.entries(customShortcuts)) {
      result[k] = v;
    }
  }
  activeShortcuts = result;
}

function loadConfig() {
  if (extApi.storage && extApi.storage.local) {
    extApi.storage.local.get(["accountCount", "customShortcuts"], (data) => {
      if (data) {
        if (typeof data.accountCount === "number") {
          accountCount = Math.max(1, Math.min(20, data.accountCount));
        }
        if (data.customShortcuts) {
          customShortcuts = data.customShortcuts;
        }
      }
      rebuildShortcuts();
    });
  } else {
    rebuildShortcuts();
  }
}

loadConfig();

// Cập nhật khi người dùng đổi số lượng tài khoản hoặc đổi phím tắt
if (extApi.storage && extApi.storage.onChanged) {
  extApi.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if (changes.accountCount) {
        accountCount = changes.accountCount.newValue;
      }
      if (changes.customShortcuts) {
        customShortcuts = changes.customShortcuts.newValue || {};
      }
      rebuildShortcuts();
    }
  });
}

function getEventKeyCombo(e) {
  const parts = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Meta");

  const key = e.key;
  if (!key || ["Control", "Alt", "Shift", "Meta"].includes(key)) {
    return null;
  }

  const normalized = key.length === 1 ? key.toUpperCase() : key;
  parts.push(normalized);
  return parts.join("+");
}

window.addEventListener(
  "keydown",
  (e) => {
    const target = e.target;
    const tag = (target.tagName || "").toLowerCase();

    if (
      tag === "input" ||
      tag === "textarea" ||
      target.isContentEditable ||
      target.getAttribute("role") === "textbox"
    ) {
      return;
    }

    const combo = getEventKeyCombo(e);
    if (!combo) return;

    for (const [accIndex, shortcut] of Object.entries(activeShortcuts)) {
      if (shortcut && shortcut.toLowerCase() === combo.toLowerCase()) {
        e.preventDefault();
        e.stopPropagation();
        extApi.runtime.sendMessage({
          action: "switch",
          index: parseInt(accIndex, 10)
        });
        break;
      }
    }
  },
  true
);
