-- CreateTable
CREATE TABLE "GivenRewards" (
    "id" SERIAL NOT NULL,
    "earnerId" VARCHAR(36) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GivenRewards.earnerId_index" ON "GivenRewards"("earnerId");
