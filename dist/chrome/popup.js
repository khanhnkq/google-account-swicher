const extApi = typeof browser !== "undefined" ? browser : chrome;

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

document.addEventListener("DOMContentLoaded", async () => {
  const badge = document.getElementById("current-badge");
  const buttons = document.querySelectorAll(".account-btn");

  // Lấy thông tin tab hiện tại
  try {
    const tabs = await extApi.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0] && tabs[0].url) {
      const activeUrl = tabs[0].url;
      const currentIndex = detectAccountIndex(activeUrl);

      if (currentIndex !== null) {
        badge.textContent = `Đang là: u/${currentIndex}`;
        badge.classList.add("active");

        buttons.forEach((btn) => {
          if (parseInt(btn.dataset.index, 10) === currentIndex) {
            btn.classList.add("current");
          }
        });
      } else {
        const isGoogle = activeUrl.includes("google.com") || activeUrl.includes("youtube.com");
        badge.textContent = isGoogle ? "Mặc định (u/0)" : "Không phải Google";
      }
    }
  } catch (err) {
    console.error("Popup tab error:", err);
  }

  // Cập nhật phím tắt thực tế nếu người dùng đã tùy biến trong Firefox
  if (extApi.commands && extApi.commands.getAll) {
    try {
      const commands = await extApi.commands.getAll();
      commands.forEach((cmd) => {
        const match = cmd.name.match(/switch-to-(\d+)/);
        if (match && cmd.shortcut) {
          const idx = match[1];
          const btn = document.querySelector(`.account-btn[data-index="${idx}"] .shortcut`);
          if (btn) btn.textContent = cmd.shortcut;
        }
      });
    } catch (e) {}
  }

  // Sự kiện khi bấm nút chuyển tài khoản
  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetIndex = parseInt(btn.dataset.index, 10);
      try {
        await extApi.runtime.sendMessage({
          action: "switch",
          index: targetIndex
        });
        window.close(); // Đóng popup sau khi chuyển
      } catch (err) {
        console.error("Message send error:", err);
      }
    });
  });
});
