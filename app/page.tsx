"use client";

import { useEffect } from "react";
import { ToastProvider } from "./components/Toast";
import { useReveal } from "./components/useReveal";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Features from "./components/Features";
import Steps from "./components/Steps";
import FeaturedEvent from "./components/FeaturedEvent";
import CtaBand from "./components/CtaBand";
import Footer from "./components/Footer";

export default function Home() {
  useReveal();

  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.classList.add("js-anim");
    }

    // Style d'entrée toujours "dynamique" (spring) — plus de switcher visible.
    document.body.setAttribute("data-anim-style", "spring");

    const id = setTimeout(() => {
      document.body.classList.add("play");
      setTimeout(() => {
        const sentinel = document.querySelector<HTMLElement>(".hero-copy .lede");
        if (sentinel && getComputedStyle(sentinel).opacity !== "1") {
          document.body.classList.add("anim-done");
        }
      }, 2500);
    }, 30);

    const onVisible = () => {
      if (!document.hidden) {
        const sentinel = document.querySelector<HTMLElement>(".hero-copy .lede");
        if (sentinel && getComputedStyle(sentinel).opacity !== "1") {
          document.body.classList.add("anim-done");
        }
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(id);
      document.removeEventListener("visibilitychange", onVisible);
      document.documentElement.classList.remove("js-anim");
      document.body.classList.remove("play", "anim-done");
    };
  }, []);

  return (
    <ToastProvider>
      <Header />
      <main id="top">
        <Hero />
        <Features />
        <Steps />
        <FeaturedEvent />
        <CtaBand />
      </main>
      <Footer />
    </ToastProvider>
  );
}
