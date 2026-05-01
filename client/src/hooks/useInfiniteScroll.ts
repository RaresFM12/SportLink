import { useCallback, useEffect, useRef, useState } from "react";

type UseInfiniteScrollOptions = {
  /** Called when the sentinel enters the viewport and more pages are available */
  onLoadMore: () => void;
  /** Whether a fetch is already in flight */
  loading: boolean;
  /** Whether there are more pages to load */
  hasMore: boolean;
  /** Root margin for the observer (default "200px") */
  rootMargin?: string;
};

type UseInfiniteScrollReturn = {
  /** Attach this ref to the sentinel element at the bottom of the list */
  sentinelRef: React.RefCallback<Element>;
};

export function useInfiniteScroll({
  onLoadMore,
  loading,
  hasMore,
  rootMargin = "200px",
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [sentinel, setSentinel] = useState<Element | null>(null);

  // Stable callback reference so the effect doesn't thrash
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  });

  useEffect(() => {
    if (!sentinel) return;

    observerRef.current?.disconnect();

    if (!hasMore || loading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          onLoadMoreRef.current();
        }
      },
      { rootMargin }
    );

    observerRef.current.observe(sentinel);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [sentinel, hasMore, loading, rootMargin]);

  const sentinelRef: React.RefCallback<Element> = useCallback((node) => {
    setSentinel(node);
  }, []);

  return { sentinelRef };
}
