"use client";

import { useEffect, useMemo, useState } from "react";

type DragState = {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  pointerId: number;
};

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "button, input, textarea, select, option, a, [role='button'], [data-no-drag='true']"
    )
  );
}

export function useDraggableDialog(open: boolean) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<DragState | null>(null);

  useEffect(() => {
    if (!open) {
      setOffset({ x: 0, y: 0 });
      setDragState(null);
    }
  }, [open]);

  const handleProps = {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      if (isInteractiveTarget(event.target)) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragState({
        startX: event.clientX,
        startY: event.clientY,
        originX: offset.x,
        originY: offset.y,
        pointerId: event.pointerId,
      });
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      setOffset({
        x: dragState.originX + (event.clientX - dragState.startX),
        y: dragState.originY + (event.clientY - dragState.startY),
      });
    },
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      event.currentTarget.releasePointerCapture(event.pointerId);
      setDragState(null);
    },
    onPointerCancel: (event: React.PointerEvent<HTMLElement>) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      event.currentTarget.releasePointerCapture(event.pointerId);
      setDragState(null);
    },
  };

  const style = useMemo(
    () => ({
      transform: `translate(${offset.x}px, ${offset.y}px)`,
    }),
    [offset.x, offset.y]
  );

  return {
    style,
    handleProps,
    dragging: Boolean(dragState),
  };
}

