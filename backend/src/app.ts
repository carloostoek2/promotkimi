import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import promptRoutes from './routes/prompt.routes';
import tagRoutes from './routes/tag.routes';
import flowRoutes from './routes/flow.routes';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import queue (to initialize worker)
import './config/queue';

const app = express();
const PORT = process.env.PORT || 3001;
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      connectSrc: ["'self'", "*"],
    },
  },
}));

app.use(cors({
  origin: process.env.WEB_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/prompts', promptRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/flows', flowRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📁 Directorio de uploads: ${path.resolve(UPLOAD_DIR)}`);
});

export default app;
