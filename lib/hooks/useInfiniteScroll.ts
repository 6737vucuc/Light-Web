import { useEffect, useRef, useState, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number;
  onLoadMore: () => Promise<void>;
  isLoading?: boolean;
  hasMore?: boolean;
}

export function useInfiniteScroll({
  threshold = 0.1,
  onLoadMore,
  isLoading = false,
  hasMore = true,
}: UseInfiniteScrollOptions) {
  const observerTarget = useRef<HTMLDivElement>(null);
  const [isObserving, setIsObserving] = useState(true);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isLoading && hasMore && isObserving) {
        onLoadMore();
      }
    },
    [onLoadMore, isLoading, hasMore, isObserving]
  );

  useEffect(() => {
    if (!observerTarget.current) return;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin: '100px',
    });

    observer.observe(observerTarget.current);

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
      observer.disconnect();
    };
  }, [handleIntersection, threshold]);

  return {
    observerTarget,
    setIsObserving,
  };
}
