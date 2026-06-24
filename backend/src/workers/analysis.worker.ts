import { Job } from 'bullmq';
import { AnalysisStatus } from '@prisma/client';
import prisma from '../config/database';
import { analyzePromptWithRetry } from '../services/deepseek.service';
import { updatePromptAnalysis, markAnalysisFailed } from '../services/prompt.service';
import { AnalysisResult } from '../types';

interface AnalysisJobData {
  promptId: string;
  content: string;
}

export async function processAnalysisJob(job: Job<AnalysisJobData>) {
  const { promptId, content } = job.data;

  console.log(`[Worker] Procesando análisis para prompt ${promptId}`);

  try {
    // Actualizar estado a PROCESSING
    await prisma.prompt.update({
      where: { id: promptId },
      data: { analysisStatus: AnalysisStatus.PROCESSING }
    });

    // Llamar a DeepSeek
    const analysisResult: AnalysisResult = await analyzePromptWithRetry(content);

    console.log(`[Worker] Análisis completado para prompt ${promptId}:`, analysisResult);

    // Actualizar prompt con el resultado
    await updatePromptAnalysis(promptId, {
      title: analysisResult.title,
      description: analysisResult.description,
      category: analysisResult.category,
      subcategory: analysisResult.subcategory,
      intent: analysisResult.intent ?? null,
      targets: analysisResult.targets ?? [],
      inputMode: analysisResult.inputMode ?? null,
      preservation: analysisResult.preservation ?? null,
      tags: analysisResult.tags,
      metadata: analysisResult.metadata,
      analysisResult: {
        ...analysisResult,
        processedAt: new Date().toISOString()
      }
    });

    return {
      success: true,
      promptId,
      result: analysisResult
    };

  } catch (error) {
    console.error(`[Worker] Error analizando prompt ${promptId}:`, error);

    // Marcar como fallido
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    await markAnalysisFailed(promptId, errorMessage);

    throw error;
  }
}

export async function onAnalysisCompleted(job: Job<AnalysisJobData>, result: any) {
  console.log(`[Worker] Job completado:`, result);
}

export async function onAnalysisFailed(job: Job<AnalysisJobData> | undefined, error: Error) {
  console.error(`[Worker] Job fallido:`, error);
}
