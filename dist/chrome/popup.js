const extApi = typeof browser !== "undefined" ? browser : chrome;

/**
 * Trích xuất index tài khoản từ URL Google
 */
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

/**
 * Lấy chuỗi bản dịch từ i18n
 */
function t(key, substitutions) {
  if (extApi.i18n && extApi.i18n.getMessage) {
    const val = extApi.i18n.getMessage(key, substitutions);
    if (val) return val;
  }
  return null;
}

/**
 * Áp dụng i18n cho toàn bộ DOM
 */
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

  // Gán nhãn cho các card "Người dùng X" / "User X"
  document.querySelectorAll("[data-user-index]").forEach((el) => {
    const idx = el.getAttribute("data-user-index");
    const msg = t("userLabel", [idx]) || `Người dùng ${idx}`;
    el.textContent = msg;
  });
}

/**
 * Gửi lệnh chuyển tài khoản sang background script
 */
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

document.addEventListener("DOMContentLoaded", async () => {
  applyLocalization();

  const badge = document.getElementById("current-badge");
  const cards = document.querySelectorAll(".account-card");
  const form = document.getElementById("custom-form");
  const customInput = document.getElementById("custom-index");

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

        cards.forEach((card) => {
          if (parseInt(card.dataset.index, 10) === currentIndex) {
            card.classList.add("current");
          }
        });

        // Đặt sẵn giá trị gợi ý cho ô nhập nếu cần
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

  // 2. Cập nhật phím tắt từ Firefox/Chrome commands API nếu có
  if (extApi.commands && extApi.commands.getAll) {
    try {
      const commands = await extApi.commands.getAll();
      commands.forEach((cmd) => {
        const match = cmd.name.match(/switch-to-(\d+)/);
        if (match && cmd.shortcut) {
          const idx = match[1];
          const badgeEl = document.querySelector(`.account-card[data-index="${idx}"] .key-badge`);
          if (badgeEl) badgeEl.textContent = cmd.shortcut;
        }
      });
    } catch (e) {}
  }

  // 3. Sự kiện bấm vào các card chọn nhanh
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const targetIndex = parseInt(card.dataset.index, 10);
      triggerSwitch(targetIndex);
    });
  });

  // 4. Sự kiện form nhập số người dùng tùy ý
  if (form && customInput) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = parseInt(customInput.value.trim(), 10);
      if (!isNaN(val) && val >= 0) {
        triggerSwitch(val);
      }
    });
  }
});
