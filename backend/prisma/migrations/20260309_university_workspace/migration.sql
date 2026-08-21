CREATE TABLE "UniversityCourse" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "teacher" TEXT,
  "color" TEXT NOT NULL DEFAULT '#4f46e5',
  "mastery" INTEGER NOT NULL DEFAULT 0,
  "examDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UniversityCourse_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UniversityAssignment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT,
  "title" TEXT NOT NULL,
  "course" TEXT,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UniversityAssignment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UniversityPlan" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "day" TEXT NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UniversityPlan_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UniversityFile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "storageUrl" TEXT NOT NULL,
  "storageKey" TEXT,
  "category" TEXT NOT NULL DEFAULT 'course-material',
  "courseId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UniversityFile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UniversityCourse_userId_idx" ON "UniversityCourse"("userId");
CREATE INDEX "UniversityAssignment_userId_dueDate_idx" ON "UniversityAssignment"("userId", "dueDate");
CREATE INDEX "UniversityPlan_userId_createdAt_idx" ON "UniversityPlan"("userId", "createdAt");
CREATE INDEX "UniversityFile_userId_category_idx" ON "UniversityFile"("userId", "category");
ALTER TABLE "UniversityCourse" ADD CONSTRAINT "UniversityCourse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UniversityAssignment" ADD CONSTRAINT "UniversityAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UniversityAssignment" ADD CONSTRAINT "UniversityAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "UniversityCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UniversityPlan" ADD CONSTRAINT "UniversityPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UniversityFile" ADD CONSTRAINT "UniversityFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
