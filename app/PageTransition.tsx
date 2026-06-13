"use client";

import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
                transform: translateY(8px);
              }

              to {
                opacity: 1;
                transform: translateY(0);
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
