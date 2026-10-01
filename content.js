/**
 * Fast Google Account Switcher - Content Script
 * Lắng nghe phím tắt chuyển tài khoản và phím tắt xoay vòng (cycle)
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

  // Phím tắt xoay vòng (cycle) mặc định là Alt+Shift+S
  result["cycle"] = "Alt+Shift+S";

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

function getNormalizedKey(e) {
  if (e.code) {
    const digitMatch = e.code.match(/^Digit([0-9])$/);
    if (digitMatch) return digitMatch[1];
    const numpadMatch = e.code.match(/^Numpad([0-9])$/);
    if (numpadMatch) return numpadMatch[1];
    const keyMatch = e.code.match(/^Key([A-Z])$/i);
    if (keyMatch) return keyMatch[1].toUpperCase();
  }

  const shiftNumMap = {
    "!": "1", "@": "2", "#": "3", "$": "4", "%": "5",
    "^": "6", "&": "7", "*": "8", "(": "9", ")": "0"
  };
  if (shiftNumMap[e.key]) {
    return shiftNumMap[e.key];
  }

  if (e.key && e.key.length === 1) {
    return e.key.toUpperCase();
  }
  return e.key;
}

function getEventKeyCombo(e) {
  const parts = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Meta");

  const key = getNormalizedKey(e);
  if (!key || ["Control", "Alt", "Shift", "Meta"].includes(key)) {
    return null;
  }

  parts.push(key);
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

    // 1. Kiểm tra phím tắt xoay vòng (cycle)
    if (activeShortcuts["cycle"] && activeShortcuts["cycle"].toLowerCase() === combo.toLowerCase()) {
      e.preventDefault();
      e.stopPropagation();
      extApi.runtime.sendMessage({ action: "cycle", step: 1 });
      return;
    }

    // 2. Kiểm tra phím tắt theo số thứ tự tài khoản
    for (const [accIndex, shortcut] of Object.entries(activeShortcuts)) {
      if (accIndex !== "cycle" && shortcut && shortcut.toLowerCase() === combo.toLowerCase()) {
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
