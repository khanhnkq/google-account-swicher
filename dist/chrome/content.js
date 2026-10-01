/**
 * Fast Google Account Switcher - Content Script
 * Lắng nghe các phím tắt tùy biến do người dùng tự cài đặt trên trang Google
 */

const extApi = typeof browser !== "undefined" ? browser : chrome;

const DEFAULT_SHORTCUTS = {
  "0": "Alt+Shift+1",
  "1": "Alt+Shift+2",
  "2": "Alt+Shift+3",
  "3": "Alt+Shift+4"
};

let activeShortcuts = { ...DEFAULT_SHORTCUTS };

function loadShortcuts() {
  if (extApi.storage && extApi.storage.local) {
    extApi.storage.local.get("customShortcuts", (data) => {
      if (data && data.customShortcuts) {
        activeShortcuts = { ...DEFAULT_SHORTCUTS, ...data.customShortcuts };
      }
    });
  }
}

loadShortcuts();

// Cập nhật phím tắt tức thời khi người dùng vừa đổi trong popup
if (extApi.storage && extApi.storage.onChanged) {
  extApi.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.customShortcuts) {
      activeShortcuts = { ...DEFAULT_SHORTCUTS, ...changes.customShortcuts.newValue };
    }
  });
}

/**
 * Chuyển đổi phím bấm thành chuỗi tổ hợp (ví dụ: "Alt+1", "Ctrl+Shift+G", "F2")
 */
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

// Bắt sự kiện keydown ở Capture phase (true) để không bị Gmail / Google Docs nuốt phím
window.addEventListener(
  "keydown",
  (e) => {
    const target = e.target;
    const tag = (target.tagName || "").toLowerCase();

    // Không kích hoạt khi đang gõ chữ trong ô input, textarea, hoặc soạn văn bản
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
