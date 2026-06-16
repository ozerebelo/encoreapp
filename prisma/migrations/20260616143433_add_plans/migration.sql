-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('interested', 'going');

-- CreateTable
CREATE TABLE "plan" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "performance_id" UUID NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'interested',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_user_id_idx" ON "plan"("user_id");

-- CreateIndex
CREATE INDEX "plan_performance_id_idx" ON "plan"("performance_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_user_id_performance_id_key" ON "plan"("user_id", "performance_id");

-- AddForeignKey
ALTER TABLE "plan" ADD CONSTRAINT "plan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan" ADD CONSTRAINT "plan_performance_id_fkey" FOREIGN KEY ("performance_id") REFERENCES "performance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
