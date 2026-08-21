CREATE TABLE "UniversitySchedule" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT,
  "title" TEXT NOT NULL,
  "weekday" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "room" TEXT,
  "teacher" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UniversitySchedule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UniversitySchedule_userId_weekday_idx" ON "UniversitySchedule"("userId", "weekday");
ALTER TABLE "UniversitySchedule" ADD CONSTRAINT "UniversitySchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UniversitySchedule" ADD CONSTRAINT "UniversitySchedule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "UniversityCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
