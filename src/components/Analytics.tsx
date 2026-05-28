"use client";

import Script from "next/script";

/**
 * Analytics tracking — privacy-first.
 *
 * Hỗ trợ 2 providers (cấu hình qua env):
 *   - Plausible (recommended, GDPR-compliant, no cookie)
 *     ENV: NEXT_PUBLIC_PLAUSIBLE_DOMAIN=vaffiliate.vn
 *   - PostHog (full event tracking)
 *     ENV: NEXT_PUBLIC_POSTHOG_KEY + NEXT_PUBLIC_POSTHOG_HOST
 *
 * Nếu không có env nào → component trả null, không tracking.
 *
 * Custom events: dùng helper `trackEvent()` ở client-side để track funnel.
 */
export function Analytics() {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

  if (!plausibleDomain && !posthogKey) return null;

  return (
    <>
      {plausibleDomain && (
        <Script
          src="https://plausible.io/js/script.tagged-events.outbound-links.js"
          data-domain={plausibleDomain}
          strategy="afterInteractive"
          defer
        />
      )}
      {posthogKey && (
        <Script id="posthog-init" strategy="afterInteractive">
          {`
            !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
            posthog.init('${posthogKey}', { api_host: '${posthogHost}', person_profiles: 'identified_only', capture_pageview: true });
          `}
        </Script>
      )}
    </>
  );
}

/**
 * Track custom event — gọi từ client component.
 *
 * Usage:
 *   trackEvent("register_complete", { tier: "bronze" });
 *   trackEvent("first_link_created");
 *   trackEvent("first_order_completed", { cashback: 50000 });
 *   trackEvent("first_withdrawal", { amount: 100000 });
 */
export function trackEvent(eventName: string, props?: Record<string, string | number | boolean>): void {
  if (typeof window === "undefined") return;

  // Plausible — uses global function
  const plausible = (window as unknown as { plausible?: (event: string, opts?: { props: Record<string, unknown> }) => void }).plausible;
  if (typeof plausible === "function") {
    try {
      plausible(eventName, props ? { props } : undefined);
    } catch { /* silent */ }
  }

  // PostHog
  const posthog = (window as unknown as { posthog?: { capture?: (event: string, props?: Record<string, unknown>) => void } }).posthog;
  if (posthog?.capture) {
    try {
      posthog.capture(eventName, props);
    } catch { /* silent */ }
  }
}

/**
 * Identify user — gọi sau khi user login để track theo user_id.
 * Privacy: KHÔNG gửi email, password, PII. Chỉ user_id + tier.
 */
export function identifyUser(userId: number | string, traits?: { tier?: string; created_at?: string }): void {
  if (typeof window === "undefined") return;

  const posthog = (window as unknown as { posthog?: { identify?: (id: string, props?: Record<string, unknown>) => void } }).posthog;
  if (posthog?.identify) {
    try {
      posthog.identify(String(userId), traits);
    } catch { /* silent */ }
  }

  // Plausible không hỗ trợ identify (privacy-first design).
}
