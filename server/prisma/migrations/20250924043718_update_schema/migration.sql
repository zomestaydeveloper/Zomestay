/*
  Warnings:

  - You are about to drop the column `price` on the `availability` table. All the data in the column will be lost.
  - You are about to drop the column `allotment` on the `ratecalendar` table. All the data in the column will be lost.
  - You are about to drop the column `cta` on the `ratecalendar` table. All the data in the column will be lost.
  - You are about to drop the column `ctd` on the `ratecalendar` table. All the data in the column will be lost.
  - You are about to drop the column `mealPlanId` on the `ratecalendar` table. All the data in the column will be lost.
  - You are about to drop the column `minNights` on the `ratecalendar` table. All the data in the column will be lost.
  - You are about to alter the column `pricingMode` on the `special_rates` table. The data in that column could be lost. The data in that column will be cast from `VarChar(20)` to `Enum(EnumId(11))`.
  - You are about to alter the column `pricingMode` on the `specialrateroomtype` table. The data in that column could be lost. The data in that column will be cast from `VarChar(20)` to `Enum(EnumId(11))`.
  - You are about to drop the `propertyroomtypemealplan` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[title,isDeleted]` on the table `Property` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[propertyRoomTypeId,date,isDeleted]` on the table `RateCalendar` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Availability_roomId_idx` ON `availability`;

-- DropIndex
DROP INDEX `Property_title_key` ON `property`;

-- DropIndex
DROP INDEX `RateCalendar_propertyRoomTypeId_mealPlanId_date_idx` ON `ratecalendar`;

-- DropIndex
DROP INDEX `RateCalendar_propertyRoomTypeId_mealPlanId_date_isDeleted_key` ON `ratecalendar`;

-- AlterTable
ALTER TABLE `availability` DROP COLUMN `price`;

-- AlterTable
ALTER TABLE `booking` MODIFY `mealPlanId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ratecalendar` DROP COLUMN `allotment`,
    DROP COLUMN `cta`,
    DROP COLUMN `ctd`,
    DROP COLUMN `mealPlanId`,
    DROP COLUMN `minNights`;

-- AlterTable
ALTER TABLE `special_rates` MODIFY `pricingMode` ENUM('flat', 'percent') NOT NULL;

-- AlterTable
ALTER TABLE `specialrateroomtype` MODIFY `pricingMode` ENUM('flat', 'percent') NOT NULL;

-- DropTable
DROP TABLE `propertyroomtypemealplan`;

-- CreateIndex
CREATE INDEX `Availability_roomId_date_isDeleted_idx` ON `Availability`(`roomId`, `date`, `isDeleted`);

-- CreateIndex
CREATE UNIQUE INDEX `Property_title_isDeleted_key` ON `Property`(`title`, `isDeleted`);

-- CreateIndex
CREATE INDEX `RateCalendar_propertyRoomTypeId_date_idx` ON `RateCalendar`(`propertyRoomTypeId`, `date`);

-- CreateIndex
CREATE UNIQUE INDEX `RateCalendar_propertyRoomTypeId_date_isDeleted_key` ON `RateCalendar`(`propertyRoomTypeId`, `date`, `isDeleted`);

-- CreateIndex
CREATE INDEX `special_rates_propertyId_dateFrom_dateTo_isActive_idx` ON `special_rates`(`propertyId`, `dateFrom`, `dateTo`, `isActive`);
