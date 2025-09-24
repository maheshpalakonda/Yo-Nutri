-- This script can be run to set up the database from scratch or to update an existing one.
-- If you are updating an existing database, you may see "Duplicate column name" errors. These are expected and can be safely ignored.

-- Create database
CREATE DATABASE IF NOT EXISTS Yono;
USE Yono;

-- Categories table with hierarchical parent_id for subcategories
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    UNIQUE KEY unique_name_parent (name, parent_id)
);

-- Flavors table
CREATE TABLE IF NOT EXISTS flavors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id INT,
    description TEXT,
    base_price DECIMAL(10,2),
    image_url VARCHAR(255),
    hsn_code VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Product variants table
CREATE TABLE IF NOT EXISTS product_variants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    flavor_id INT,
    grams INT,
    price DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (flavor_id) REFERENCES flavors(id) ON DELETE SET NULL
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(15),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    shipping_address TEXT,
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_pincode VARCHAR(10),
    shipping_phone VARCHAR(15),
    payment_method VARCHAR(50),
    shipping_charges DECIMAL(10,2) DEFAULT 0,
    tracking_number VARCHAR(50),
    shipping_status VARCHAR(50) DEFAULT 'pending',
    shiprocket_order_id VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_variant_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

-- Coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type ENUM('flat', 'percent') NOT NULL DEFAULT 'flat',
    discount_amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    expiry_date DATE DEFAULT NULL,
    usage_limit INT DEFAULT NULL,
    minimum_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -- Testimonials table
