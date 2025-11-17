-- CreateTable
CREATE TABLE `Admin` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `phone` VARCHAR(191) NULL,
    `profileImage` VARCHAR(191) NULL,
    `emailVerified` DATETIME(3) NULL,
    `phoneVerified` DATETIME(3) NULL,
    `dob` DATETIME(3) NULL,
    `gender` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Admin_email_key`(`email`),
    INDEX `Admin_isDeleted_idx`(`isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Host` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `profileImage` VARCHAR(191) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Host_email_key`(`email`),
    INDEX `Host_isDeleted_idx`(`isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` CHAR(36) NOT NULL,
    `status` ENUM('active', 'blocked') NOT NULL DEFAULT 'active',
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `username` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `firstname` VARCHAR(191) NULL,
    `lastname` VARCHAR(191) NULL,
    `profileImage` VARCHAR(191) NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `phoneVerified` BOOLEAN NOT NULL DEFAULT false,
    `dob` DATETIME(3) NULL,
    `gender` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_phone_key`(`phone`),
    UNIQUE INDEX `User_username_key`(`username`),
    INDEX `User_isDeleted_idx`(`isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Amenity` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `Amenity_isDeleted_idx`(`isDeleted`),
    UNIQUE INDEX `Amenity_name_isDeleted_key`(`name`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Facility` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `Facility_isDeleted_idx`(`isDeleted`),
    UNIQUE INDEX `Facility_name_isDeleted_key`(`name`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SafetyHygiene` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `SafetyHygiene_isDeleted_idx`(`isDeleted`),
    UNIQUE INDEX `SafetyHygiene_name_isDeleted_key`(`name`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropertyType` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `PropertyType_isDeleted_idx`(`isDeleted`),
    UNIQUE INDEX `PropertyType_name_isDeleted_key`(`name`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Property` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `rulesAndPolicies` VARCHAR(191) NULL,
    `status` ENUM('active', 'blocked') NOT NULL DEFAULT 'active',
    `location` JSON NULL,
    `avgRating` DECIMAL(3, 2) NULL,
    `reviewCount` INTEGER NOT NULL DEFAULT 0,
    `coverImage` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `ownerHostId` CHAR(36) NOT NULL,
    `propertyTypeId` CHAR(36) NULL,

    UNIQUE INDEX `Property_title_key`(`title`),
    INDEX `Property_ownerHostId_idx`(`ownerHostId`),
    INDEX `Property_propertyTypeId_idx`(`propertyTypeId`),
    INDEX `Property_isDeleted_idx`(`isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropertyMedia` (
    `id` CHAR(36) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,
    `propertyId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `PropertyMedia_propertyId_idx`(`propertyId`),
    INDEX `PropertyMedia_isDeleted_idx`(`isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomType` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `RoomType_isDeleted_idx`(`isDeleted`),
    UNIQUE INDEX `RoomType_name_isDeleted_key`(`name`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropertyRoomType` (
    `id` CHAR(36) NOT NULL,
    `propertyId` CHAR(36) NOT NULL,
    `roomTypeId` CHAR(36) NOT NULL,
    `basePrice` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `PropertyRoomType_propertyId_idx`(`propertyId`),
    INDEX `PropertyRoomType_roomTypeId_idx`(`roomTypeId`),
    INDEX `PropertyRoomType_isDeleted_idx`(`isDeleted`),
    UNIQUE INDEX `PropertyRoomType_propertyId_roomTypeId_isDeleted_key`(`propertyId`, `roomTypeId`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Room` (
    `id` CHAR(36) NOT NULL,
    `propertyRoomTypeId` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `spaceSqft` INTEGER NULL,
    `maxOccupancy` INTEGER NOT NULL,
    `images` JSON NULL,
    `status` ENUM('active', 'maintenance', 'inactive') NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `Room_propertyRoomTypeId_idx`(`propertyRoomTypeId`),
    INDEX `Room_isDeleted_idx`(`isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Availability` (
    `id` CHAR(36) NOT NULL,
    `roomId` CHAR(36) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `status` ENUM('available', 'booked', 'maintenance', 'blocked', 'out_of_service') NOT NULL DEFAULT 'available',
    `price` DECIMAL(10, 2) NULL,
    `minNights` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `reason` VARCHAR(191) NULL,
    `blockedBy` VARCHAR(191) NULL,

    INDEX `Availability_roomId_idx`(`roomId`),
    INDEX `Availability_date_idx`(`date`),
    INDEX `Availability_status_idx`(`status`),
    INDEX `Availability_isDeleted_idx`(`isDeleted`),
    UNIQUE INDEX `Availability_roomId_date_isDeleted_key`(`roomId`, `date`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MealPlan` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `kind` ENUM('EP', 'CP', 'MAP', 'AP', 'custom') NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `MealPlan_code_key`(`code`),
    INDEX `MealPlan_isDeleted_idx`(`isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropertyRoomTypeMealPlan` (
    `id` CHAR(36) NOT NULL,
    `propertyRoomTypeId` CHAR(36) NOT NULL,
    `mealPlanId` CHAR(36) NOT NULL,
    `basePrice` DECIMAL(10, 2) NOT NULL,
    `extraAdult` DECIMAL(10, 2) NULL,
    `extraChild` DECIMAL(10, 2) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `PropertyRoomTypeMealPlan_propertyRoomTypeId_idx`(`propertyRoomTypeId`),
    INDEX `PropertyRoomTypeMealPlan_mealPlanId_idx`(`mealPlanId`),
    INDEX `PropertyRoomTypeMealPlan_isDeleted_idx`(`isDeleted`),
    UNIQUE INDEX `PropertyRoomTypeMealPlan_propertyRoomTypeId_mealPlanId_isDel_key`(`propertyRoomTypeId`, `mealPlanId`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RateCalendar` (
    `id` CHAR(36) NOT NULL,
    `propertyRoomTypeId` CHAR(36) NOT NULL,
    `mealPlanId` CHAR(36) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `price` DECIMAL(10, 2) NULL,
    `isOpen` BOOLEAN NOT NULL DEFAULT true,
    `allotment` INTEGER NULL,
    `minNights` INTEGER NULL,
    `cta` BOOLEAN NULL,
    `ctd` BOOLEAN NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `RateCalendar_propertyRoomTypeId_mealPlanId_date_idx`(`propertyRoomTypeId`, `mealPlanId`, `date`),
    INDEX `RateCalendar_isDeleted_idx`(`isDeleted`),
    UNIQUE INDEX `RateCalendar_propertyRoomTypeId_mealPlanId_date_isDeleted_key`(`propertyRoomTypeId`, `mealPlanId`, `date`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `propertyId` CHAR(36) NOT NULL,
    `propertyRoomTypeId` CHAR(36) NOT NULL,
    `roomId` CHAR(36) NOT NULL,
    `mealPlanId` CHAR(36) NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `taxes` DECIMAL(10, 2) NOT NULL,
    `discount` DECIMAL(10, 2) NOT NULL,
    `total` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('pending', 'confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
    `rateSnapshot` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `promoId` CHAR(36) NULL,

    INDEX `Booking_userId_idx`(`userId`),
    INDEX `Booking_propertyId_idx`(`propertyId`),
    INDEX `Booking_propertyRoomTypeId_idx`(`propertyRoomTypeId`),
    INDEX `Booking_roomId_idx`(`roomId`),
    INDEX `Booking_mealPlanId_idx`(`mealPlanId`),
    INDEX `Booking_isDeleted_idx`(`isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` CHAR(36) NOT NULL,
    `transactionID` VARCHAR(191) NOT NULL,
    `customerId` CHAR(36) NOT NULL,
    `propertyId` CHAR(36) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `bookingId` CHAR(36) NULL,

    UNIQUE INDEX `Payment_transactionID_key`(`transactionID`),
    INDEX `Payment_customerId_idx`(`customerId`),
    INDEX `Payment_propertyId_idx`(`propertyId`),
    INDEX `Payment_bookingId_idx`(`bookingId`),
    INDEX `Payment_isDeleted_idx`(`isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Review` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `propertyId` CHAR(36) NOT NULL,
    `description` VARCHAR(191) NULL,
    `rating` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `Review_propertyId_idx`(`propertyId`),
    INDEX `Review_isDeleted_idx`(`isDeleted`),
    UNIQUE INDEX `Review_userId_propertyId_isDeleted_key`(`userId`, `propertyId`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Wishlist` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Wishlist_userId_key`(`userId`),
    INDEX `Wishlist_isDeleted_idx`(`isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WishlistItem` (
    `id` CHAR(36) NOT NULL,
    `wishlistId` CHAR(36) NOT NULL,
    `propertyId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `WishlistItem_propertyId_idx`(`propertyId`),
    INDEX `WishlistItem_isDeleted_idx`(`isDeleted`),
    UNIQUE INDEX `WishlistItem_wishlistId_propertyId_isDeleted_key`(`wishlistId`, `propertyId`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Promotion` (
    `id` CHAR(36) NOT NULL,
    `propertyId` CHAR(36) NOT NULL,
    `discount` DECIMAL(10, 2) NOT NULL,
    `validFrom` DATETIME(3) NOT NULL,
    `validTo` DATETIME(3) NOT NULL,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `type` ENUM('percent', 'flat') NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Promotion_code_key`(`code`),
    INDEX `Promotion_propertyId_idx`(`propertyId`),
    INDEX `Promotion_isDeleted_idx`(`isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropertyAmenity` (
    `id` CHAR(36) NOT NULL,
    `propertyId` CHAR(36) NOT NULL,
    `amenityId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `PropertyAmenity_amenityId_idx`(`amenityId`),
    INDEX `PropertyAmenity_isDeleted_idx`(`isDeleted`),
    UNIQUE INDEX `PropertyAmenity_propertyId_amenityId_isDeleted_key`(`propertyId`, `amenityId`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropertyFacility` (
    `id` CHAR(36) NOT NULL,
    `propertyId` CHAR(36) NOT NULL,
    `facilityId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `PropertyFacility_facilityId_idx`(`facilityId`),
    INDEX `PropertyFacility_isDeleted_idx`(`isDeleted`),
    UNIQUE INDEX `PropertyFacility_propertyId_facilityId_isDeleted_key`(`propertyId`, `facilityId`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PropertySafety` (
    `id` CHAR(36) NOT NULL,
    `propertyId` CHAR(36) NOT NULL,
    `safetyId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `PropertySafety_safetyId_idx`(`safetyId`),
    INDEX `PropertySafety_isDeleted_idx`(`isDeleted`),
    UNIQUE INDEX `PropertySafety_propertyId_safetyId_isDeleted_key`(`propertyId`, `safetyId`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomTypeAmenity` (
    `id` CHAR(36) NOT NULL,
    `roomTypeId` CHAR(36) NOT NULL,
    `amenityId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `RoomTypeAmenity_amenityId_idx`(`amenityId`),
    INDEX `RoomTypeAmenity_isDeleted_idx`(`isDeleted`),
    UNIQUE INDEX `RoomTypeAmenity_roomTypeId_amenityId_isDeleted_key`(`roomTypeId`, `amenityId`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoomAmenity` (
    `id` CHAR(36) NOT NULL,
    `roomId` CHAR(36) NOT NULL,
    `amenityId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `RoomAmenity_amenityId_idx`(`amenityId`),
    INDEX `RoomAmenity_isDeleted_idx`(`isDeleted`),
    UNIQUE INDEX `RoomAmenity_roomId_amenityId_isDeleted_key`(`roomId`, `amenityId`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `special_rates` (
    `id` CHAR(36) NOT NULL,
    `kind` ENUM('offer', 'peak', 'custom') NOT NULL DEFAULT 'custom',
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `propertyId` CHAR(36) NOT NULL,
    `dateFrom` DATETIME(3) NOT NULL,
    `dateTo` DATETIME(3) NOT NULL,
    `pricingMode` VARCHAR(20) NOT NULL,
    `flatPrice` DECIMAL(10, 2) NULL,
    `percentAdj` DECIMAL(5, 2) NULL,
    `conflictPolicy` VARCHAR(20) NOT NULL DEFAULT 'override',
    `priority` INTEGER NOT NULL DEFAULT 1,
    `minNights` INTEGER NOT NULL DEFAULT 1,
    `maxBookings` INTEGER NULL,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `tags` JSON NULL,
    `conditions` JSON NULL,
    `metadata` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdBy` CHAR(36) NOT NULL,
    `approvedBy` CHAR(36) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `special_rates_propertyId_isActive_idx`(`propertyId`, `isActive`),
    INDEX `special_rates_dateFrom_dateTo_idx`(`dateFrom`, `dateTo`),
    INDEX `special_rates_createdBy_idx`(`createdBy`),
    INDEX `special_rates_priority_idx`(`priority`),
    INDEX `special_rates_isDeleted_idx`(`isDeleted`),
    UNIQUE INDEX `special_rates_propertyId_name_isDeleted_key`(`propertyId`, `name`, `isDeleted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SpecialRateRoomType` (
    `id` CHAR(36) NOT NULL,
    `specialRateId` CHAR(36) NOT NULL,
    `propertyRoomTypeId` CHAR(36) NOT NULL,
    `pricingMode` VARCHAR(20) NOT NULL,
    `flatPrice` DECIMAL(10, 2) NULL,
    `percentAdj` DECIMAL(5, 2) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `SpecialRateRoomType_specialRateId_idx`(`specialRateId`),
    INDEX `SpecialRateRoomType_propertyRoomTypeId_idx`(`propertyRoomTypeId`),
    UNIQUE INDEX `SpecialRateRoomType_specialRateId_propertyRoomTypeId_key`(`specialRateId`, `propertyRoomTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
