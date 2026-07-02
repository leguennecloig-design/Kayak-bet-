"use client";

import Script from "next/script";

export default function TawkWidget() {
  return (
    <Script
      id="tawk-to"
      strategy="lazyOnload"
      src="https://embed.tawk.to/6a467a6c4b956a1d4cbbc007/default"
      crossOrigin="*"
    />
  );
}
