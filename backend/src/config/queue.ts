import { Queue, Worker } from 'bullmq';
import redis from './redis';
import { processAnalysisJob, onAnalysisCompleted, onAnalysisFailed } from '../workers/analysis.worker';

// Cola de análisis
export const analysisQueue = new Queue('analysis', {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});

// Worker de análisis
export const analysisWorker = new Worker(
  'analysis',
  async (job) => {
    return processAnalysisJob(job);
  },
  {
    connection: redis as any,
    concurrency: 2
  }
);

// Event listeners
analysisWorker.on('completed', onAnalysisCompleted);
analysisWorker.on('failed', onAnalysisFailed);

analysisWorker.on('error', (error) => {
  console.error('[Worker] Error:', error);
});

// Función para encolar análisis
export async function queueAnalysis(promptId: string, content: string) {
  return analysisQueue.add(
    'analyze-prompt',
    { promptId, content },
    {
      jobId: `analyze-${promptId}`,
      delay: 0
    }
  );
}

export default analysisQueue;
