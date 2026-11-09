# SHGH Learning App (UK)

The Android and web app that teachers, volunteers and admins at Sovereign House GH use to run digital skills courses in Greater Manchester: registers, courses, students, volunteer hours and equipment.

**Live (web):** https://shgh-lms1.web.app (staff sign in)

Part of the **SHGH Digital Platform**: [Intranet Portal](https://github.com/fferracc/shgh-intranet-portal) · [Ghana Attendance App](https://github.com/fferracc/shgh-attendance-app-ghana) · [Application Forms](https://github.com/fferracc/shgh-application-forms) · [n8n Automations](https://github.com/fferracc/n8n-automations)

<!-- ![UK app](docs/screenshot.png) -->

## What it does
- **Teachers:** my courses, my schedule, take attendance (works offline and syncs later), submit session reports
- **Volunteers:** log hours, see badges and months of service
- **Admins:** manage courses, students, volunteers and admins, statistics, laptop inventory, policy compliance, reminders and messages
- Roles and fine grained permissions shared with the Intranet Portal
- **Over the air updates:** a new web bundle reaches every phone without reinstalling; a broken update rolls back automatically within 10 seconds
- One codebase serves both the Android app and the web app

## Engineering highlights
- Single page app in one HTML file with vendored libraries, so it runs inside Capacitor with no build step for the web layer
- Firestore offline persistence for registers taken without signal
- User text escaped and HTML sanitised (DOMPurify) before display
- `publish_update.ps1` stamps a version, builds, packages the bundle, deploys hosting and checks that phones can see the new version

## Stack
JavaScript, Tailwind CSS, Firebase (Auth, Firestore, Functions, Hosting), Capacitor (Android), Capgo updater, Chart.js, SheetJS, DOMPurify

## Run locally
1. Put your Firebase web config in the `firebaseConfig` block of `index.html`.
2. Serve the folder (for example `npx serve .`) or open it with the Firebase emulator.
3. Android: `npm install`, `npx cap sync android`, then open `android/` in Android Studio.

## Data and privacy
No real user data is in this repository. Signing keys and Firebase keys are not included.

## Status
Live and in daily use.

Shown with permission of Sovereign House GH.
