"use client";

import { useEffect, type RefObject } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

type FocusTrapOptions = {
  active: boolean;
  onEscape?: () => void;
};

export function useFocusTrap<TElement extends HTMLElement>(
  containerRef: RefObject<TElement | null>,
  options: FocusTrapOptions,
) {
  const { active, onEscape } = options;

  useEffect(() => {
    if (!active) {
      return;
    }

    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const focusFirstElement = () => {
      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => !element.hasAttribute("disabled"));

      (focusableElements[0] ?? container).focus();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onEscape?.();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusableElements.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.setTimeout(focusFirstElement, 0);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousActiveElement?.focus();
    };
  }, [active, containerRef, onEscape]);
}
