/*
  Warnings:

  - Added the required column `adult_price` to the `MealPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `child_price` to the `MealPlan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `mealplan` ADD COLUMN `adult_price` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `child_price` DECIMAL(10, 2) NOT NULL;
