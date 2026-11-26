"use client";

import { useEffect, useRef } from "react";
import { pickNextFocus, type Direction } from "@/lib/spatial-nav";

const DIRECTION_BY_KEY: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

const isInput = (element: Element | null) =>
  element instanceof HTMLInputElement ||
  element instanceof HTMLTextAreaElement ||
  element?.getAttribute("contenteditable") === "true";

export function useSpatialNav({
  onBack,
  onOpenSidebar,
  onCloseSidebar,
}: {
  onBack: () => boolean;
  onOpenSidebar: () => boolean;
  onCloseSidebar: () => boolean;
}) {
  const onBackRef = useRef(onBack);
  const onOpenSidebarRef = useRef(onOpenSidebar);
  const onCloseSidebarRef = useRef(onCloseSidebar);
  onBackRef.current = onBack;
  onOpenSidebarRef.current = onOpenSidebar;
  onCloseSidebarRef.current = onCloseSidebar;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" || event.key === "GoBack") {
        if (onBackRef.current()) event.preventDefault();
        return;
      }

      const active = document.activeElement;
      if (isInput(active)) return;

      const scope =
        document.querySelector<HTMLElement>("[data-focus-scope]") ??
        document.querySelector<HTMLElement>("[data-tv-root]");
      if (!scope) return;

      if (event.key === "ArrowRight" && scope.hasAttribute("data-sidebar")) {
        if (onCloseSidebarRef.current()) event.preventDefault();
        return;
      }

      if (event.key === "Enter") {
        if (active instanceof HTMLElement && active.matches("[data-focusable]") && scope.contains(active)) {
          event.preventDefault();
          active.click();
        }
        return;
      }

      const direction = DIRECTION_BY_KEY[event.key];
      if (!direction) return;

      const focusables = Array.from(scope.querySelectorAll<HTMLElement>("[data-focusable]")).filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

      if (focusables.length === 0) return;
      event.preventDefault();

      const current = active instanceof HTMLElement && focusables.includes(active) ? active : null;
      if (!current) {
        focusables[0].focus();
        return;
      }

      if (
        direction === "left" &&
        current.dataset.gridFirstColumn === "true" &&
        onOpenSidebarRef.current()
      ) {
        event.preventDefault();
        return;
      }

      const candidates = focusables.map((element, index) => ({
        id: String(index),
        rect: element.getBoundingClientRect(),
      }));
      const nextId = pickNextFocus(current.getBoundingClientRect(), candidates, direction);
      if (nextId === null) return;

      const next = focusables[Number(nextId)];
      next.focus();
      next.scrollIntoView({ block: "nearest", inline: "nearest" });
    }

    window.addEventListener("keydown", handleKeyDown);
    document.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
