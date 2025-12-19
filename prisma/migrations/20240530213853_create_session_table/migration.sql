-- CreateTable
CREATE TABLE `Session` (
  `id` VARCHAR(255) NOT NULL,
  `shop` VARCHAR(255) NOT NULL,
  `state` VARCHAR(255) NOT NULL,
  `isOnline` TINYINT(1) NOT NULL DEFAULT 0,
  `scope` TEXT NULL,
  `expires` DATETIME NULL,
  `accessToken` TEXT NOT NULL,
  `userId` BIGINT NULL,
  `firstName` VARCHAR(255) NULL,
  `lastName` VARCHAR(255) NULL,
  `email` VARCHAR(255) NULL,
  `accountOwner` TINYINT(1) NOT NULL DEFAULT 0,
  `locale` VARCHAR(50) NULL,
  `collaborator` TINYINT(1) NULL DEFAULT 0,
  `emailVerified` TINYINT(1) NULL DEFAULT 0,
  `refreshToken` TEXT NULL,
  `refreshTokenExpires` DATETIME NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
