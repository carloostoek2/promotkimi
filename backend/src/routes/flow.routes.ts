import { Router } from 'express';
import {
  createFlow,
  getFlows,
  getFlowById,
  updateFlow,
  deleteFlow,
  addNodeToFlow,
  reorderNodes,
  removeNodeFromFlow,
} from '../controllers/flow.controller';

const router = Router();

router.post('/', createFlow);
router.get('/', getFlows);
router.get('/:id', getFlowById);
router.put('/:id', updateFlow);
router.delete('/:id', deleteFlow);
router.post('/:id/nodes', addNodeToFlow);
router.put('/:id/nodes/reorder', reorderNodes);
router.delete('/:id/nodes/:nodeId', removeNodeFromFlow);

export default router;
