
# 🌌 Siahverse Portal

A sleek, dark-themed tech portal built by Josiah — powered by Proxmox and glowing with cosmic vibes.

## 🔗 Live Site

> [https://siahverse.cc](https://siahverse.cc)

## 📁 File Structure

```
📦 Root
├── assets/              # Images, media, and other static files
├── 404.html             # Custom 404 Not Found page
├── _headers             # Netlify custom headers (e.g., CORS, HSTS)
├── favicon.svg          # Site favicon
├── index.html           # Main HTML landing page
├── style.css            # CSS styles (dark mode, layout, etc.)
├── toggle-theme.js      # JavaScript to toggle light/dark mode
```

## 🛠 Features

- 🌓 Toggle between dark and light mode (`toggle-theme.js`)
- 🌠 Animated star background using `<canvas>`
- 🤖 Siahbot Easter egg element (`#siahbot`)
- 🛡 Custom `_headers` for security/performance (Netlify)
- 📱 Fully responsive layout for mobile + desktop
- 🚫 Clean and custom 404 page

## ✅ To-Do

- [ ] Fix `#siahbot` click bug (currently stops canvas animation)
- [ ] Add `manifest.json` for optional PWA support
- [ ] Include meta tags for SEO and social sharing (Open Graph, Twitter Cards)
- [ ] Add `_redirects` file for Netlify-friendly SPA routing
- [ ] Improve accessibility (ARIA roles, landmarks)

## 📸 Preview

> Coming soon...

## 🚀 Deployment

This site is optimized for static hosting platforms like **Netlify**, **Vercel**, or **GitHub Pages**.

### Deploy to Netlify:

1. Push your project to GitHub.
2. Go to [Netlify](https://www.netlify.com/), connect your repo.
3. Set build settings (if needed, use just `/` as publish directory).
4. Done.

### Optional Netlify Features

- `_headers` → for HTTP headers, CORS, caching, security
- `_redirects` → for SPA fallback or custom routing

## 🙌 Author

Made with ❤️ by **Josiah Borja**  
Check out the live portal: [https://siahverse.cc](https://siahverse.cc)

---
