-- Fase 7: para bases que ya existen. Correrla UNA sola vez (no borra datos).
-- En una instalación nueva alcanza con hospital_clinicas_tablas.sql, que ya trae estos cambios.
-- Antes de importar, seleccioná la base de datos (en phpMyAdmin: clic en la base, a la izquierda).
-- No dice "USE <base>" a propósito: en el servidor la base tiene otro nombre (por ejemplo db_core4).

-- numero_paciente: 6 cifras al azar que da el hospital al dar de alta (como el número de socio de una mutualista).
-- Con la cédula y este número el paciente crea su cuenta del portal
ALTER TABLE Paciente ADD COLUMN numero_paciente INT NULL AFTER id_ci;

-- a los pacientes que ya existían se les asigna uno al azar entre 100000 y 999999
UPDATE Paciente SET numero_paciente = FLOOR(100000 + RAND() * 900000) WHERE numero_paciente IS NULL;

-- si por casualidad dos quedaron con el mismo número, este paso da error de clave duplicada:
-- en ese caso volvé a correr el UPDATE de arriba (sin el WHERE) y después este ALTER
ALTER TABLE Paciente MODIFY numero_paciente INT NOT NULL, ADD UNIQUE KEY uq_paciente_numero (numero_paciente);
