document.addEventListener("DOMContentLoaded", () => {
  const toggleInput = document.getElementById("toggle-theme");
  const root = document.documentElement;

  // Check for saved theme or use system preference
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  const defaultTheme = savedTheme || (prefersDark ? "dark" : "light");
  root.setAttribute("data-theme", defaultTheme);
  toggleInput.checked = defaultTheme === "dark";

  // Toggle switch
  toggleInput.addEventListener("change", () => {
    const newTheme = toggleInput.checked ? "dark" : "light";
    root.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  });
});
