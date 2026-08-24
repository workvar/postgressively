"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

export default function Parallax({
  children,
  className = "",
  strength = 40,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const viewCenter = window.innerHeight / 2;
      const delta = (center - viewCenter) / window.innerHeight;
      setOffset(delta * strength);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [strength]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ transform: `translate3d(0, ${offset}px, 0)` }}
    >
      {children}
    </div>
  );
}

export function TiltCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("perspective(1200px) rotateX(0deg) rotateY(0deg)");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setTransform(
        `perspective(1200px) rotateX(${y * -4}deg) rotateY(${x * 6}deg) scale3d(1.01, 1.01, 1.01)`,
      );
    };

    const onLeave = () => {
      setTransform("perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-transform duration-300 ease-out will-change-transform ${className}`}
      style={{ transform }}
    >
      {children}
    </div>
  );
}
