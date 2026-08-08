"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const HERO_PHOTOS = [
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1561037404-61cd46aa615b?q=80&w=1200&auto=format&fit=crop",
];

export const SUGGESTED_PROMPTS = [
  "What is Waggle?",
  "Which device works best in Europe?",
  "Can dogs eat blueberries?",
  "My dog is vomiting, what should I do?",
  "How do I cancel my subscription?",
  "What's your warranty & return policy?",
];

export default function Hero({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % HERO_PHOTOS.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-10 sm:py-16">
      <div className="relative mb-7 h-40 w-40 overflow-hidden rounded-full border-4 border-surface shadow-soft sm:h-48 sm:w-48">
        <AnimatePresence mode="sync">
          <motion.img
            key={HERO_PHOTOS[index]}
            src={HERO_PHOTOS[index]}
            alt="A happy dog"
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl text-balance text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl"
      >
        Everything your dog needs, in one place
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mt-3 max-w-xl text-balance text-center text-base text-muted sm:text-lg"
      >
        Ask about your Waggle devices, subscriptions, and support — or get general pet-care advice, all in one warm, friendly chat.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mt-8 flex w-full max-w-2xl flex-wrap items-center justify-center gap-2"
      >
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPrompt(p)}
            className="rounded-full border border-border bg-surface/80 px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            {p}
          </button>
        ))}
      </motion.div>
    </div>
  );
}
