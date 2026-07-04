import { Request, Response } from 'express';
import { z } from 'zod';
import * as flowService from '../services/flow.service';

const createFlowSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  description: z.string().optional(),
});

const updateFlowSchema = z.object({
  name: z.string().max(200).optional(),
  description: z.string().optional(),
});

const addNodeSchema = z.object({
  promptId: z.string().min(1, 'Prompt ID es requerido'),
  position: z.number().int().positive().optional(),
});

const reorderNodesSchema = z.object({
  nodeIds: z.array(z.string().min(1)),
});

export async function createFlow(req: Request, res: Response) {
  try {
    const validation = createFlowSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
    }

    const flow = await flowService.createFlow(validation.data);
    return res.status(201).json({ success: true, data: flow, message: 'Flujo creado exitosamente' });
  } catch (error) {
    console.error('Error creating flow:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function getFlows(req: Request, res: Response) {
  try {
    const promptId = req.query.promptId as string | undefined;
    const flows = await flowService.getFlows(promptId);
    return res.json({ success: true, data: flows, count: flows.length });
  } catch (error) {
    console.error('Error getting flows:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function getFlowById(req: Request, res: Response) {
  try {
    const flow = await flowService.getFlowById(req.params.id);
    if (!flow) {
      return res.status(404).json({ success: false, error: 'Flujo no encontrado' });
    }
    return res.json({ success: true, data: flow });
  } catch (error) {
    console.error('Error getting flow:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function updateFlow(req: Request, res: Response) {
  try {
    const validation = updateFlowSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
    }

    const existing = await flowService.getFlowById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Flujo no encontrado' });
    }

    const flow = await flowService.updateFlow(req.params.id, validation.data);
    return res.json({ success: true, data: flow, message: 'Flujo actualizado exitosamente' });
  } catch (error) {
    console.error('Error updating flow:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function deleteFlow(req: Request, res: Response) {
  try {
    const existing = await flowService.getFlowById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Flujo no encontrado' });
    }

    await flowService.deleteFlow(req.params.id);
    return res.json({ success: true, message: 'Flujo eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting flow:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function addNodeToFlow(req: Request, res: Response) {
  try {
    const validation = addNodeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
    }

    const flow = await flowService.getFlowById(req.params.id);
    if (!flow) {
      return res.status(404).json({ success: false, error: 'Flujo no encontrado' });
    }

    await flowService.addNodeToFlow(req.params.id, validation.data);
    const updatedFlow = await flowService.getFlowById(req.params.id);
    return res.status(201).json({ success: true, data: updatedFlow, message: 'Nodo agregado exitosamente' });
  } catch (error) {
    console.error('Error adding node:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function reorderNodes(req: Request, res: Response) {
  try {
    const validation = reorderNodesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message,
      });
    }

    const flow = await flowService.reorderNodes(req.params.id, validation.data.nodeIds);
    return res.json({ success: true, data: flow, message: 'Orden actualizado exitosamente' });
  } catch (error) {
    console.error('Error reordering nodes:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}

export async function removeNodeFromFlow(req: Request, res: Response) {
  try {
    const { id, nodeId } = req.params;
    await flowService.removeNodeFromFlow(id, nodeId);
    return res.json({ success: true, message: 'Nodo eliminado exitosamente' });
  } catch (error) {
    console.error('Error removing node:', error);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
}
