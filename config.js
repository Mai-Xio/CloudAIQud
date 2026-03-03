/* Runtime configuration for Firebase Hosting (static).
 *
 * This file defines default backend settings. The app allows users to override the backend URL
 * at runtime (saved in localStorage) without redeploying.
 *
 * Important: Do not hardcode a local URL here for production. If you want local testing,
 * use the in-app API Settings and save a temporary override in your browser.
 */
(function () {
  const DEFAULT_CONFIG = {
    backendBaseUrl: null, // set to your deployed backend base URL if you want zero-click startup
    endpoints: {
      readings: "/api/v1/readings",
      latest: "/api/v1/readings/latest"
    },
    ingestApiKey: "" // optional
  };

  window.__IOT_APP_CONFIG__ = DEFAULT_CONFIG;
})();
