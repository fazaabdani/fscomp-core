import Script from "next/script";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/session-token";
import { TrackingEvents } from "./TrackingEvents";

// ID yang sama dengan landing fscomp.id supaya perjalanan landing -> katalog -> chat WA ada di satu properti GA4.
const GA_MEASUREMENT_ID = "G-NME96NZF9K";
const META_PIXEL_ID = "1026284083787634";

// Hanya dipasang di halaman publik (katalog & detail unit), dan dilewati untuk staf yang sedang login
// supaya kunjungan internal tidak mengotori data pelanggan dan URL halaman internal tidak terkirim ke Google/Meta.
export function PublicTracking() {
  if (cookies().get(SESSION_COOKIE_NAME)?.value) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');`}
      </Script>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');`}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      <TrackingEvents />
    </>
  );
}
