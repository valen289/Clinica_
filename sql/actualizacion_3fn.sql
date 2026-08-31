-- Script de actualizacion incremental sobre una base ya existente
-- (creada con la version anterior de hospital_clinicas_tablas.sql).
-- NO borra tablas ni datos. Ejecutar una sola vez por base de datos.

USE hospital_clinicas;

ALTER TABLE Funcionario
ADD COLUMN contrasenia VARCHAR(255) NOT NULL;

-- Funcionario: apellido y CI para CU-02
ALTER TABLE Funcionario
ADD COLUMN apellido VARCHAR(50) NOT NULL,
ADD COLUMN ci VARCHAR(20) UNIQUE;

UPDATE Funcionario
SET apellido = 'Clínicas', ci = '1.234.567-8'
WHERE usuario = 'admin_clinicas';

-- Documento: categoría clínica
ALTER TABLE Documento
ADD COLUMN departamento VARCHAR(100);

-- Instrucciones/pautas de un documento (1:N)
CREATE TABLE Instruccion (
    id_instruccion INT AUTO_INCREMENT PRIMARY KEY,
    id_documento INT NOT NULL,
    orden INT NOT NULL,
    texto_instruccion TEXT NOT NULL,
    es_pauta_alarma BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_instruccion_documento
        FOREIGN KEY (id_documento)
        REFERENCES Documento(id_documento)
);

-- Ambulancia: estado multivalor (Disponible / Mantenimiento / Fuera de Servicio)
ALTER TABLE Ambulancia
MODIFY COLUMN estado VARCHAR(30) NOT NULL DEFAULT 'Disponible';

UPDATE Ambulancia SET estado = 'Disponible' WHERE estado = '1';
UPDATE Ambulancia SET estado = 'Fuera de Servicio' WHERE estado = '0';

-- Conductor: estado multivalor (Activo / De Licencia)
ALTER TABLE Conductor
MODIFY COLUMN estado VARCHAR(30) NOT NULL DEFAULT 'Activo';

UPDATE Conductor SET estado = 'Activo' WHERE estado = '1';
UPDATE Conductor SET estado = 'De Licencia' WHERE estado = '0';

-- Acompaniante: rol y estado (no existían)
ALTER TABLE Acompaniante
ADD COLUMN rol VARCHAR(50) NOT NULL DEFAULT 'Acompañante Médico',
ADD COLUMN estado VARCHAR(30) NOT NULL DEFAULT 'Activo';

-- Ruta: nombre del trayecto
ALTER TABLE Ruta
ADD COLUMN nombre_ruta VARCHAR(150);

-- Traslado: estado multivalor + vínculo opcional a Paciente
ALTER TABLE Traslado
MODIFY COLUMN estado VARCHAR(30) NOT NULL DEFAULT 'Preparado';

UPDATE Traslado SET estado = 'En Tránsito' WHERE estado = '1';
UPDATE Traslado SET estado = 'Completado' WHERE estado = '0';

ALTER TABLE Traslado
ADD COLUMN id_paciente INT NULL,
ADD CONSTRAINT fk_traslado_paciente
    FOREIGN KEY (id_paciente)
    REFERENCES Paciente(id_ci);

-- Paciente: apellido y fecha de nacimiento para CU-15
ALTER TABLE Paciente
ADD COLUMN apellido VARCHAR(50) NOT NULL,
ADD COLUMN fecha_nacimiento DATE;

-- Encuesta: fecha de cierre para CU-06
ALTER TABLE Encuesta
ADD COLUMN fecha_cierre DATE;
