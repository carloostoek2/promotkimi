import { Job } from 'bullmq';
import prisma from '../config/database';
import { analyzePromptWithRetry } from '../services/openRouter.service';
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
      data: { analysisStatus: 'PROCESSING' }
    });

    // Llamar a OpenRouter
    const analysisResult: AnalysisResult = await analyzePromptWithRetry(content);

    console.log(`[Worker] Análisis completado para prompt ${promptId}:`, analysisResult);

    // Actualizar prompt con el resultado
    await updatePromptAnalysis(promptId, {
      title: analysisResult.title,
      description: analysisResult.description,
      category: analysisResult.category,
      subcategory: analysisResult.subcategory,
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
