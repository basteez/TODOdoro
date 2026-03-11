import { useState, useEffect, useRef } from 'react';

interface CanvasHintProps {
  isEmpty: boolean;
}

const DISPLAY_DURATION = 3000;
const TRANSITION_DURATION = 500;

export function CanvasHint({ isEmpty }: CanvasHintProps) {
  const [visible, setVisible] = useState(isEmpty);
  const [fading, setFading] = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const removeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (isEmpty) {
      setVisible(true);
      setFading(false);

      fadeTimerRef.current = setTimeout(() => {
        setFading(true);
      }, DISPLAY_DURATION);

      removeTimerRef.current = setTimeout(() => {
        setVisible(false);
      }, DISPLAY_DURATION + TRANSITION_DURATION);
    } else {
      setVisible(false);
      setFading(false);
    }

    return () => {
      clearTimeout(fadeTimerRef.current);
      clearTimeout(removeTimerRef.current);
    };
  }, [isEmpty]);

  if (!isEmpty || !visible) return null;

  return (
    <div
      data-testid="canvas-hint"
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <p
        className={[
          'italic text-base text-text-muted',
          'transition-opacity duration-500 ease-in',
          'motion-reduce:transition-none',
          fading ? 'opacity-0' : 'opacity-100',
        ].join(' ')}
      >
        Start with what calls to you
      </p>
    </div>
  );
}
