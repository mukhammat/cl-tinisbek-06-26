-- CreateTable
CREATE TABLE "User" (
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "User_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "activeSubstance" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fullDescription" TEXT NOT NULL,
    "indications" TEXT NOT NULL,
    "contraindications" TEXT NOT NULL,
    "usage" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "image" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "form" TEXT NOT NULL,
    "mgPerUnit" DOUBLE PRECISION NOT NULL,
    "dosageRules" TEXT NOT NULL,
    "inStock" INTEGER NOT NULL,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "items" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "notified" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "StockSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "read" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockSubscription_email_medicineId_key" ON "StockSubscription"("email", "medicineId");
