# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PromptVault is a prompt repository system with automatic AI analysis via OpenRouter. It stores prompts with metadata, categories, and tags, supports image uploads with thumbnail generation, and provides full-text search.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Zustand
- **Backend**: Node.js 20 + Express + TypeScript + Prisma ORM + BullMQ (job queue) + Sharp (image processing)
- **Database**: PostgreSQL 15
- **Cache/Jobs**: Redis 7
- **Deployment**: Railway (web + api services, shared uploads volume)

## Common Commands

```bash
# Start full stack (requires PostgreSQL and Redis running locally)
npm run dev

# Build frontend
npm run build

# Build backend
npm run build:backend

# Database migrations (runs from backend/)
cd backend && npx prisma migrate dev --name <name>
cd backend && npx prisma generate

# Prisma Studio (visual DB editor)
cd backend && npx prisma studio
```

## Architecture

```
src/                          # Frontend React app
├── components/prompts/       # Prompt-specific components (CreateModal, DetailModal, PromptCard, PromptGrid)
├── stores/                   # Zustand stores (promptStore, uiStore)
├── services/api.ts           # API client for backend calls
└── types/                    # TypeScript definitions

backend/src/                  # Express API
├── controllers/              # Route handlers (prompt, tag)
├── routes/                  # API route definitions
├── services/                # Business logic (AI analysis, image processing)
├── workers/                 # BullMQ workers for async job processing
├── config/queue.ts          # Redis queue configuration
└── app.ts                   # Express app setup

backend/prisma/schema.prisma  # Database schema (Prompt, Tag, PromptTag, AnalysisJob)
```

## API Routes

- `GET /api/prompts` - List prompts (supports `?category=`, `?search=`, `?favorite=true`)
- `POST /api/prompts` - Create prompt
- `GET/PUT/DELETE /api/prompts/:id` - CRUD operations
- `POST /api/prompts/:id/favorite` - Toggle favorite
- `POST /api/prompts/:id/image` - Upload image
- `GET /api/tags` - List all tags
- `GET /api/tags/suggest?q=` - Tag suggestions

## Key Integrations

- **OpenRouter**: AI-powered prompt analysis. Configure `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in backend `.env`
- **Redis**: Powers the BullMQ job queue for async AI analysis tasks
- **Sharp**: Generates thumbnails for uploaded prompt images

## Database Schema

Core entities:
- **Prompt**: Stores prompt content, category, metadata, AI analysis results, image URLs
- **Tag**: User-defined tags with usage count
- **PromptTag**: Many-to-many join table
- **AnalysisJob**: Tracks async AI analysis jobs (status, attempts, result)

## Environment Variables

Frontend (`.env`):
- `VITE_API_URL` - Backend API URL (default: http://localhost:3001)

Backend (`backend/.env`):
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `OPENROUTER_API_KEY` - OpenRouter API key
- `OPENROUTER_MODEL` - Model to use (default: openrouter/auto)
- `PORT` - Server port (default: 3001)
- `WEB_URL` - Frontend URL for CORS
- `UPLOAD_DIR` - Upload directory path