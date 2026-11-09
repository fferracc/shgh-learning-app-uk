# Updating the UK app on everyone's phone

Added 24 September 2026. No emails, no reinstalling.

## How it works for the teacher
1. They open the app as normal.
2. If there is a new version, a green bar appears at the bottom: **"Updating the app... You can keep working."**
3. When it has downloaded: **"Update ready. It installs automatically next time you open the app."** with a **Restart now** button.
4. Next time they open the app, they are on the new version. Nothing else to do.

If a new version is broken and cannot start, the phone goes back to the previous version by itself within 10 seconds.

## How you publish an update
Change `index.html`, then in PowerShell:

```
cd "C:\\path\\to\\workspace\Intranet SHGH\UK App"
.\publish_update.ps1 -Notes "What changed, in a few words"
```

It stamps a version number, builds, packages, deploys, and checks the phones can see it. Takes about a minute. The web version at shgh-lms1.web.app updates at the same time.

## The one exception: native changes
A few kinds of change cannot travel this way: a new Capacitor plugin, Android permissions, the app icon or name, `build.gradle`. For those:

```
.\publish_update.ps1 -Notes "..." -BuildApk
```

Before running it, raise `versionCode` and `versionName` in `android\app\build.gradle`. Phones then show **"A new version of the app needs installing"** with a **Download** button. Android always makes a person tap **Install** for a new app file; no app can do that silently unless the phones are managed by an MDM system.

## One-time step: getting phones onto this system
Phones on the old APK (version 1.3 or earlier) do not have the updater in them. They need **one last manual install** of the 1.4 APK:
`https://shgh-lms1.web.app/app-updates/uk/uk-app.apk`
After that, every update arrives on its own.

## Where things are
| What | Where |
|---|---|
| Version the phones compare against | `app-updates/uk/latest.json` (written by the script) |
| Update packages | `app-updates/uk/bundle-*.zip` (the 3 newest are kept) |
| APK for native updates | `app-updates/uk/uk-app.apk` |
| Minimum native version, APK link | `app-updates/uk/config.json` |
| The app code that checks | `index.html`, search for `IN-APP UPDATES` |
| Plugin | `@capgo/capacitor-updater` 7.51.23 (open source, MPL-2.0). Self-hosted: no Capgo account, and its reporting to Capgo's servers is switched off in `capacitor.config.ts` |
| Android build output | `%LOCALAPPDATA%\SHGH-builds\uk-app\` (kept out of OneDrive on purpose; OneDrive locking it broke builds) |

## Since 2 October 2026
- `-Apk` now only **offers** the new app file (`recommendedNativeVersion`): phones that have not installed it keep getting normal updates, and are reminded at most every 3 days. Use `-RequireApk` only when a web update cannot work without the new app file (`minNativeVersion`).
- App file 1.6 (versionCode 7) runs on Capacitor 8, adds the phone's Back button (@capacitor/app) and keeps the app's data out of Google cloud backup and phone-to-phone transfer.
- The updater refuses a manifest without a checksum, a bundle that is not on shgh-lms1.web.app, or an APK link elsewhere.
