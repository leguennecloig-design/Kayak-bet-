"use client";

import { ToastProvider } from "./components/Toast";
import { useReveal } from "./components/useReveal";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Stats from "./components/Stats";
import Features from "./components/Features";
import Steps from "./components/Steps";
import FeaturedEvent from "./components/FeaturedEvent";
import CtaBand from "./components/CtaBand";
import Footer from "./components/Footer";

export default function Home() {
  useReveal();

  return (
    <ToastProvider>
      <Header />
      <main id="top">
        <Hero />
        <Stats />
        <Features />
        <Steps />
        <FeaturedEvent />
        <CtaBand />
      </main>
      <Footer />
    </ToastProvider>
  );
}
