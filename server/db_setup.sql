CREATE DATABASE IF NOT EXISTS `bbdd-escombrera`;
USE `bbdd-escombrera`;

CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS entidades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categoria_id INT,
    nombre VARCHAR(100) NOT NULL,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

CREATE TABLE IF NOT EXISTS movimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entidad_id INT,
    tipo_movimiento ENUM('Ingreso', 'Egreso') NOT NULL,
    material ENUM('Ramas', 'Tierra', 'Escombros') NOT NULL,
    volumen DECIMAL(10,2) NOT NULL,
    vehiculo_tipo VARCHAR(50),
    foto_path VARCHAR(255),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entidad_id) REFERENCES entidades(id)
);

-- Insertar categorías base
INSERT IGNORE INTO categorias (id, nombre) VALUES (1, 'Empresa Privada'), (2, 'Dependencia Municipal'), (3, 'Particular');

-- Insertar entidad "Particular" por defecto
INSERT IGNORE INTO entidades (categoria_id, nombre) VALUES (3, 'Consumidor Final');

-- Insertar listado de empresas privadas
INSERT IGNORE INTO entidades (categoria_id, nombre) VALUES 
(1, 'CONTE RIO'), (1, 'CONTE SOSA'), (1, 'DIEZ Y ASOC.'),
(1, 'CONTE RANQUEL'), (1, 'CONTE TETE'), (1, 'SUPER IMPERIO'),
(1, 'CONTE IMPERIO'), (1, 'LUNARDI'), (1, 'KUNZ'),
(1, 'CONTE FENIX'), (1, 'TECNAC S.R.L.'), (1, 'SCOPPA'),
(1, 'CONTE MIKI'), (1, 'CONTE ROLOTTI'), (1, 'DEMOLICIONES ARMANDO'),
(1, 'CONTE NORTE'), (1, 'CONTE TUTTI'), (1, 'M y G'),
(1, 'CONTE ALZACO'), (1, 'CONTE ARCE'), (1, 'H P. ELECTRONIC'),
(1, 'COTRECO'), (1, 'PEDRUEZA'), (1, 'CASALE'),
(1, 'INELSA'), (1, 'MANTELECTRIC'), (1, 'ELECTRO MONTAJE'),
(1, 'INCISA'), (1, 'OSVALDO GONZALEZ'), (1, 'ATOMO'),
(1, 'CORRALON GUEMES');
