'use client';

/**
 * FutureHeroSlideshow.tsx
 *
 * Crossfading photo background for the dashboard hero section.
 * Identical pattern to CBG's HeroSlideshow:
 *  - Images crossfade with CSS opacity transitions
 *  - Ken Burns subtle scale while active (1.0 → 1.05)
 *  - Bottom-to-top gradient scrim keeps greeting text readable
 *  - Pure CSS — no Framer Motion
 *
 * Strict Mode safe: interval stored in a ref so the dev-mode double-effect
 * invocation doesn't silently clear it before the first tick fires.
 */

import { useState, useEffect, useRef } from 'react';

const IMAGES = [
  '/backgrounds/bg-italy.jpg',
  '/backgrounds/bg-lake.jpg',
  '/backgrounds/bg-lantern.jpg',
  '/backgrounds/bg-leather.jpg',
  '/backgrounds/bg-letter.jpg',
];

/** ms each photo stays fully visible before the crossfade begins */
const HOLD_MS = 5000;
/** Crossfade duration — must match the CSS transition below */
const FADE_MS = 1500;

interface FutureHeroSlideshowProps {
  /** Starting image index — lets different pages open on different scenes */
  initialIndex?: number;
}

export function FutureHeroSlideshow({ initialIndex = 0 }: FutureHeroSlideshowProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex % IMAGES.length);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear any existing timer before starting (handles Strict Mode double-invoke)
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % IMAGES.length);
    }, HOLD_MS + FADE_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {/* Crossfading images */}
      {IMAGES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: i === activeIndex ? 1 : 0,
            transform: i === activeIndex ? 'scale(1.05)' : 'scale(1)',
            transition: `opacity ${FADE_MS}ms ease-in-out, transform ${FADE_MS}ms ease-in-out`,
            willChange: 'opacity, transform',
          }}
        />
      ))}

      {/* Bottom-to-top gradient scrim — keeps greeting text readable over any photo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.28) 45%, rgba(0,0,0,0.05) 80%, transparent 100%)',
        }}
      />
    </>
  );
}
