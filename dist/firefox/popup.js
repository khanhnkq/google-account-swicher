const extApi = typeof browser !== "undefined" ? browser : chrome;

const DEFAULT_COUNT = 4;
let accountCount = DEFAULT_COUNT;
let customShortcuts = {};
let recordingIndex = null;
let currentDetectedIndex = null;

function t(key, substitutions) {
  if (extApi.i18n && extApi.i18n.getMessage) {
    const val = extApi.i18n.getMessage(key, substitutions);
    if (val) return val;
  }
  return null;
}

function applyStaticLocalization() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const msg = t(key);
    if (msg) el.textContent = msg;
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

function getDefaultShortcut(index) {
  if (index < 9) {
    return `Alt+Shift+${index + 1}`;
  }
  return "";
}

function getShortcutForIndex(index) {
  const key = index.toString();
  if (customShortcuts[key] !== undefined) {
    return customShortcuts[key];
  }
  return getDefaultShortcut(index);
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

function renderAccountGrid() {
  const grid = document.getElementById("account-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const defaultUserLabel = t("defaultUser") || "Người dùng 0 (Mặc định)";

  for (let i = 0; i < accountCount; i++) {
    const row = document.createElement("div");
    row.className = "account-row";
    row.dataset.index = i.toString();

    if (currentDetectedIndex === i) {
      row.classList.add("current");
    }

    // Account Button
    const accBtn = document.createElement("button");
    accBtn.type = "button";
    accBtn.className = "account-btn";
    accBtn.dataset.index = i.toString();

    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.textContent = i.toString();

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = i === 0 ? defaultUserLabel : (t("userLabel", [i.toString()]) || `Người dùng ${i}`);

    accBtn.appendChild(avatar);
    accBtn.appendChild(label);
    accBtn.addEventListener("click", () => triggerSwitch(i));

    // Shortcut Badge Button
    const badgeBtn = document.createElement("button");
    badgeBtn.type = "button";
    badgeBtn.className = "key-badge-btn";
    badgeBtn.dataset.keyIndex = i.toString();
    badgeBtn.title = t("clickToChange") || "Bấm để đổi phím tắt";

    const kbd = document.createElement("kbd");
    kbd.className = "key-badge";
    const sc = getShortcutForIndex(i);
    kbd.textContent = sc || "---";

    badgeBtn.appendChild(kbd);
    badgeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      startRecording(badgeBtn, i.toString());
    });

    row.appendChild(accBtn);
    row.appendChild(badgeBtn);
    grid.appendChild(row);
  }
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

function getPressedKeyCombo(e) {
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

function startRecording(btn, indexStr) {
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

    if (e.key === "Escape") {
      stopRecording();
      return;
    }

    const combo = getPressedKeyCombo(e);
    if (combo) {
      customShortcuts[indexStr] = combo;
      if (extApi.storage && extApi.storage.local) {
        extApi.storage.local.set({ customShortcuts });
      }
      stopRecording();
    }
  };

  function stopRecording() {
    window.removeEventListener("keydown", onKeyDown, true);
    btn.classList.remove("recording");
    renderAccountGrid();
    recordingIndex = null;
  }

  window.addEventListener("keydown", onKeyDown, true);
}

async function loadData() {
  if (extApi.storage && extApi.storage.local) {
    const data = await extApi.storage.local.get(["accountCount", "customShortcuts"]);
    if (data.accountCount && typeof data.accountCount === "number") {
      accountCount = Math.max(1, Math.min(20, data.accountCount));
    }
    if (data.customShortcuts) {
      customShortcuts = data.customShortcuts;
    }
  }

  const countInput = document.getElementById("account-count-input");
  if (countInput) {
    countInput.value = accountCount.toString();
  }
}

function setAccountCount(newCount) {
  const clamped = Math.max(1, Math.min(20, newCount));
  accountCount = clamped;
  const countInput = document.getElementById("account-count-input");
  if (countInput) countInput.value = clamped.toString();

  if (extApi.storage && extApi.storage.local) {
    extApi.storage.local.set({ accountCount: clamped });
  }
  renderAccountGrid();
}

document.addEventListener("DOMContentLoaded", async () => {
  applyStaticLocalization();
  await loadData();

  const badge = document.getElementById("current-badge");
  const countInput = document.getElementById("account-count-input");
  const decBtn = document.getElementById("dec-count");
  const incBtn = document.getElementById("inc-count");
  const resetBtn = document.getElementById("reset-shortcuts-btn");

  // 1. Quét trạng thái tab hiện tại
  try {
    const tabs = await extApi.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      const activeUrl = tabs[0].url;
      const detected = detectAccountIndex(activeUrl);

      if (detected !== null) {
        currentDetectedIndex = detected;
        const activeText = t("currentUser", [detected.toString()]) || `Đang dùng: Người dùng ${detected}`;
        badge.textContent = activeText;
        badge.classList.add("active");

        if (detected >= accountCount) {
          setAccountCount(detected + 1);
        }
      } else {
        const isGoogle = activeUrl.includes("google.com") || activeUrl.includes("youtube.com");
        badge.textContent = isGoogle ? (t("defaultUser") || "Người dùng 0") : (t("notGoogle") || "Không phải Google");
      }
    }
  } catch (err) {
    console.error("[Popup] Tab query error:", err);
  }

  // 2. Render danh sách tài khoản
  renderAccountGrid();

  // 3. Tương tác Stepper số lượng tài khoản
  if (decBtn) {
    decBtn.addEventListener("click", () => setAccountCount(accountCount - 1));
  }
  if (incBtn) {
    incBtn.addEventListener("click", () => setAccountCount(accountCount + 1));
  }
  if (countInput) {
    countInput.addEventListener("change", () => {
      const val = parseInt(countInput.value.trim(), 10);
      if (!isNaN(val)) setAccountCount(val);
      else countInput.value = accountCount.toString();
    });
  }

  // 4. Khôi phục phím gốc
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      customShortcuts = {};
      if (extApi.storage && extApi.storage.local) {
        extApi.storage.local.remove("customShortcuts");
      }
      renderAccountGrid();
    });
  }
});
