/*
  Warnings:

  - You are about to alter the column `conflictPolicy` on the `special_rates` table. The data in that column could be lost. The data in that column will be cast from `VarChar(20)` to `Enum(EnumId(11))`.

*/
-- AlterTable
ALTER TABLE `special_rates` MODIFY `conflictPolicy` ENUM('override', 'skip', 'reject') NOT NULL DEFAULT 'override';
