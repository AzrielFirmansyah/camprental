-- MySQL dump 10.13  Distrib 8.4.3, for Win64 (x86_64)
--
-- Host: localhost    Database: camprental
-- ------------------------------------------------------
-- Server version	8.4.3

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Tenda'),(2,'Carrier'),(3,'Alat Masak'),(4,'Tas'),(5,'Penerangan'),(6,'Aksesoris Pendakian'),(7,'Perlengkapan Tidur');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `discounts`
--

DROP TABLE IF EXISTS `discounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `discounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `percentage` int NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `discounts`
--

LOCK TABLES `discounts` WRITE;
/*!40000 ALTER TABLE `discounts` DISABLE KEYS */;
INSERT INTO `discounts` VALUES (1,'Basic',5,'2026-04-03 07:42:32'),(2,'Silver',10,'2026-04-03 07:44:14'),(3,'Gold',20,'2026-04-03 07:45:56'),(4,'Platinum',30,'2026-04-03 07:46:21'),(5,'Diamond',40,'2026-04-03 07:47:23'),(6,'VIP',50,'2026-04-03 07:47:46'),(7,'Family',100,'2026-04-03 07:49:59');
/*!40000 ALTER TABLE `discounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `description` varchar(255) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `date` date NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `expenses`
--

LOCK TABLES `expenses` WRITE;
/*!40000 ALTER TABLE `expenses` DISABLE KEYS */;
/*!40000 ALTER TABLE `expenses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `item_statuses`
--

DROP TABLE IF EXISTS `item_statuses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `item_statuses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `color` varchar(50) DEFAULT 'stone',
  `description` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `item_statuses`
--

LOCK TABLES `item_statuses` WRITE;
/*!40000 ALTER TABLE `item_statuses` DISABLE KEYS */;
INSERT INTO `item_statuses` VALUES (1,'Ada','emerald','Item tersedia dan siap untuk disewakan kepada pelanggan.'),(2,'Menipis','orange','Item masih tersedia namun stok mulai menipis (biasanya di bawah 3).'),(3,'Habis','red','Stok item habis sepenuhnya dan tidak tersedia untuk penyewaan.');
/*!40000 ALTER TABLE `item_statuses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `categoryId` int DEFAULT NULL,
  `dailyPrice` decimal(15,2) NOT NULL,
  `weeklyPrice` decimal(15,2) NOT NULL,
  `totalStock` int NOT NULL,
  `availableStock` int NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'Ada',
  PRIMARY KEY (`id`),
  KEY `categoryId` (`categoryId`),
  CONSTRAINT `items_ibfk_1` FOREIGN KEY (`categoryId`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `items`
--

LOCK TABLES `items` WRITE;
/*!40000 ALTER TABLE `items` DISABLE KEYS */;
INSERT INTO `items` VALUES (1,'Tenda Dome 4 Orang',1,50000.00,300000.00,20,20,'Ada'),(2,'Carrier 60L',4,35000.00,210000.00,15,15,'Ada'),(3,'Kompor Portable',3,15000.00,90000.00,20,20,'Ada'),(4,'Nesting DS',3,30000.00,600000.00,10,10,'Ada'),(5,'Head Lamp',6,10000.00,20000.00,10,10,'Ada'),(6,'Sleeping Bag',7,35000.00,50000.00,10,10,'Ada'),(8,'Kaca Mata',6,5000.00,10000.00,10,10,'Ada'),(9,'Trekking pole',6,15000.00,20000.00,10,10,'Ada'),(10,'Matras',7,10000.00,20000.00,10,10,'Ada'),(11,'Kompor Bunga',3,10000.00,20000.00,10,10,'Ada'),(13,'Sepatu ',6,35000.00,50000.00,10,10,'Ada'),(14,'Topi',6,5000.00,10000.00,10,10,'Ada'),(15,'Hydro Pack',4,25000.00,30000.00,10,10,'Ada'),(17,'Pisau',3,3000.00,15000.00,5,5,'Ada'),(18,'Baju',6,10000.00,20000.00,10,10,'Ada'),(19,'Celana Cargo',6,10000.00,20000.00,10,10,'Ada'),(20,'Mug Stainless Carabinet',3,5000.00,30000.00,10,10,'Ada'),(21,'Lampu tenda',1,5000.00,30000.00,10,10,'Ada'),(22,'Lampu',5,3000.00,5000.00,10,10,'Ada'),(23,'Sepatu Uk 42',6,25000.00,100000.00,10,10,'Ada');
/*!40000 ALTER TABLE `items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_methods`
--

DROP TABLE IF EXISTS `payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_methods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_methods`
--

LOCK TABLES `payment_methods` WRITE;
/*!40000 ALTER TABLE `payment_methods` DISABLE KEYS */;
INSERT INTO `payment_methods` VALUES (1,'Cash','2026-04-03 08:20:50'),(2,'Transfer','2026-04-03 08:20:50'),(3,'QRIS','2026-04-03 08:20:50');
/*!40000 ALTER TABLE `payment_methods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaction_items`
--

DROP TABLE IF EXISTS `transaction_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaction_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transactionId` int DEFAULT NULL,
  `itemId` int DEFAULT NULL,
  `quantity` int NOT NULL,
  `price` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `transactionId` (`transactionId`),
  KEY `itemId` (`itemId`),
  CONSTRAINT `transaction_items_ibfk_1` FOREIGN KEY (`transactionId`) REFERENCES `transactions` (`id`),
  CONSTRAINT `transaction_items_ibfk_2` FOREIGN KEY (`itemId`) REFERENCES `items` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaction_items`
--

LOCK TABLES `transaction_items` WRITE;
/*!40000 ALTER TABLE `transaction_items` DISABLE KEYS */;
INSERT INTO `transaction_items` VALUES (1,1,21,1,25000.00),(2,1,1,1,250000.00),(3,1,18,1,50000.00),(4,1,19,1,50000.00),(5,1,5,1,50000.00),(6,1,8,1,25000.00),(7,1,13,1,175000.00),(8,1,14,1,25000.00),(9,1,9,1,75000.00),(10,1,3,1,75000.00),(11,1,20,1,25000.00),(12,2,14,1,5000.00),(13,2,5,1,10000.00),(14,2,21,1,5000.00),(15,2,1,1,50000.00),(16,2,18,1,10000.00),(17,3,3,1,15000.00),(18,3,19,1,10000.00),(19,3,5,2,10000.00),(20,4,1,2,200000.00),(21,4,18,1,40000.00),(22,4,19,1,40000.00),(23,4,5,1,40000.00),(24,4,8,1,20000.00),(25,4,13,1,140000.00),(26,4,23,1,100000.00);
/*!40000 ALTER TABLE `transaction_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `customerName` varchar(255) NOT NULL,
  `customerPhone` varchar(50) NOT NULL,
  `startDate` date NOT NULL,
  `endDate` date NOT NULL,
  `durationDays` int NOT NULL,
  `subtotal` decimal(15,2) DEFAULT '0.00',
  `discount` int DEFAULT '0',
  `discountAmount` decimal(15,2) DEFAULT '0.00',
  `totalAmount` decimal(15,2) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `paymentMethod` varchar(50) DEFAULT 'Cash',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (1,1,'Azriel','087856781131','2026-04-03','2026-04-08',5,825000.00,5,41250.00,783750.00,'returned','Cash','2026-04-03 10:07:07'),(2,1,'Test 1','08123456789','2026-04-03','2026-04-04',1,80000.00,10,8000.00,72000.00,'returned','Cash','2026-04-03 10:12:50'),(3,1,'Test 3','08123456789','2026-04-03','2026-04-04',1,45000.00,20,9000.00,36000.00,'returned','Transfer','2026-04-03 10:18:49'),(4,1,'Aurel','08123456789','2026-04-03','2026-04-07',4,780000.00,0,0.00,780000.00,'returned','Cash','2026-04-03 14:10:16');
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Moh. Azriel Firmansson','azriel@rental.com','$2b$10$0q5f5MUsagPT0ysdkb8CcOf019/1wDYzqbKVgeLk0uO2Dt4CZJAr2','admin'),(2,'Elza Nur Rahmah Salzabillah','elza@rental.com','$2b$10$ME8x0hVCklmsWtTLdQ6FNu173UVU3ahAh4wJhNz/uj1WrrINfL0Wq','owner');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-03 23:09:06