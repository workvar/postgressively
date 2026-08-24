import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import Script from "next/script";

function cleanId(value: string | undefined): string | undefined {
  const id = value?.trim();
  if (!id) return undefined;
  // Tracking IDs are alphanumeric (plus hyphens for GA). Reject anything else.
  if (!/^[A-Za-z0-9-]+$/.test(id)) return undefined;
  return id;
}

const gaId = cleanId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
const clarityId = cleanId(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID);

/**
 * Loads Vercel Analytics always, plus GA4 / Clarity when their public IDs are set.
 */
export default function Analytics() {
  return (
    <>
      <VercelAnalytics />
      {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      {clarityId ? (
        <Script
          id="microsoft-clarity"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityId}");`,
          }}
        />
      ) : null}
    </>
  );
}
