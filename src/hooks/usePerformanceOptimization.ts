import { useCallback, useRef, useEffect, useState } from 'react';

// 防抖Hook
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;
  
  return debouncedCallback;
}

// 节流Hook
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());
  
  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    },
    [callback, delay]
  ) as T;
  
  return throttledCallback;
}

// 虚拟滚动Hook
export function useVirtualScroll(
  items: any[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length - 1
  );
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return {
    visibleItems,
    offsetY,
    startIndex,
    endIndex,
    handleScroll
  };
}

// 懒加载Hook
export function useLazyLoad(threshold = 0.1) {
  const [ref, setRef] = useState<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (!ref) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold }
    );
    
    observer.observe(ref);
    
    return () => {
      observer.unobserve(ref);
    };
  }, [ref, threshold]);
  
  return { setRef, isVisible };
}

// 内存使用监控Hook
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<any>(null);
  
  useEffect(() => {
    if ('memory' in performance) {
      const updateMemoryInfo = () => {
        setMemoryInfo({
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        });
      };
      
      updateMemoryInfo();
      const interval = setInterval(updateMemoryInfo, 5000);
      
      return () => clearInterval(interval);
    }
  }, []);
  
  return memoryInfo;
}

// 渲染性能监控Hook
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `${componentName} render #${renderCount.current}, ` +
        `time since last render: ${timeSinceLastRender}ms`
      );
    }
    
    lastRenderTime.current = now;
  });
  
  return renderCount.current;
}

// 缓存Hook
export function useCache<T>(key: string, fetcher: () => Promise<T>, ttl = 5 * 60 * 1000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cacheRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());
  
  const fetchData = useCallback(async () => {
    const cached = cacheRef.current.get(key);
    const now = Date.now();
    
    if (cached && now - cached.timestamp < ttl) {
      setData(cached.data);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetcher();
      cacheRef.current.set(key, { data: result, timestamp: now });
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const invalidate = useCallback(() => {
    cacheRef.current.delete(key);
  }, [key]);
  
  return { data, loading, error, refetch: fetchData, invalidate };
}

// 批处理状态更新Hook
export function useBatchUpdate<T>(initialState: T, batchDelay = 16) {
  const [state, setState] = useState(initialState);
  const pendingUpdates = useRef<Array<(prev: T) => T>>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const batchedSetState = useCallback((updater: (prev: T) => T) => {
    pendingUpdates.current.push(updater);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setState(prevState => {
        let newState = prevState;
        pendingUpdates.current.forEach(update => {
          newState = update(newState);
        });
        pendingUpdates.current = [];
        return newState;
      });
    }, batchDelay);
  }, [batchDelay]);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return [state, batchedSetState] as const;
}