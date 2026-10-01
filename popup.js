const extApi = typeof browser !== "undefined" ? browser : chrome;

const DEFAULT_COUNT = 4;
const DEFAULT_CYCLE_SHORTCUT = "Alt+Shift+S";

let accountCount = DEFAULT_COUNT;
let customShortcuts = {};
let recordingKey = null;
let currentDetectedGoogleIndex = null;

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

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    const msg = t(key);
    if (msg) el.setAttribute("title", msg);
  });
}

function detectGoogleAccountIndex(urlStr) {
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

function getDefaultShortcutForUserNum(userNum) {
  if (userNum <= 9) {
    return `Alt+Shift+${userNum}`;
  }
  return "";
}

function getShortcutForUserNum(userNum) {
  const key = userNum.toString();
  if (customShortcuts[key] !== undefined) {
    return customShortcuts[key];
  }
  return getDefaultShortcutForUserNum(userNum);
}

function getCycleShortcut() {
  if (customShortcuts["cycle"] !== undefined) {
    return customShortcuts["cycle"];
  }
  return DEFAULT_CYCLE_SHORTCUT;
}

async function triggerSwitch(googleIndex) {
  try {
    await extApi.runtime.sendMessage({
      action: "switch",
      index: googleIndex
    });
    window.close();
  } catch (err) {
    console.error("[Popup] Switch error:", err);
  }
}

async function triggerCycle() {
  try {
    await extApi.runtime.sendMessage({
      action: "cycle",
      step: 1
    });
    window.close();
  } catch (err) {
    console.error("[Popup] Cycle error:", err);
  }
}

function updateCycleBadge() {
  const badge = document.getElementById("cycle-key-badge");
  if (badge) {
    badge.textContent = getCycleShortcut();
  }
}

function renderAccountGrid() {
  const grid = document.getElementById("account-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const defaultUserLabel = t("defaultUser") || "Người dùng 1 (Mặc định)";

  for (let i = 0; i < accountCount; i++) {
    const userNum = i + 1; // 1, 2, ..., accountCount
    const googleIndex = i; // 0, 1, ..., accountCount - 1

    const row = document.createElement("div");
    row.className = "account-row";
    row.dataset.userNum = userNum.toString();

    if (currentDetectedGoogleIndex === googleIndex) {
      row.classList.add("current");
    }

    // Nút bấm chuyển tài khoản
    const accBtn = document.createElement("button");
    accBtn.type = "button";
    accBtn.className = "account-btn";

    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.textContent = userNum.toString();

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = userNum === 1 ? defaultUserLabel : (t("userLabel", [userNum.toString()]) || `Người dùng ${userNum}`);

    accBtn.appendChild(avatar);
    accBtn.appendChild(label);
    accBtn.addEventListener("click", () => triggerSwitch(googleIndex));

    // Nút đổi phím tắt
    const badgeBtn = document.createElement("button");
    badgeBtn.type = "button";
    badgeBtn.className = "key-badge-btn";
    badgeBtn.dataset.keyTarget = userNum.toString();
    badgeBtn.title = t("clickToChange") || "Bấm để đổi phím tắt";

    const kbd = document.createElement("kbd");
    kbd.className = "key-badge";
    const sc = getShortcutForUserNum(userNum);
    kbd.textContent = sc || "---";

    badgeBtn.appendChild(kbd);
    badgeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      startRecording(badgeBtn, userNum.toString());
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

function startRecording(btn, targetKey) {
  if (recordingKey !== null) {
    stopRecording();
  }

  recordingKey = targetKey;
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
      customShortcuts[targetKey] = combo;
      if (extApi.storage && extApi.storage.local) {
        extApi.storage.local.set({ customShortcuts });
      }
      stopRecording();
    }
  };

  function stopRecording() {
    window.removeEventListener("keydown", onKeyDown, true);
    btn.classList.remove("recording");
    if (targetKey === "cycle") {
      updateCycleBadge();
    } else {
      renderAccountGrid();
    }
    recordingKey = null;
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

  updateCycleBadge();
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
  const cycleActionBtn = document.getElementById("cycle-action-btn");
  const cycleKeyBtn = document.getElementById("cycle-key-btn");

  // 1. Quét trạng thái tab hiện tại
  try {
    const tabs = await extApi.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      const activeUrl = tabs[0].url;
      const detectedGoogleIdx = detectGoogleAccountIndex(activeUrl);

      if (detectedGoogleIdx !== null) {
        currentDetectedGoogleIndex = detectedGoogleIdx;
        const userNum = detectedGoogleIdx + 1;
        const activeText = t("currentUser", [userNum.toString()]) || `Đang dùng: Người dùng ${userNum}`;
        badge.textContent = activeText;
        badge.classList.add("active");

        if (userNum > accountCount) {
          setAccountCount(userNum);
        }
      } else {
        const isGoogle = activeUrl.includes("google.com") || activeUrl.includes("youtube.com");
        badge.textContent = isGoogle ? (t("defaultUser") || "Người dùng 1") : (t("notGoogle") || "Không phải Google");
      }
    }
  } catch (err) {
    console.error("[Popup] Tab query error:", err);
  }

  // 2. Render danh sách tài khoản
  renderAccountGrid();

  // 3. Tương tác Nút Cycle
  if (cycleActionBtn) {
    cycleActionBtn.addEventListener("click", triggerCycle);
  }
  if (cycleKeyBtn) {
    cycleKeyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      startRecording(cycleKeyBtn, "cycle");
    });
  }

  // 4. Tương tác Stepper số lượng tài khoản
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

  // 5. Khôi phục phím gốc
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      customShortcuts = {};
      if (extApi.storage && extApi.storage.local) {
        extApi.storage.local.remove("customShortcuts");
      }
      updateCycleBadge();
      renderAccountGrid();
    });
  }
});
