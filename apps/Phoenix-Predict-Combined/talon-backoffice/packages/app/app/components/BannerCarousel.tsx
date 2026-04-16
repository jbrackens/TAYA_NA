"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { getBanners, type Banner } from "../lib/api/content-client";

interface BannerCarouselProps {
  position?: string;
  autoRotateMs?: number;
}

/**
 * Displays active banners from the CMS in a rotating carousel.
 * Falls back to empty state if no banners are available.
 */
export const BannerCarousel: React.FC<BannerCarouselProps> = ({
  position = "hero",
  autoRotateMs = 5000,
}) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBanners(position)
      .then((data) => {
        if (!cancelled) {
          setBanners(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [position]);

  const nextSlide = useCallback(() => {
    if (banners.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  // Auto-rotate
  useEffect(() => {
    if (banners.length <= 1 || autoRotateMs <= 0) return;
    timerRef.current = setInterval(nextSlide, autoRotateMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [banners.length, autoRotateMs, nextSlide]);

  if (loading) {
    return (
      <div className="w-full h-48 bg-[#0f1225] rounded-xl animate-pulse" />
    );
  }

  if (banners.length === 0) return null;

  const banner = banners[currentIndex];

  return (
    <div className="relative w-full overflow-hidden rounded-xl">
      {/* Banner image */}
      <a
        href={banner.linkUrl || "#"}
        className="block relative w-full h-48 md:h-64"
      >
        <img
          src={banner.imageUrl}
          alt={banner.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4">
          <h3 className="text-white text-lg font-bold">{banner.title}</h3>
        </div>
      </a>

      {/* Dot indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-2 right-4 flex gap-1.5">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex ? "bg-[#39ff14]" : "bg-white/30"
              }`}
              aria-label={`Go to banner ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
