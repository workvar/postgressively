"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";

export type RevealDirection = "up" | "down" | "left" | "right" | "scale" | "blur" | "none";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: RevealDirection;
  once?: boolean;
  threshold?: number;
  style?: CSSProperties;
};

export default function Reveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  once = true,
  threshold = 0.12,
  style,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, threshold]);

  return (
    <div
      ref={ref}
      data-visible={visible}
      className={`reveal reveal-${direction} ${visible ? "is-visible" : ""} ${className}`}
      style={{ ...style, transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

type StaggerProps = {
  children: ReactNode[];
  className?: string;
  itemClassName?: string;
  stagger?: number;
  direction?: RevealDirection;
  threshold?: number;
};

export function Stagger({
  children,
  className = "",
  itemClassName = "",
  stagger = 90,
  direction = "up",
  threshold = 0.1,
}: StaggerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: "0px 0px -4% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div ref={ref} className={className}>
      {children.map((child, i) => (
        <div
          key={i}
          className={`reveal reveal-${direction} ${visible ? "is-visible" : ""} ${itemClassName}`}
          style={{ transitionDelay: `${i * stagger}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
