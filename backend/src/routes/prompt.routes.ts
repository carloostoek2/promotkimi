import { Router } from 'express';
import multer from 'multer';
import {
  createPrompt,
  getPrompts,
  getPromptById,
  updatePrompt,
  deletePrompt,
  toggleFavorite,
  updatePromptImage
} from '../controllers/prompt.controller';
import {
  listPromptVersions,
  getPromptVersion,
} from '../controllers/version.controller';

const router = Router();

// Configuración de multer para almacenamiento en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Routes
router.post('/', upload.single('image'), createPrompt);
router.get('/', getPrompts);
// Version routes must be registered before /:id to avoid param conflicts
router.get('/:id/versions', listPromptVersions);
router.get('/:id/versions/:version', getPromptVersion);
router.get('/:id', getPromptById);
router.put('/:id', updatePrompt);
router.delete('/:id', deletePrompt);
router.post('/:id/favorite', toggleFavorite);
router.post('/:id/image', upload.single('image'), updatePromptImage);

export default router;
