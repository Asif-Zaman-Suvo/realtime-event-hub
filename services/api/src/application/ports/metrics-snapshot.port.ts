export interface MetricsSnapshotStore {
  incrementPublished(): Promise<void>;
  getSnapshot(): Promise<{
    totalPublished: number;
    lastPublishAt?: string;
    totalPersisted: number;
    lastBatchAt?: string;
    lastBatchSize: number;
  }>;
}
