import { Request, Response } from 'express';
import * as versionService from '../services/version.service';

export async function listPromptVersions(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const versions = await versionService.listVersions(id);

    if (versions === null) {
      return res.status(404).json({
        success: false,
        error: 'Prompt no encontrado',
      });
    }

    return res.json({
      success: true,
      data: versions,
    });
  } catch (error) {
    console.error('Error listing prompt versions:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
}

export async function getPromptVersion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const versionNumber = Number.parseInt(req.params.version, 10);

    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      return res.status(400).json({
        success: false,
        error: 'Número de versión inválido',
      });
    }

    const version = await versionService.getVersion(id, versionNumber);

    if (!version) {
      return res.status(404).json({
        success: false,
        error: 'Versión no encontrada',
      });
    }

    return res.json({
      success: true,
      data: version,
    });
  } catch (error) {
    console.error('Error getting prompt version:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
}
