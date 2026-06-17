-- CreateTable
CREATE TABLE "log_companion" (
    "log_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "log_companion_pkey" PRIMARY KEY ("log_id","user_id")
);

-- CreateIndex
CREATE INDEX "log_companion_user_id_idx" ON "log_companion"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "performance_event_id_artist_id_performance_date_key" ON "performance"("event_id", "artist_id", "performance_date");

-- AddForeignKey
ALTER TABLE "log_companion" ADD CONSTRAINT "log_companion_log_id_fkey" FOREIGN KEY ("log_id") REFERENCES "log"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_companion" ADD CONSTRAINT "log_companion_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
