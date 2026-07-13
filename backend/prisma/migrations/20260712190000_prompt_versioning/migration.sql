-- CreateEnum
CREATE TYPE "VersionChangeReason" AS ENUM ('CREATE', 'UPDATE', 'IMAGE', 'ANALYSIS', 'RESTORE');

-- CreateTable
CREATE TABLE "prompt_versions" (
    "id" TEXT NOT NULL,
    "prompt_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "change_reason" "VersionChangeReason" NOT NULL,
    "title" VARCHAR(200),
    "description" TEXT,
    "content" TEXT NOT NULL,
    "category" "Category",
    "subcategory" VARCHAR(50),
    "intent" "ImageIntent",
    "targets" "ImageTarget"[] DEFAULT ARRAY[]::"ImageTarget"[],
    "input_mode" "InputMode",
    "preservation" "Preservation",
    "metadata" JSONB,
    "tags" JSONB NOT NULL,
    "image_url" VARCHAR(500),
    "thumbnail_url" VARCHAR(500),
    "analysis_result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prompt_versions_prompt_id_created_at_idx" ON "prompt_versions"("prompt_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_versions_prompt_id_version_key" ON "prompt_versions"("prompt_id", "version");

-- AddForeignKey
ALTER TABLE "prompt_versions" ADD CONSTRAINT "prompt_versions_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Idempotent backfill: version 1 for every prompt that has no versions yet
INSERT INTO "prompt_versions" (
    "id",
    "prompt_id",
    "version",
    "change_reason",
    "title",
    "description",
    "content",
    "category",
    "subcategory",
    "intent",
    "targets",
    "input_mode",
    "preservation",
    "metadata",
    "tags",
    "image_url",
    "thumbnail_url",
    "analysis_result",
    "created_at"
)
SELECT
    gen_random_uuid()::text,
    p."id",
    1,
    'CREATE'::"VersionChangeReason",
    p."title",
    p."description",
    p."content",
    p."category",
    p."subcategory",
    p."intent",
    p."targets",
    p."input_mode",
    p."preservation",
    p."metadata",
    COALESCE(
        (
            SELECT COALESCE(jsonb_agg(t."name" ORDER BY lower(t."name")), '[]'::jsonb)
            FROM "prompt_tags" pt
            JOIN "tags" t ON t."id" = pt."tag_id"
            WHERE pt."prompt_id" = p."id"
        ),
        '[]'::jsonb
    ),
    p."image_url",
    p."thumbnail_url",
    p."analysis_result",
    COALESCE(p."created_at", CURRENT_TIMESTAMP)
FROM "prompts" p
WHERE NOT EXISTS (
    SELECT 1
    FROM "prompt_versions" pv
    WHERE pv."prompt_id" = p."id"
);
