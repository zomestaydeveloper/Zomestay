/*
  Warnings:

  - You are about to drop the column `discount` on the `booking` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `booking` table. All the data in the column will be lost.
  - You are about to drop the column `taxes` on the `booking` table. All the data in the column will be lost.
  - You are about to drop the column `total` on the `booking` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[bookingNumber]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[orderId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `adults` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookingNumber` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guestEmail` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guestName` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guestPhone` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nights` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rooms` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalGuests` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Booking_promoId_fkey` ON `booking`;

-- DropIndex
DROP INDEX `special_rates_hostId_fkey` ON `special_rates`;

-- AlterTable
ALTER TABLE `booking` DROP COLUMN `discount`,
    DROP COLUMN `subtotal`,
    DROP COLUMN `taxes`,
    DROP COLUMN `total`,
    ADD COLUMN `accessibilityNeeds` VARCHAR(191) NULL,
    ADD COLUMN `adults` INTEGER NOT NULL,
    ADD COLUMN `bookingNumber` VARCHAR(191) NOT NULL,
    ADD COLUMN `cancellationDate` DATETIME(3) NULL,
    ADD COLUMN `cancellationReason` VARCHAR(191) NULL,
    ADD COLUMN `checkInTime` VARCHAR(191) NULL,
    ADD COLUMN `checkOutTime` VARCHAR(191) NULL,
    ADD COLUMN `children` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `confirmationDate` DATETIME(3) NULL,
    ADD COLUMN `dietaryRequirements` VARCHAR(191) NULL,
    ADD COLUMN `guestAddress` VARCHAR(191) NULL,
    ADD COLUMN `guestEmail` VARCHAR(191) NOT NULL,
    ADD COLUMN `guestIdNumber` VARCHAR(191) NULL,
    ADD COLUMN `guestIdProof` VARCHAR(191) NULL,
    ADD COLUMN `guestName` VARCHAR(191) NOT NULL,
    ADD COLUMN `guestPhone` VARCHAR(191) NOT NULL,
    ADD COLUMN `hostConfirmed` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `hostNotes` VARCHAR(191) NULL,
    ADD COLUMN `infants` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `nights` INTEGER NOT NULL,
    ADD COLUMN `orderId` CHAR(36) NULL,
    ADD COLUMN `paymentMethod` VARCHAR(191) NULL,
    ADD COLUMN `paymentReference` VARCHAR(191) NULL,
    ADD COLUMN `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `roomSelections` JSON NULL,
    ADD COLUMN `rooms` INTEGER NOT NULL,
    ADD COLUMN `specialRequests` VARCHAR(191) NULL,
    ADD COLUMN `totalAmount` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `totalGuests` INTEGER NOT NULL,
    MODIFY `userId` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `Order` (
    `id` CHAR(36) NOT NULL,
    `razorpayOrderId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `receipt` VARCHAR(191) NULL,
    `propertyId` CHAR(36) NOT NULL,
    `checkIn` DATE NOT NULL,
    `checkOut` DATE NOT NULL,
    `guests` INTEGER NOT NULL,
    `children` INTEGER NOT NULL DEFAULT 0,
    `rooms` INTEGER NOT NULL,
    `guestName` VARCHAR(191) NULL,
    `guestEmail` VARCHAR(191) NULL,
    `guestPhone` VARCHAR(191) NULL,
    `razorpayPaymentId` VARCHAR(191) NULL,
    `razorpaySignature` VARCHAR(191) NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Order_razorpayOrderId_key`(`razorpayOrderId`),
    INDEX `Order_propertyId_idx`(`propertyId`),
    INDEX `Order_status_idx`(`status`),
    INDEX `Order_expiresAt_idx`(`expiresAt`),
    INDEX `Order_isDeleted_idx`(`isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Booking_bookingNumber_key` ON `Booking`(`bookingNumber`);

-- CreateIndex
CREATE UNIQUE INDEX `Booking_orderId_key` ON `Booking`(`orderId`);

-- CreateIndex
CREATE INDEX `Booking_orderId_idx` ON `Booking`(`orderId`);

-- CreateIndex
CREATE INDEX `Booking_bookingNumber_idx` ON `Booking`(`bookingNumber`);

-- CreateIndex
CREATE INDEX `Booking_status_idx` ON `Booking`(`status`);

-- CreateIndex
CREATE INDEX `Booking_startDate_idx` ON `Booking`(`startDate`);

-- CreateIndex
CREATE INDEX `Booking_endDate_idx` ON `Booking`(`endDate`);

-- AddForeignKey
ALTER TABLE `Property` ADD CONSTRAINT `Property_ownerHostId_fkey` FOREIGN KEY (`ownerHostId`) REFERENCES `Host`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Property` ADD CONSTRAINT `Property_propertyTypeId_fkey` FOREIGN KEY (`propertyTypeId`) REFERENCES `PropertyType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyMedia` ADD CONSTRAINT `PropertyMedia_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyRoomType` ADD CONSTRAINT `PropertyRoomType_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyRoomType` ADD CONSTRAINT `PropertyRoomType_roomTypeId_fkey` FOREIGN KEY (`roomTypeId`) REFERENCES `RoomType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Room` ADD CONSTRAINT `Room_propertyRoomTypeId_fkey` FOREIGN KEY (`propertyRoomTypeId`) REFERENCES `PropertyRoomType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Availability` ADD CONSTRAINT `Availability_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_promoId_fkey` FOREIGN KEY (`promoId`) REFERENCES `Promotion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_propertyRoomTypeId_fkey` FOREIGN KEY (`propertyRoomTypeId`) REFERENCES `PropertyRoomType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_mealPlanId_fkey` FOREIGN KEY (`mealPlanId`) REFERENCES `MealPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MealPlan` ADD CONSTRAINT `MealPlan_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RatePlan` ADD CONSTRAINT `RatePlan_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RatePlanDate` ADD CONSTRAINT `RatePlanDate_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RatePlanDate` ADD CONSTRAINT `RatePlanDate_ratePlanId_fkey` FOREIGN KEY (`ratePlanId`) REFERENCES `RatePlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyRoomTypeMealPlan` ADD CONSTRAINT `PropertyRoomTypeMealPlan_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyRoomTypeMealPlan` ADD CONSTRAINT `PropertyRoomTypeMealPlan_ratePlanId_fkey` FOREIGN KEY (`ratePlanId`) REFERENCES `RatePlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyRoomTypeMealPlan` ADD CONSTRAINT `PropertyRoomTypeMealPlan_propertyRoomTypeId_fkey` FOREIGN KEY (`propertyRoomTypeId`) REFERENCES `PropertyRoomType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyRoomTypeMealPlan` ADD CONSTRAINT `PropertyRoomTypeMealPlan_mealPlanId_fkey` FOREIGN KEY (`mealPlanId`) REFERENCES `MealPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Wishlist` ADD CONSTRAINT `Wishlist_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WishlistItem` ADD CONSTRAINT `WishlistItem_wishlistId_fkey` FOREIGN KEY (`wishlistId`) REFERENCES `Wishlist`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WishlistItem` ADD CONSTRAINT `WishlistItem_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Promotion` ADD CONSTRAINT `Promotion_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyAmenity` ADD CONSTRAINT `PropertyAmenity_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyAmenity` ADD CONSTRAINT `PropertyAmenity_amenityId_fkey` FOREIGN KEY (`amenityId`) REFERENCES `Amenity`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyFacility` ADD CONSTRAINT `PropertyFacility_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyFacility` ADD CONSTRAINT `PropertyFacility_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `Facility`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertySafety` ADD CONSTRAINT `PropertySafety_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertySafety` ADD CONSTRAINT `PropertySafety_safetyId_fkey` FOREIGN KEY (`safetyId`) REFERENCES `SafetyHygiene`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomTypeAmenity` ADD CONSTRAINT `RoomTypeAmenity_roomTypeId_fkey` FOREIGN KEY (`roomTypeId`) REFERENCES `RoomType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomTypeAmenity` ADD CONSTRAINT `RoomTypeAmenity_amenityId_fkey` FOREIGN KEY (`amenityId`) REFERENCES `Amenity`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `special_rates` ADD CONSTRAINT `special_rates_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `special_rates` ADD CONSTRAINT `special_rates_hostId_fkey` FOREIGN KEY (`hostId`) REFERENCES `Host`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SpecialRateRoomType` ADD CONSTRAINT `SpecialRateRoomType_specialRateId_fkey` FOREIGN KEY (`specialRateId`) REFERENCES `special_rates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SpecialRateRoomType` ADD CONSTRAINT `SpecialRateRoomType_propertyRoomTypeId_fkey` FOREIGN KEY (`propertyRoomTypeId`) REFERENCES `PropertyRoomType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SpecialRateApplication` ADD CONSTRAINT `SpecialRateApplication_specialRateId_fkey` FOREIGN KEY (`specialRateId`) REFERENCES `special_rates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SpecialRateApplication` ADD CONSTRAINT `SpecialRateApplication_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SpecialRateApplication` ADD CONSTRAINT `SpecialRateApplication_propertyRoomTypeId_fkey` FOREIGN KEY (`propertyRoomTypeId`) REFERENCES `PropertyRoomType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
