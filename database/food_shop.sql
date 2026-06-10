CREATE DATABASE  IF NOT EXISTS `food_shop` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;
USE `food_shop`;
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: food_shop
-- ------------------------------------------------------
-- Server version	5.5.5-10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cart_items`
--

DROP TABLE IF EXISTS `cart_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cart_items` (
  `cart_item_id` int(11) NOT NULL AUTO_INCREMENT,
  `cart_id` int(11) DEFAULT NULL,
  `dish_id` int(11) DEFAULT NULL,
  `combo_id` int(11) DEFAULT NULL,
  `is_combo` tinyint(1) DEFAULT 0,
  `quantity` int(11) DEFAULT 1,
  PRIMARY KEY (`cart_item_id`),
  KEY `cart_id` (`cart_id`),
  KEY `dish_id` (`dish_id`),
  CONSTRAINT `cart_items_ibfk_1` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`cart_id`) ON DELETE CASCADE,
  CONSTRAINT `cart_items_ibfk_2` FOREIGN KEY (`dish_id`) REFERENCES `dishes` (`dish_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cart_items`
--

LOCK TABLES `cart_items` WRITE;
/*!40000 ALTER TABLE `cart_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `cart_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carts`
--

DROP TABLE IF EXISTS `carts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carts` (
  `cart_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`cart_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `carts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carts`
--

LOCK TABLES `carts` WRITE;
/*!40000 ALTER TABLE `carts` DISABLE KEYS */;
INSERT INTO `carts` VALUES (1,21,'2026-06-08 10:00:42');
/*!40000 ALTER TABLE `carts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `category_id` int(11) NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  PRIMARY KEY (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Khai vị','Các món ăn nhẹ kích thích vị giác'),(2,'Món chính','Các món ăn no, giàu dinh dưỡng'),(3,'Tráng miệng','Bánh ngọt, chè và trái cây'),(4,'Nước giải khát','Cà phê, trà sữa và nước ép');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `combo_items`
--

DROP TABLE IF EXISTS `combo_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `combo_items` (
  `combo_id` int(11) NOT NULL,
  `dish_id` int(11) NOT NULL,
  `quantity` int(11) DEFAULT 1,
  PRIMARY KEY (`combo_id`,`dish_id`),
  KEY `dish_id` (`dish_id`),
  CONSTRAINT `combo_items_ibfk_1` FOREIGN KEY (`combo_id`) REFERENCES `combos` (`combo_id`) ON DELETE CASCADE,
  CONSTRAINT `combo_items_ibfk_2` FOREIGN KEY (`dish_id`) REFERENCES `dishes` (`dish_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `combo_items`
--

LOCK TABLES `combo_items` WRITE;
/*!40000 ALTER TABLE `combo_items` DISABLE KEYS */;
INSERT INTO `combo_items` VALUES (3,4,1),(3,9,1),(4,10,1),(4,16,1);
/*!40000 ALTER TABLE `combo_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `combos`
--

DROP TABLE IF EXISTS `combos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `combos` (
  `combo_id` int(11) NOT NULL AUTO_INCREMENT,
  `combo_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `discount_price` decimal(10,2) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `is_available` tinyint(1) DEFAULT 1,
  `original_price` decimal(10,2) DEFAULT 0.00,
  PRIMARY KEY (`combo_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `combos`
--

LOCK TABLES `combos` WRITE;
/*!40000 ALTER TABLE `combos` DISABLE KEYS */;
INSERT INTO `combos` VALUES (3,'Combo cơm trưa','',139000.00,'1780900617597.jpg',1,95000.00),(4,'Combo sáng','',45000.00,'default-food.png',1,55000.00);
/*!40000 ALTER TABLE `combos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `discount_codes`
--

DROP TABLE IF EXISTS `discount_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `discount_codes` (
  `discount_id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `discount_type` enum('percent','fixed','freeship') NOT NULL DEFAULT 'fixed',
  `discount_value` decimal(10,2) NOT NULL DEFAULT 0.00,
  `min_order_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `max_discount_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `usage_limit` int(11) NOT NULL DEFAULT 0,
  `used_count` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`discount_id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `discount_codes`
--

LOCK TABLES `discount_codes` WRITE;
/*!40000 ALTER TABLE `discount_codes` DISABLE KEYS */;
INSERT INTO `discount_codes` VALUES (1,'COMQUE10','Giảm 10% từ 100000đ','percent',10.00,100000.00,70000.00,0,0,1,NULL,NULL,'2026-05-30 19:32:54',NULL),(2,'FREESHIP','Giảm 20.000đ cho đơn từ 80.000đ','fixed',20000.00,80000.00,0.00,0,1,1,NULL,NULL,'2026-05-30 19:32:54',NULL),(3,'SHIP','Free ship','freeship',0.00,0.00,50000.00,0,3,1,NULL,NULL,'2026-06-02 16:22:01',NULL),(4,'111','1','fixed',50000.00,20000.00,100000.00,0,0,0,NULL,NULL,'2026-06-07 17:45:14','2026-06-08 00:45:22');
/*!40000 ALTER TABLE `discount_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dish_images`
--

DROP TABLE IF EXISTS `dish_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dish_images` (
  `image_id` int(11) NOT NULL AUTO_INCREMENT,
  `dish_id` int(11) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `is_main` tinyint(4) DEFAULT 0,
  `sort_order` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`image_id`),
  KEY `fk_dish_images_dish` (`dish_id`),
  CONSTRAINT `fk_dish_images_dish` FOREIGN KEY (`dish_id`) REFERENCES `dishes` (`dish_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dish_images`
--

LOCK TABLES `dish_images` WRITE;
/*!40000 ALTER TABLE `dish_images` DISABLE KEYS */;
INSERT INTO `dish_images` VALUES (4,16,'dish-main-1780902694928-2jodsm.webp',1,1,'2026-06-08 07:11:35'),(5,17,'dish-main-1780902766091-8lkrr9.webp',1,1,'2026-06-08 07:12:46'),(6,18,'dish-main-1780902836462-3dmb0n.webp',1,1,'2026-06-08 07:13:56'),(7,19,'dish-main-1780902885907-4nqt77.webp',1,1,'2026-06-08 07:14:46'),(8,20,'dish-main-1780902928240-qsta78.webp',1,1,'2026-06-08 07:15:28'),(9,21,'dish-main-1780902996296-ce6kyc.webp',1,1,'2026-06-08 07:16:36'),(10,22,'dish-main-1780903042676-ke8q5m.webp',1,1,'2026-06-08 07:17:23'),(11,23,'dish-main-1780903103945-qmfh1z.webp',1,1,'2026-06-08 07:18:24'),(12,24,'dish-main-1780903141125-89chnp.webp',1,1,'2026-06-08 07:19:01'),(13,25,'dish-main-1780903168042-coaojz.webp',1,1,'2026-06-08 07:19:28');
/*!40000 ALTER TABLE `dish_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dishes`
--

DROP TABLE IF EXISTS `dishes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dishes` (
  `dish_id` int(11) NOT NULL AUTO_INCREMENT,
  `dish_name` varchar(255) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `is_available` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`dish_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `dishes_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dishes`
--

LOCK TABLES `dishes` WRITE;
/*!40000 ALTER TABLE `dishes` DISABLE KEYS */;
INSERT INTO `dishes` VALUES (1,'Súp Tôm Chua Cay',1,55000.00,'sup-tom.jpg','Súp tôm kiểu Thái, vị chua cay đậm đà',1,'2026-05-10 16:19:14'),(2,'Gỏi Cuốn Tôm Thịt',1,15000.00,'goi-cuon.jpg','Gỏi cuốn tươi kèm nước chấm tương đen',1,'2026-05-10 16:19:14'),(3,'Phở Bò Tái Lăn',2,65000.00,'pho-bo.jpg','Phở bò truyền thống, thịt bò xào tái',1,'2026-05-10 16:19:14'),(4,'Cơm Tấm Sườn Bì Chả',2,50000.00,'com-tam.jpg','Cơm tấm đặc sản Sài Gòn',1,'2026-05-10 16:19:14'),(5,'Bún Chả Hà Nội',2,60000.00,'bun-cha.jpg','Thịt nướng than hoa ăn kèm bún tươi',1,'2026-05-10 16:19:14'),(6,'Pizza Hải Sản',2,185000.00,'pizza.jpg','Pizza đế mỏng, hải sản tươi và phô mai',1,'2026-05-10 16:19:14'),(7,'Bánh Flan Caramen',3,25000.00,'flan.jpg','Bánh flan mềm mịn, ngọt dịu',1,'2026-05-10 16:19:14'),(8,'Chè Thái Sầu Riêng',3,35000.00,'che-thai.jpg','Chè thập cẩm với sốt sầu riêng đặc biệt',1,'2026-05-10 16:19:14'),(9,'Trà Đào Cam Sả',4,45000.00,'tra-dao.jpg','Trà đào thanh mát giải nhiệt',1,'2026-05-10 16:19:14'),(10,'Cà Phê Muối',4,30000.00,'cf-muoi.jpg','Cà phê pha phin kết hợp kem muối béo ngậy',1,'2026-05-10 16:19:14'),(11,'Mì Ý Sốt Bò Bằm',2,75000.00,'spaghetti.jpg','Mì Ý truyền thống sốt Bolognese',1,'2026-05-10 16:19:14'),(16,'Bánh mì',2,25000.00,'dish-main-1780902694928-2jodsm.webp','Bánh mì kẹp nhân ở giữa. Rất nhiều chủng loại khác nhau tùy vào nhân',1,'2026-06-08 07:11:35'),(17,'Bánh mật',3,8000.00,'dish-main-1780902766091-8lkrr9.webp','Được làm từ bột gạo nếp trộn mật nhân đậu xanh gói lá chuối đồ bằng chõ',1,'2026-06-08 07:12:46'),(18,'Bánh khọt',1,5000.00,'dish-main-1780902836462-3dmb0n.webp','Được làm bằng bột gạo, có nhân tôm, được rán và ăn kèm với rau sống, ớt tươi, chấm nước sốt mắm tôm',1,'2026-06-08 07:13:56'),(19,'Bánh đúc',1,6000.00,'dish-main-1780902885907-4nqt77.webp','Làm bằng bột gạo (tại miền Bắc và miền Trung) hoặc bột năng (miền Nam) với nước vôi trong một số gia vị. Bánh được làm thành tấm to, khi ăn thì cắt nhỏ thành miếng tùy thích.',1,'2026-06-08 07:14:46'),(20,'Bò sốt vang',2,45000.00,'dish-main-1780902928240-qsta78.webp','Thịt bò được nấu với rau củ, rượu vang cho đặc sánh lại. Là món ẩm thực Pháp nhưng được Việt hóa và trở thành đặc trưng của Việt Nam',1,'2026-06-08 07:15:28'),(21,'Chè đỗ xanh',3,15000.00,'dish-main-1780902996296-ce6kyc.webp','Chè đỗ xanh nấu với đường và bột năng (hoặc bột sắn dây), có thể cho thêm dừa nạo và nước cốt dừa.',1,'2026-06-08 07:16:36'),(22,'Chè hạt sen',3,20000.00,'dish-main-1780903042676-ke8q5m.webp','Hạt sen được hấp chín, rồi nấu chung với đường cho đến khi sôi nhẹ thì khuấy thêm bột cho sánh.',1,'2026-06-08 07:17:23'),(23,'Nộm sứa',2,30000.00,'dish-main-1780903103945-qmfh1z.webp','Món nộm sử dụng nguyên liệu chính là sứa đã được sơ chế, trộn chua ngọt với các loại rau, thịt động vật và gia vị.',1,'2026-06-08 07:18:24'),(24,'Nước mía',4,10000.00,'dish-main-1780903141125-89chnp.webp','Thức uống giải khát được làm từ mía bằng phương pháp xay ép cây mía để lấy nước[',1,'2026-06-08 07:19:01'),(25,'Nước rau má',4,10000.00,'dish-main-1780903168042-coaojz.webp','Nước ép rau má đá pha với đường',1,'2026-06-08 07:19:28');
/*!40000 ALTER TABLE `dishes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `invoice_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_status` varchar(50) DEFAULT 'Paid',
  `invoice_date` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`invoice_id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `order_item_id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) DEFAULT NULL,
  `dish_id` int(11) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `price_at_time` decimal(10,2) NOT NULL,
  `combo_id` int(11) DEFAULT NULL,
  `is_combo` tinyint(1) DEFAULT 0,
  `item_name_snapshot` varchar(255) DEFAULT NULL,
  `image_snapshot` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`order_item_id`),
  KEY `order_id` (`order_id`),
  KEY `dish_id` (`dish_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`dish_id`) REFERENCES `dishes` (`dish_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (1,1,11,1,75000.00,NULL,0,'Mì Ý Sốt Bò Bằm','spaghetti.jpg'),(2,1,16,1,25000.00,NULL,0,'Bánh mì','dish-main-1780902694928-2jodsm.webp'),(3,2,9,3,45000.00,NULL,0,'Trà Đào Cam Sả','tra-dao.jpg');
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `order_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `order_status` enum('Pending','Preparing','Shipping','Completed','Cancelled') DEFAULT 'Pending',
  `note` text DEFAULT NULL,
  `order_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `receiver_name` varchar(100) DEFAULT NULL,
  `delivery_phone` varchar(20) DEFAULT NULL,
  `delivery_address` text DEFAULT NULL,
  `payment_method` varchar(20) DEFAULT 'COD',
  `delivery_lat` decimal(10,7) DEFAULT NULL,
  `delivery_lng` decimal(10,7) DEFAULT NULL,
  `payment_status` varchar(30) DEFAULT 'Unpaid',
  `payment_reference` varchar(80) DEFAULT NULL,
  `subtotal_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `shipping_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount_code` varchar(50) DEFAULT NULL,
  `discount_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `distance_km` decimal(8,2) NOT NULL DEFAULT 0.00,
  `shipping_discount_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`order_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,21,115000.00,'Completed','','2026-06-09 16:04:04','Đỗ Văn Ngọc','0913456789','Đường Nguyễn Văn Linh, Bần Yên Nhân, Phường Mỹ Hào, Phường Mỹ Hào','COD',20.9328526,106.0609362,'COD',NULL,100000.00,15000.00,NULL,0.00,0.38,0.00),(2,21,150000.00,'Pending','','2026-06-09 16:06:12','Đỗ Văn Ngọc','0913456789','Đường Nguyễn Văn Linh, Bần Yên Nhân, Phường Mỹ Hào, Phường Mỹ Hào','Banking',20.9323078,106.0617733,'WaitingConfirm','COMQUE DH 2',135000.00,15000.00,NULL,0.00,0.39,0.00);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `review_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `dish_id` int(11) DEFAULT NULL,
  `rating` tinyint(4) DEFAULT NULL CHECK (`rating` between 1 and 5),
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `order_id` int(11) DEFAULT NULL,
  `combo_id` int(11) DEFAULT NULL,
  `is_combo` tinyint(1) DEFAULT 0,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  `status` varchar(20) NOT NULL DEFAULT 'visible',
  PRIMARY KEY (`review_id`),
  KEY `user_id` (`user_id`),
  KEY `dish_id` (`dish_id`),
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`dish_id`) REFERENCES `dishes` (`dish_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `role_id` int(11) NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'Admin'),(3,'Client'),(2,'Staff');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES ('google_maps_api_key','AIzaSyARgIV7QBxrBD107-wyCYJB1OFw5PCASIg','2026-06-05 17:54:58'),('home_banner_image','/images/comque-sale-banner.jpg','2026-06-02 17:21:29'),('qr_account','0002046973782','2026-05-30 18:26:13'),('qr_bank','MB','2026-05-30 18:40:29'),('qr_bank_code','MB','2026-05-30 18:40:29'),('qr_bank_name','MBBank','2026-05-30 18:26:13'),('qr_image','','2026-05-30 18:40:29'),('qr_name','DO VAN NGOC','2026-05-30 18:26:13'),('qr_template','qr_only','2026-06-06 19:03:11'),('shipping_base_fee','15000','2026-05-30 20:47:12'),('shipping_base_km','5','2026-06-07 17:58:15'),('shipping_max_km','20','2026-06-07 17:58:15'),('shipping_per_km','3000','2026-05-30 20:47:12'),('shop_address','Tx Lạc Hồng Phúc/KĐT, Tx, P, Mỹ Hào, Hưng Yên ','2026-06-09 15:09:04'),('shop_lat','20.93558','2026-06-09 15:09:04'),('shop_lng','106.06307','2026-06-09 15:09:04');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `role_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `otp_code` varchar(10) DEFAULT NULL,
  `otp_expire` datetime DEFAULT NULL,
  `otp_attempts` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (14,'admin','$2b$10$7sewPyUoOIW2N8oUx3CUMerXWyvBFwnUV.iUZwAzhX/IBR6JkZ2K2','Đỗ Văn Ngọc','ngoc@gmail.com','0123456789','236 Hoàng Quốc Việt, Nghĩa Đô, Từ Liêm, Hà Nội',1,'2026-05-11 01:33:36',1,NULL,NULL,0),(21,'ngoc','$2b$10$Ftr8rE0o6lDN/BpnNjXTduR3gEP2JOXCO3c7OzNQOEmD1pbpIDxO.','Đỗ Văn Ngọc','ngocgaming2000@gmail.com','0913456789','Đường Nguyễn Văn Linh, Bần Yên Nhân, Phường Mỹ Hào, Phường Mỹ Hào',3,'2026-06-08 05:40:18',1,NULL,NULL,0),(22,'staff','$2b$10$RU8VTqB4BYJx2JV3B2ZZw.jUH5hNt5kgT94LIAQqDLPDDsCwVQN0.','Đoàn Nhật Anh','anh@gmail.com','0923456789',NULL,2,'2026-06-08 05:43:09',1,NULL,NULL,0);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `voucher_usages`
--

DROP TABLE IF EXISTS `voucher_usages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `voucher_usages` (
  `usage_id` int(11) NOT NULL AUTO_INCREMENT,
  `discount_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `used_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`usage_id`),
  UNIQUE KEY `uniq_voucher_user_order` (`discount_id`,`user_id`,`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `voucher_usages`
--

LOCK TABLES `voucher_usages` WRITE;
/*!40000 ALTER TABLE `voucher_usages` DISABLE KEYS */;
/*!40000 ALTER TABLE `voucher_usages` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-10 11:36:21