-- CREATE TABLE IF NOT EXISTS testimonials (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     image_url VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
-- 
-- Hero images table
-- CREATE TABLE IF NOT EXISTS hero_images (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     image_url VARCHAR(255) NOT NULL,
--     alt_text VARCHAR(255),
--     image_type ENUM('desktop', 'mobile') NOT NULL DEFAULT 'desktop',
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Insert original data from front end files

-- Insert categories with parent-child hierarchy
INSERT IGNORE INTO categories (id, name, parent_id) VALUES
(1, 'Peanut Butter', NULL),
(2, 'Creamy', 1),
(3, 'Crunchy', 1),
(4, 'Chocolate Energy Bars', NULL),
(5, 'Roasted Energy Bars', NULL),
(6, 'Protein & Nut Bars', NULL);

-- Insert flavors
INSERT IGNORE INTO flavors (id, name) VALUES
(1, 'Dark Chocolate'),
(2, 'Dates'),
(3, 'Jaggery'),
(4, 'Unsweetened');

-- Insert products with category_id pointing to subcategories
INSERT IGNORE INTO products (name, category_id, description, base_price, image_url, hsn_code) VALUES
('Creamy Dark Chocolate Peanut Butter', 2, 'Smooth and creamy peanut butter with dark chocolate flavor', 299.00, 'images/CREAMY_Dark_Chocolate-removebg-preview.png', '20081100'),
('Creamy Dates Peanut Butter', 2, 'Smooth and creamy peanut butter with dates', 299.00, 'images/CREAMY_Dates-removebg-preview.png', '20081100'),
('Creamy Jaggery Peanut Butter', 2, 'Smooth and creamy peanut butter with jaggery', 299.00, 'images/CREAMY_Jaggery-removebg-preview.png', '20081100'),
('Creamy Unsweetened Peanut Butter', 2, 'Smooth and creamy unsweetened peanut butter', 299.00, 'images/CREAMY_Unsweetened-removebg-preview.png', '20081100'),
('Crunchy Dark Chocolate Peanut Butter', 3, 'Crunchy peanut butter with dark chocolate flavor', 299.00, 'images/CRUNCHY_Dark_Chocolate-removebg-preview.png', '20081100'),
('Crunchy Dates Peanut Butter', 3, 'Crunchy peanut butter with dates', 299.00, 'images/CRUNCHY_Dates-removebg-preview.png', '20081100'),
('Crunchy Jaggery Peanut Butter', 3, 'Crunchy peanut butter with jaggery', 299.00, 'images/CRUNCHY_Jaggery-removebg-preview.png', '20081100'),
('Crunchy Unsweetened Peanut Butter', 3, 'Crunchy unsweetened peanut butter', 299.00, 'images/CRUNCHY_Unsweetened-removebg-preview.png', '20081100'),
('Apricot Bars', 4, 'Chocolate energy bar with apricot', NULL, 'images/chocolate1.png', '17049090'),
('Peanut & Almond Bars', 4, 'Chocolate energy bar with peanut and almond', NULL, 'images/chocolate4.png', '17049090'),
('Coconut Bars', 4, 'Chocolate energy bar with coconut', NULL, 'images/chocolate7.jpg', '17049090'),
('Salted Caramel Bars', 4, 'Chocolate energy bar with salted caramel', NULL, 'images/chocolate8.jpg', '17049090'),
('Mixed Nuts Bars', 4, 'Chocolate energy bar with mixed nuts', NULL, 'images/chocolate9.jpg', '17049090'),
('Roasted Mixed Berry Bars', 5, 'Roasted energy bar with mixed berry', NULL, 'images/roasted6.jpg', '17049090'),
('Roasted Milk Choc Bars', 5, 'Roasted energy bar with milk chocolate', NULL, 'images/roasted7.jpg', '17049090'),
('Roasted Nut & Seeds Bars', 5, 'Roasted energy bar with nuts and seeds', NULL, 'images/roasted8.jpg', '17049090'),
('Roasted White Choc Bars', 5, 'Roasted energy bar with white chocolate', NULL, 'images/roasted9.jpg', '17049090'),
('Roasted Assorted Bars', 5, 'Roasted energy bar assorted', NULL, 'images/roasted10.jpg', '17049090'),
('Protein Apricot Bars', 6, 'Protein bar with apricot', NULL, 'images/protein1.png', '21069099'),
('Protein Peanut & Almond Bars', 6, 'Protein bar with peanut and almond', NULL, 'images/protein2.png', '21069099'),
('Protein Coconut Bars', 6, 'Protein bar with coconut', NULL, 'images/protein3.png', '21069099'),
('Nut Butter Salted Caramel', 6, 'Nut butter bar with salted caramel', NULL, 'images/nut butter1.png', '21069099'),
('Nut Butter Mixed Nuts', 6, 'Nut butter bar with mixed nuts', NULL, 'images/nut butter2.png', '21069099');

-- Insert product variants
INSERT IGNORE INTO product_variants (product_id, flavor_id, grams, price, stock) VALUES
(1, 1, 350, 299.00, 50),
(1, 1, 950, 599.00, 20),
(2, 2, 350, 299.00, 50),
(2, 2, 950, 599.00, 20),
(3, 3, 350, 299.00, 50),
(3, 3, 950, 599.00, 20),
(4, 4, 350, 299.00, 50),
(4, 4, 950, 599.00, 20),
(5, 1, 350, 299.00, 50),
(5, 1, 950, 599.00, 20),
(6, 2, 350, 299.00, 50),
(6, 2, 950, 599.00, 20),
(7, 3, 350, 299.00, 50),
(7, 3, 950, 599.00, 20),
(8, 4, 350, 299.00, 50),
(8, 4, 950, 599.00, 20);

-- -- Insert testimonials
-- INSERT IGNORE INTO testimonials (image_url) VALUES
-- ('images/testimonial4.png'),
-- ('images/testimonial3.jpg'),
-- ('images/Testimonial2.jpg'),
-- ('images/testimonial1.png');

INSERT IGNORE INTO coupons (code, discount_type, discount_amount, description, expiry_date, minimum_amount) VALUES
('YUMMY', 'flat', 10.00, 'Get ₹10 off with code YUMMY Orders dispatch between 24-48 hours', '2026-02-28', 0.00),
('CLEANSNACK', 'flat', 15.00, '₹15 off over ₹1000 Use code CLEANSNACK', '2026-02-28', 1000.00);

-- Insert default admin user
INSERT IGNORE INTO admins (email, phone, password_hash) VALUES
('admin@yonutri.com', '7386691910', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');


-- ShipRocket Integration Tables

-- Table to store ShipRocket order mappings
CREATE TABLE IF NOT EXISTS shiprocket_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    shiprocket_order_id VARCHAR(50) UNIQUE,
    shiprocket_shipment_id VARCHAR(50),
    shiprocket_awb VARCHAR(50),
    shiprocket_courier_name VARCHAR(100),
    shiprocket_tracking_url VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Table to store ShipRocket pickup requests
CREATE TABLE IF NOT EXISTS shiprocket_pickups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pickup_request_id VARCHAR(50) UNIQUE,
    pickup_location VARCHAR(100),
    pickup_date DATE,
    pickup_time TIME,
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table to store ShipRocket courier serviceability
CREATE TABLE IF NOT EXISTS shiprocket_couriers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    courier_id INT,
    courier_name VARCHAR(100),
    pickup_pincode VARCHAR(10),
    delivery_pincode VARCHAR(10),
    weight DECIMAL(5,2),
    cod_amount DECIMAL(10,2) DEFAULT 0,
    freight_charge DECIMAL(10,2),
    cod_charge DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--     pickup_date DATE,
--     pickup_time TIME,
--     status VARCHAR(50) DEFAULT 'scheduled',
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
-- );

-- Table to store ShipRocket courier serviceability
-- CREATE TABLE IF NOT EXISTS shiprocket_couriers (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     courier_id INT,
--     courier_name VARCHAR(100),
--     pickup_pincode VARCHAR(10),
--     delivery_pincode VARCHAR(10),
--     weight DECIMAL(5,2),
--     cod_amount DECIMAL(10,2) DEFAULT 0,
--     freight_charge DECIMAL(10,2),
--     cod_charge DECIMAL(10,2),
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
