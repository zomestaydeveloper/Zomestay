/*
  Warnings:

  - You are about to drop the column `approvedAt` on the `special_rates` table. All the data in the column will be lost.
  - You are about to drop the column `approvedBy` on the `special_rates` table. All the data in the column will be lost.
  - You are about to drop the column `conditions` on the `special_rates` table. All the data in the column will be lost.
  - You are about to drop the column `conflictPolicy` on the `special_rates` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `special_rates` table. All the data in the column will be lost.
  - You are about to drop the column `dateFrom` on the `special_rates` table. All the data in the column will be lost.
  - You are about to drop the column `dateTo` on the `special_rates` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `special_rates` table. All the data in the column will be lost.
  - You are about to drop the column `maxBookings` on the `special_rates` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `special_rates` table. All the data in the column will be lost.
  - You are about to drop the column `minNights` on the `special_rates` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `special_rates` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `special_rates` table. All the data in the column will be lost.
  - You are about to drop the column `usageCount` on the `special_rates` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `Booking_promoId_fkey` ON `booking`;

-- DropIndex
DROP INDEX `MealPlan_propertyId_fkey` ON `mealplan`;

-- DropIndex
DROP INDEX `special_rates_createdBy_idx` ON `special_rates`;

-- DropIndex
DROP INDEX `special_rates_dateFrom_dateTo_idx` ON `special_rates`;

-- DropIndex
DROP INDEX `special_rates_priority_idx` ON `special_rates`;

-- DropIndex
DROP INDEX `special_rates_propertyId_dateFrom_dateTo_isActive_idx` ON `special_rates`;

-- AlterTable
ALTER TABLE `special_rates` DROP COLUMN `approvedAt`,
    DROP COLUMN `approvedBy`,
    DROP COLUMN `conditions`,
    DROP COLUMN `conflictPolicy`,
    DROP COLUMN `createdBy`,
    DROP COLUMN `dateFrom`,
    DROP COLUMN `dateTo`,
    DROP COLUMN `description`,
    DROP COLUMN `maxBookings`,
    DROP COLUMN `metadata`,
    DROP COLUMN `minNights`,
    DROP COLUMN `priority`,
    DROP COLUMN `tags`,
    DROP COLUMN `usageCount`,
    ADD COLUMN `hostId` CHAR(36) NULL;

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
ALTER TABLE `RateCalendar` ADD CONSTRAINT `RateCalendar_propertyRoomTypeId_fkey` FOREIGN KEY (`propertyRoomTypeId`) REFERENCES `PropertyRoomType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_promoId_fkey` FOREIGN KEY (`promoId`) REFERENCES `Promotion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE `RoomAmenity` ADD CONSTRAINT `RoomAmenity_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomAmenity` ADD CONSTRAINT `RoomAmenity_amenityId_fkey` FOREIGN KEY (`amenityId`) REFERENCES `Amenity`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `special_rates` ADD CONSTRAINT `special_rates_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `special_rates` ADD CONSTRAINT `special_rates_hostId_fkey` FOREIGN KEY (`hostId`) REFERENCES `Host`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SpecialRateRoomType` ADD CONSTRAINT `SpecialRateRoomType_specialRateId_fkey` FOREIGN KEY (`specialRateId`) REFERENCES `special_rates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SpecialRateRoomType` ADD CONSTRAINT `SpecialRateRoomType_propertyRoomTypeId_fkey` FOREIGN KEY (`propertyRoomTypeId`) REFERENCES `PropertyRoomType`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomRateCalendar` ADD CONSTRAINT `RoomRateCalendar_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
