-- CreateEnum
CREATE TYPE "ImageIntent" AS ENUM ('GENERAR', 'MEJORAR_REALISMO', 'TRANSFORMAR', 'RETOQUE', 'COMPONER', 'DEFINIR_IDENTIDAD', 'MODIFICAR_POSE');

-- CreateEnum
CREATE TYPE "ImageTarget" AS ENUM ('ROSTRO', 'PIEL', 'CUERPO', 'ILUMINACION', 'ESCENA_COMPLETA', 'ROPA_TEXTURA');

-- CreateEnum
CREATE TYPE "InputMode" AS ENUM ('TEXTO_A_IMAGEN', 'IMAGEN_A_IMAGEN', 'MULTI_IMAGEN');

-- CreateEnum
CREATE TYPE "Preservation" AS ENUM ('IDENTIDAD', 'COMPOSICION', 'LIBRE');

-- AlterTable
ALTER TABLE "prompts" ADD COLUMN     "intent" "ImageIntent",
ADD COLUMN     "targets" "ImageTarget"[] NOT NULL DEFAULT ARRAY[]::"ImageTarget"[],
ADD COLUMN     "input_mode" "InputMode",
ADD COLUMN     "preservation" "Preservation";

-- CreateIndex
CREATE INDEX "prompts_intent_idx" ON "prompts"("intent");

-- CreateIndex
CREATE INDEX "prompts_input_mode_idx" ON "prompts"("input_mode");

-- CreateIndex
CREATE INDEX "prompts_preservation_idx" ON "prompts"("preservation");