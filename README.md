
# 🌌 Siahverse Portal

A sleek, dark-themed tech portal built by Siah — powered by Proxmox and glowing with cosmic vibes.

## 🔗 Live Site

> [https://siahverse.cc](https://siahverse.cc)

## 📁 File Structure

```
📦 Root
├── assets/              # Images, media, and other static files
├── 404.html             # Custom 404 Not Found page
├── README.md            # Project documentation
├── _headers             # Netlify custom headers (e.g., CORS, HSTS)
├── easter-egg.js        # Konami Code listener and hidden interactions
├── favicon.svg          # Site favicon
├── index.html           # Main HTML landing page
├── manifest.json        # PWA support file
├── secret.html          # Hidden page unlocked by the Konami Code
├── style.css            # CSS styles (dark mode, layout, etc.)
├── toggle-theme.js      # JavaScript to toggle light/dark mode
```

## 🛠 Features

- 🌓 Toggle between dark and light mode (`toggle-theme.js`)
- 🌠 Animated star background using `<canvas>`
- 🤖 Siahbot hover and click Easter egg messages (`#siahbot`)
- 🎮 Konami Code listener (`easter-egg.js`) to unlock `secret.html`
- 🛡 Custom `_headers` for security/performance (Netlify)
- 📱 Fully responsive layout for mobile + desktop
- 🚫 Clean and custom 404 page
- 📦 `manifest.json` for optional Progressive Web App support

## ✅ To-Do

- [ ] Add favicon variants for different platforms
- [ ] Improve accessibility (ARIA roles, landmarks)
- [ ] Add Open Graph preview image (`assets/preview.png`)

## 📸 Preview

> Coming soon...

## 🚀 Deployment

This site is optimized for static hosting platforms like **Netlify**, **Vercel**, or **GitHub Pages**.

### Deploy to Netlify:

1. Push your project to GitHub.
2. Go to [Netlify](https://www.netlify.com/), connect your repo.
3. Set build settings (use `/` as publish directory).
4. Done.

### Netlify Files

- `_headers` → Controls security headers and caching.
- `_redirects` → *(optional)* For single-page app fallback or custom routes.

## 🙌 Author

Made with ❤️ by Siah
Check out the live portal: [https://siahverse.cc](https://siahverse.cc)

---
