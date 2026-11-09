import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// The app loads its libraries from vendor/ with plain <script src="vendor/..."> tags:
// Firebase (app, auth, firestore, storage), Lucide, Chart.js, XLSX, html2canvas.
// Vite rewrites the <link> to tailwind.css into dist/assets, but it leaves those plain
// script tags alone and does NOT copy vendor/ into dist. So every APK built this way
// shipped an index.html pointing at four Firebase files that were not there:
// `firebase` was undefined -> gblFatalLoadError -> the init block threw BEFORE
// setupEventListeners() ran -> not one button on the screen responded to a tap, the
// login button included. The web build is unaffected: hosting serves the project root,
// where vendor/ already sits next to index.html.
//
// Copy it on every build, and fail the build rather than ship a silent half-app.
const copyVendor = () => ({
    name: 'copy-vendor',
    closeBundle() {
        const root = process.cwd();
        const from = path.resolve(root, 'vendor');
        const to = path.resolve(root, 'dist', 'vendor');
        if (!fs.existsSync(from)) {
            throw new Error('vendor/ is missing from the project - the app cannot run without it.');
        }
        fs.cpSync(from, to, { recursive: true });
        const expected = fs.readdirSync(from);
        const missing = expected.filter(f => !fs.existsSync(path.join(to, f)));
        if (missing.length) {
            throw new Error('vendor/ was not fully copied into dist: ' + missing.join(', '));
        }
        // Whatever index.html asks for by <script src="vendor/...">, dist must have.
        const html = fs.readFileSync(path.resolve(root, 'dist', 'index.html'), 'utf8');
        const asked = [...html.matchAll(/src="vendor\/([^"]+)"/g)].map(m => m[1]);
        const absent = asked.filter(f => !fs.existsSync(path.join(to, f)));
        if (absent.length) {
            throw new Error('dist/index.html asks for vendor files that do not exist: ' + absent.join(', '));
        }
        console.log('[copy-vendor] dist/vendor has ' + expected.length + ' files; index.html asks for ' + asked.length + ', all present.');
    }
});

export default defineConfig({
    root: './',
    plugins: [copyVendor()],
    build: {
        outDir: 'dist',
        minify: false, // Keep code readable for debugging if needed
        emptyOutDir: true,
    },
});
