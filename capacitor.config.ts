import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shgh.shghsessions',
  appName: 'SHGH Sessions',
  webDir: 'dist',
  plugins: {
    // In-app updates (added 2026-09-24).
    // The app checks OUR manifest on Firebase Hosting (app-updates/uk/latest.json),
    // downloads the new web bundle, and installs it the next time the app opens.
    // Everything stays on Sovereign House GH's own Firebase: no Capgo account,
    // no Capgo servers. See publish_update.ps1 and UPDATES.md.
    CapacitorUpdater: {
      autoUpdate: false,       // we decide when, from our own manifest
      statsUrl: '',            // never report anything to Capgo
      updateUrl: '',
      channelUrl: '',
      appReadyTimeout: 10000,  // a bundle that fails to start within 10s is rolled back
      autoDeleteFailed: true,
      autoDeletePrevious: true,
      resetWhenUpdate: true,   // installing a new APK wipes old downloaded bundles
    },
  },
};

export default config;
