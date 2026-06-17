-- AlterTable
ALTER TABLE "artist" ADD COLUMN     "setlistfm_synced_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "artist_name_idx" ON "artist"("name");

-- CreateIndex
CREATE INDEX "performance_artist_id_performance_date_idx" ON "performance"("artist_id", "performance_date");

-- CreateIndex
CREATE INDEX "venue_city_idx" ON "venue"("city");
