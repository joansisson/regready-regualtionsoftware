interface MetricData {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: number;
}

interface LogData {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  userId?: number;
  requestId?: string;
  timestamp?: number;
}

class MonitoringService {
  private metrics: MetricData[] = [];
  private logs: LogData[] = [];

  // Performance monitoring
  trackAPIPerformance(endpoint: string, responseTime: number, statusCode: number, userId?: number) {
    this.metrics.push({
      name: 'api_response_time',
      value: responseTime,
      tags: {
        endpoint,
        status_code: statusCode.toString(),
        user_id: userId?.toString() || 'anonymous'
      },
      timestamp: Date.now()
    });

    // Log slow requests
    if (responseTime > 1000) {
      this.log('warn', `Slow API response: ${endpoint}`, {
        responseTime,
        statusCode,
        userId
      });
    }
  }

  // Business metrics
  trackUserAction(action: string, userId: number, metadata?: any) {
    this.metrics.push({
      name: 'user_action',
      value: 1,
      tags: {
        action,
        user_id: userId.toString(),
        subscription_tier: metadata?.subscriptionTier || 'unknown'
      },
      timestamp: Date.now()
    });

    this.log('info', `User action: ${action}`, {
      userId,
      action,
      metadata
    });
  }

  // AI usage tracking
  trackAIUsage(feature: string, userId: number, tokens: number, cost: number) {
    this.metrics.push({
      name: 'ai_usage',
      value: tokens,
      tags: {
        feature,
        user_id: userId.toString()
      },
      timestamp: Date.now()
    });

    this.metrics.push({
      name: 'ai_cost',
      value: cost,
      tags: {
        feature,
        user_id: userId.toString()
      },
      timestamp: Date.now()
    });
  }

  // Compliance tracking
  trackComplianceActivity(framework: string, activity: string, userId: number) {
    this.metrics.push({
      name: 'compliance_activity',
      value: 1,
      tags: {
        framework,
        activity,
        user_id: userId.toString()
      },
      timestamp: Date.now()
    });
  }

  // Error tracking
  trackError(error: Error, context?: any) {
    this.log('error', error.message, {
      stack: error.stack,
      context,
      timestamp: Date.now()
    });

    this.metrics.push({
      name: 'error_count',
      value: 1,
      tags: {
        error_type: error.name,
        endpoint: context?.endpoint || 'unknown'
      },
      timestamp: Date.now()
    });
  }

  // Generic logging
  log(level: LogData['level'], message: string, data?: any, userId?: number, requestId?: string) {
    const logEntry: LogData = {
      level,
      message,
      data,
      userId,
      requestId,
      timestamp: Date.now()
    };

    this.logs.push(logEntry);

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, data || '');
    }

    // In production, you would send to external logging service
    // like Datadog, Sentry, CloudWatch, etc.
  }

  // Health checks
  getHealthMetrics() {
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);

    const recentMetrics = this.metrics.filter(m => m.timestamp && m.timestamp > fiveMinutesAgo);
    const recentErrors = this.logs.filter(l => l.level === 'error' && l.timestamp && l.timestamp > fiveMinutesAgo);

    const avgResponseTime = recentMetrics
      .filter(m => m.name === 'api_response_time')
      .reduce((sum, m, _, arr) => sum + m.value / arr.length, 0);

    return {
      status: recentErrors.length > 10 ? 'unhealthy' : 'healthy',
      metrics: {
        averageResponseTime: Math.round(avgResponseTime),
        errorRate: recentErrors.length,
        requestCount: recentMetrics.filter(m => m.name === 'api_response_time').length,
        activeUsers: new Set(recentMetrics.map(m => m.tags?.user_id)).size
      },
      timestamp: now
    };
  }

  // Analytics dashboard data
  getAnalytics(timeRange: '1h' | '24h' | '7d' = '24h') {
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };

    const cutoff = Date.now() - timeRangeMs[timeRange];
    const relevantMetrics = this.metrics.filter(m => m.timestamp && m.timestamp > cutoff);

    return {
      timeRange,
      userActions: this.aggregateMetrics(relevantMetrics, 'user_action'),
      apiPerformance: this.aggregateMetrics(relevantMetrics, 'api_response_time'),
      aiUsage: this.aggregateMetrics(relevantMetrics, 'ai_usage'),
      complianceActivities: this.aggregateMetrics(relevantMetrics, 'compliance_activity'),
      errors: this.logs.filter(l => l.level === 'error' && l.timestamp && l.timestamp > cutoff)
    };
  }

  private aggregateMetrics(metrics: MetricData[], name: string) {
    const filtered = metrics.filter(m => m.name === name);
    
    return {
      total: filtered.reduce((sum, m) => sum + m.value, 0),
      count: filtered.length,
      average: filtered.length > 0 ? filtered.reduce((sum, m) => sum + m.value, 0) / filtered.length : 0,
      byTag: this.groupByTag(filtered)
    };
  }

  private groupByTag(metrics: MetricData[]) {
    const grouped: Record<string, any> = {};
    
    metrics.forEach(metric => {
      if (metric.tags) {
        Object.entries(metric.tags).forEach(([key, value]) => {
          if (!grouped[key]) grouped[key] = {};
          if (!grouped[key][value]) grouped[key][value] = 0;
          grouped[key][value] += metric.value;
        });
      }
    });

    return grouped;
  }
}

export const monitoring = new MonitoringService();
export default monitoring;