---
sketch: 001
name: view-mode-toggle
question: "¿Cómo se comparan visualmente las dos vistas (feed vs mosaico) y dónde vive el toggle?"
winner: null
tags: [layout, toggle, grid, mosaic]
---

# Sketch 001: View Mode Toggle

## Design Question
¿Cómo deben verse las dos vistas propuestas y dónde/ cómo se muestra el control que las intercambia?

## How to View
open .planning/sketches/001-view-mode-toggle/index.html

## Variants
- **A: Feed (1 col)** — Una tarjeta grande por fila, max-width 720px para legibilidad, imagen 16:10 + título + preview de 3 líneas + tags + acciones. Pensado para leer/editar prompts.
- **B: Mosaico 2-col** — Tarjetas cuadradas full-bleed, 2 por fila. Badge de categoría superpuesto arriba-izquierda, título + fecha sobre gradiente abajo, fav button reveal en hover. Pensado para escanear thumbnails.
- **C: Mosaico 3-col** — Misma tarjeta pero 3 por fila en lg+ (2 en mobile/tablet). Máxima densidad visual.

El toggle está en el header (segmented control con 2 iconos: feed `≡` y grid `▦`) y es interactivo dentro de cada tab — click cambia el grid en vivo para sentir la diferencia.

## What to Look For
- ¿La vista Feed (A) se siente útil o se ve "ancha y vacía" en desktop?
- ¿2-col (B) o 3-col (C) — cuál densidad de thumbnails se prefiere para el escaneo visual?
- ¿El aspecto cuadrado (1:1) de la tarjeta mosaico funciona, o prefieres 4:3 / 3:4 (vertical) para mantener la proporción de las imágenes reales?
- ¿El toggle de 2 botones es claro, o se necesita un dropdown con label "Vista: mosaico 2-col"?
- En mosaico, ¿el título sobre gradiente es suficiente o hace falta revelar el preview del content en hover?
