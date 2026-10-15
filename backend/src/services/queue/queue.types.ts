export interface NotificationJobData {
  deliveryId: string;
  channel: string;
  enqueuedAt: number;
}

export interface QueueMetrics {
  enabled: boolean;
  redisStatus: 'CONNECTED' | 'DISCONNECTED' | 'DISABLED';
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  } | null;
  workers: Array<{
    id: string;
    lastHeartbeat: Date;
    status: 'ALIVE' | 'STALE';
    startedAt: Date;
    activeJobs?: number;
  }>;
}

export interface EnqueueResult {
  enqueued: boolean;
  jobId?: string;
  reason?: string;
}
