"use client";

import Script from "next/script";

export const GTM_ID = "GTM-TC7KKF57";

type ConsentState = "granted" | "denied";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/** Google Consent Mode v2: tags in the container only get analytics and ad
 * storage after the cookie banner's "Aceitar". Called from the banner and
 * mirrored by the boot script below for returning visitors. */
export function updateGtmConsent(state: ConsentState): void {
  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push([
      "consent",
      "update",
      {
        ad_storage: state,
        ad_user_data: state,
        ad_personalization: state,
        analytics_storage: state,
      },
    ]);
  } catch {
    // Analytics must never break the UI.
  }
}

// gtag's consent calls must be pushed as `arguments` objects, which is what
// the inline `gtag()` shim below produces; the update helper above pushes an
// array, which GTM reads the same way.
const boot = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
var stbrConsent = 'denied';
try { if (localStorage.getItem('stbr-consent') === 'all') stbrConsent = 'granted'; } catch (e) {}
gtag('consent', 'default', {
  ad_storage: stbrConsent,
  ad_user_data: stbrConsent,
  ad_personalization: stbrConsent,
  analytics_storage: stbrConsent,
  wait_for_update: 500
});
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');
`;

export function GoogleTagManager() {
  return <Script id="gtm-boot" strategy="afterInteractive">{boot}</Script>;
}

export function GoogleTagManagerNoScript() {
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
