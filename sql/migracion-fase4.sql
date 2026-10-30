-- Fase 4: para bases que ya existen. Correrla UNA sola vez (no borra datos).
-- En una instalación nueva alcanza con hospital_clinicas_tablas.sql, que ya trae estos cambios.
-- Antes de importar, seleccioná la base de datos (en phpMyAdmin: clic en la base, a la izquierda).
-- No dice "USE <base>" a propósito: en el servidor la base tiene otro nombre (por ejemplo db_core4).

-- acceso al portal del paciente: contraseña y código de activación se guardan hasheados
ALTER TABLE Paciente
    ADD COLUMN contrasenia VARCHAR(255) NULL,
    ADD COLUMN codigo_activacion VARCHAR(255) NULL,
    ADD COLUMN codigo_vence DATETIME NULL,
    ADD COLUMN cuenta_activada DATETIME NULL,
    ADD COLUMN ultimo_ingreso DATETIME NULL;
