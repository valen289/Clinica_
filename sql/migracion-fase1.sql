-- Fase 1: para bases que ya existen (no borra datos).
-- En una instalación nueva alcanza con hospital_clinicas_tablas.sql, que ya trae esta tabla.
USE hospital_clinicas;

-- Intentos de login fallidos: auth-login.php bloquea un rato a un usuario+IP con demasiados fallos
CREATE TABLE IF NOT EXISTS Intento_login (
    id_intento INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(40) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    fecha DATETIME NOT NULL,

    INDEX idx_intento_usuario_ip (usuario, ip, fecha)
);
