
import { useState, useEffect, useCallback } from 'react';
import { Activity, Zap, Database, Cpu } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Button from '../ui/Button';
import { useMemoryMonitor, useRenderPerformance } from '@/hooks/usePerformanceOptimization';

interface PerformanceMetrics {
  renderTime: number;
  componentCount: number;
  memoryUsage: number;
  cacheHitRate: number;
}

export function PerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    componentCount: 0,
    memoryUsage: 0,
    cacheHitRate: 0
  });
  const [isCollecting, setIsCollecting] = useState(false);
  
  const memoryInfo = useMemoryMonitor();
  useRenderPerformance('PerformanceMonitor');
  
  // Collect performance metrics
  const collectMetrics = useCallback(() => {
    const startTime = performance.now();
    
    // Simulate component count
    const componentCount = document.querySelectorAll('[data-component]').length;
    
    // Calculate render time
    const renderTime = performance.now() - startTime;
    
    // Memory usage
    const memoryUsage = memoryInfo ? 
      (memoryInfo.used / memoryInfo.total) * 100 : 0;
    
    // Simulate cache hit rate
    const cacheHitRate = Math.random() * 100;
    
    setMetrics({
      renderTime,
      componentCount,
      memoryUsage,
      cacheHitRate
    });
  }, [memoryInfo]);
  
  // Auto collect metrics
  useEffect(() => {
    if (!isCollecting) return;
    
    const interval = setInterval(collectMetrics, 2000);
    return () => clearInterval(interval);
  }, [isCollecting, collectMetrics]);
  
  // Get performance level
  const getPerformanceLevel = useCallback(() => {
    const score = (
      (100 - metrics.renderTime) * 0.3 +
      metrics.cacheHitRate * 0.4 +
      (100 - metrics.memoryUsage) * 0.3
    );
    
    if (score >= 80) return { level: 'Excellent', color: 'text-green-600' };
    if (score >= 60) return { level: 'Good', color: 'text-yellow-600' };
    if (score >= 40) return { level: 'Average', color: 'text-orange-600' };
    return { level: 'Needs Optimization', color: 'text-red-600' };
  }, [metrics]);
  
  const performanceLevel = getPerformanceLevel();
  
  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="bg-background/80 backdrop-blur-sm"
        >
          <Activity className="h-4 w-4 mr-2" />
          Performance Monitor
        </Button>
      </div>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="bg-background/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Monitor
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCollecting(!isCollecting)}
              >
                {isCollecting ? 'Stop' : 'Start'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Performance Level */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Performance</span>
            <Badge className={performanceLevel.color}>
              {performanceLevel.level}
            </Badge>
          </div>
          
          {/* Render Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Render Time
              </span>
              <span className="text-sm font-medium">
                {metrics.renderTime.toFixed(2)}ms
              </span>
            </div>
            <Progress 
              value={Math.min((metrics.renderTime / 16) * 100, 100)} 
              className="h-2"
            />
          </div>
          
          {/* Component Count */}
          <div className="flex items-center justify-between">
            <span className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Component Count
            </span>
            <span className="text-sm font-medium">
              {metrics.componentCount}
            </span>
          </div>
          
          {/* Memory Usage */}
          {memoryInfo && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  Memory Usage
                </span>
                <span className="text-sm font-medium">
                  {metrics.memoryUsage.toFixed(1)}%
                </span>
              </div>
              <Progress value={metrics.memoryUsage} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {(memoryInfo.used / 1024 / 1024).toFixed(1)}MB / 
                {(memoryInfo.total / 1024 / 1024).toFixed(1)}MB
              </div>
            </div>
          )}
          
          {/* Cache Hit Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Cache Hit Rate</span>
              <span className="text-sm font-medium">
                {metrics.cacheHitRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={metrics.cacheHitRate} className="h-2" />
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={collectMetrics}
              className="flex-1"
            >
              Refresh Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if ('memory' in performance && (performance as any).memory?.garbageCollect) {
                  (performance as any).memory.garbageCollect();
                }
              }}
              className="flex-1"
            >
              Garbage Collect
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMonitor;