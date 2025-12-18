"use client";

import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import { ThemeProvider } from "@/context/ThemeContext";
import Image from "next/image";
import React, { useEffect, useState } from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [panelStage, setPanelStage] = useState<"solid" | "gradient">("solid");

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY * 0.15;
      setScrollOffset(Math.min(offset, 120));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setPanelStage("gradient"), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <ThemeProvider>
        <div className="relative flex lg:flex-row w-full min-h-screen justify-center flex-col dark:bg-gray-900 sm:p-0">
          <div
            className="flex-1 w-full transition-transform duration-500 py-12 lg:py-16"
            style={{ transform: `translateY(${scrollOffset}px)` }}
          >
            <div className="flex h-full w-full items-center justify-center px-6 sm:px-10">
              <div className="w-full max-w-[520px]">{children}</div>
            </div>
          </div>
          <div
            className={`hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden border-l border-white/10 transition-all duration-700 backdrop-blur-2xl ${
              panelStage === "solid"
                ? "bg-emerald-600"
                : "bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950"
            } min-h-[115vh] pt-20 pb-24`}
            style={{ transform: `translateY(${scrollOffset}px)` }}
          >
            {panelStage === "gradient" && (
              <>
                <div className="absolute inset-0 pointer-events-none opacity-70 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.35),_transparent_65%)] animate-pulse" />
                <div className="absolute -top-16 left-1/3 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl animate-[pulse_7s_ease-in-out_infinite]" />
                <div className="absolute -bottom-10 right-3 h-[22rem] w-[22rem] rounded-full bg-emerald-700/30 blur-[130px] animate-[pulse_6s_linear_infinite]" />
              </>
            )}
            <div className="relative flex flex-col items-center justify-center">
              <Image
                src="/images/logo/ev-logo.svg"
                alt="Electric Charge"
                width={360}
                height={360}
                className="drop-shadow-[0_40px_120px_rgba(0,0,0,0.45)] dark:hidden"
                priority
              />
              <Image
                src="/images/logo/logo_dark.svg"
                alt="Electric Charge"
                width={360}
                height={360}
                className="hidden drop-shadow-[0_40px_120px_rgba(0,0,0,0.45)] dark:block"
                priority
              />
            </div>
          </div>
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
