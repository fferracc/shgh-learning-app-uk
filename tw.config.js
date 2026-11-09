// Tailwind build for the UK app (25 Sep 2026). The app used the Tailwind play CDN,
// which needs internet and is not meant for production. Regenerate vendor/tailwind.css
// after adding new classes:  npx tailwindcss@3.4.17 -c tw.config.js -i tw-in.css -o vendor/tailwind.css --minify
module.exports = { content: ['./index.html'], theme: { extend: {} }, plugins: [] };
