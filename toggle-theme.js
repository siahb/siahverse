document.addEventListener("DOMContentLoaded", () => {
  const toggleInput = document.getElementById("toggle-theme");
  const root = document.documentElement;

  // Detect saved or system preference
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const defaultTheme = savedTheme || (prefersDark ? "dark" : "light");

  root.setAttribute("data-theme", defaultTheme);
  toggleInput.checked = defaultTheme === "dark";

  toggleInput.addEventListener("change", () => {
    const newTheme = toggleInput.checked ? "dark" : "light";
    root.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  });
});
