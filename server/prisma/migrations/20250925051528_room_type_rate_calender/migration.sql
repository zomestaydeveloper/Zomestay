-- CreateTable
CREATE TABLE `RoomRateCalendar` (
    `id` CHAR(36) NOT NULL,
    `roomId` CHAR(36) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `price` DECIMAL(10, 2) NULL,
    `isOpen` BOOLEAN NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `RoomRateCalendar_roomId_date_idx`(`roomId`, `date`),
    INDEX `RoomRateCalendar_isDeleted_idx`(`isDeleted`),
    UNIQUE INDEX `RoomRateCalendar_roomId_date_isDeleted_key`(`roomId`, `date`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
