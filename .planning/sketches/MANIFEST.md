# Sketch Manifest

## Design Direction
PromptVault necesita un toggle entre dos modos de visualización de prompts: (1) "Feed" estilo Instagram — una tarjeta grande por fila con imagen + toda la metadata visible (título, preview del content, tags, acciones), pensado para leer y editar prompts en detalle; (2) "Mosaico" — 2-3 tarjetas por fila con la IMAGEN como elemento dominante (full-bleed, badge de categoría superpuesto, mínimo texto overlay), pensado para escanear thumbnails rápido y encontrar un prompt por su imagen. El toggle vive en el header, persiste en uiStore (Zustand), default Feed.

## Reference Points
- Pinterest grid (image-dominant, hover reveals metadata)
- Instagram feed (single-column rich cards)
- Notion gallery view (mixed info-density toggle)

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | view-mode-toggle | ¿Cómo se comparan visualmente Feed vs Mosaico 2-col vs Mosaico 3-col, y dónde/ cómo vive el toggle? | null | [layout, toggle, grid] |
