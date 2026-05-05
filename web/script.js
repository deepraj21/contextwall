const navToggle = document.getElementById("nav-toggle");
const navLinks = document.getElementById("nav-links");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!expanded));
    navLinks.classList.toggle("open");
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const installTabs = document.querySelectorAll(".install-tab");
const installCommand = document.getElementById("install-command");
const copyInstallButton = document.getElementById("copy-install");

if (installTabs.length > 0 && installCommand) {
  installTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      installTabs.forEach((item) => {
        item.classList.remove("is-active");
        item.setAttribute("aria-selected", "false");
      });

      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      installCommand.textContent = tab.getAttribute("data-command") || "";
    });
  });
}

if (copyInstallButton && installCommand) {
  copyInstallButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(installCommand.textContent || "");
      copyInstallButton.classList.add("is-copied");
      copyInstallButton.setAttribute("title", "Copied");
      setTimeout(() => {
        copyInstallButton.classList.remove("is-copied");
        copyInstallButton.setAttribute("title", "Copy install command");
      }, 1200);
    } catch {
      copyInstallButton.classList.add("is-copy-failed");
      copyInstallButton.setAttribute("title", "Copy failed");
      setTimeout(() => {
        copyInstallButton.classList.remove("is-copy-failed");
        copyInstallButton.setAttribute("title", "Copy install command");
      }, 1200);
    }
  });
}

