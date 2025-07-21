document.addEventListener("DOMContentLoaded", () => {
  const toggleInput = document.getElementById("toggle-theme");
  const root = document.documentElement;

  // 📦 Check if a theme was saved by user
  const savedTheme = localStorage.getItem("theme");

  // 🌗 Otherwise, follow the user's system (iPhone/macOS/etc)
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const defaultTheme = savedTheme || (prefersDark ? "dark" : "light");

  // 🖼️ Apply theme
  root.setAttribute("data-theme", defaultTheme);
  toggleInput.checked = defaultTheme === "dark";

  // 🔁 Save user toggle
  toggleInput.addEventListener("change", () => {
    const newTheme = toggleInput.checked ? "dark" : "light";
    root.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  });
});
