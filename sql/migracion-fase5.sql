-- Fase 5: para bases que ya existen. Correrla UNA sola vez (no borra datos).
-- En una instalación nueva alcanza con hospital_clinicas_tablas.sql, que ya trae estos cambios.
-- Antes de importar, seleccioná la base de datos (en phpMyAdmin: clic en la base, a la izquierda).
-- No dice "USE <base>" a propósito: en el servidor la base tiene otro nombre (por ejemplo db_core4).

-- token: 32 caracteres al azar que van en la URL del QR (documento-publico.html?t=...),
-- así no se pueden recorrer los documentos probando ?id=1, ?id=2...
ALTER TABLE Codigo_qr ADD COLUMN token CHAR(32) NULL AFTER codigo;

-- los documentos que ya existían reciben su token (UUID y RAND cambian en cada fila)
UPDATE Codigo_qr SET token = LEFT(SHA2(CONCAT(UUID(), RAND(), id_qr), 256), 32) WHERE token IS NULL;

-- la URL guardada pasa a usar el token en vez del id. Las muy viejas (de la estructura anterior,
-- tipo modulos/folleto_publico/ver.php?id=1) no tienen "documento-publico.html": esas quedan relativas.
-- (es solo informativa: el sistema arma la URL del QR a partir del token)
UPDATE Codigo_qr
SET url = IF(LOCATE('documento-publico.html', url) > 0,
             CONCAT(SUBSTRING_INDEX(url, 'documento-publico.html', 1), 'documento-publico.html?t=', token),
             CONCAT('paginas/documento-publico.html?t=', token));

ALTER TABLE Codigo_qr MODIFY token CHAR(32) NOT NULL, ADD UNIQUE KEY uq_codigo_qr_token (token);
