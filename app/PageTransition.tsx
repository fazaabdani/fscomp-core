"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (window.location.hash) return;
    const frame = window.requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .pageTransition {
              animation: pageEnter 180ms ease-out both;
            }

            @keyframes pageEnter {
              from {
                opacity: 0;
              }

              to {
                opacity: 1;
              }
            }

            @media (prefers-reduced-motion: reduce) {
              .pageTransition {
                animation: none;
              }
            }
          `
        }}
      />
      <div className="pageTransition" key={pathname}>
        {children}
      </div>
    </>
  );
}
