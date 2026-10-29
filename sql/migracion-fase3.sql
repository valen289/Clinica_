-- Fase 3: para bases que ya existen. Correrla UNA sola vez (no borra datos).
-- En una instalación nueva alcanza con hospital_clinicas_tablas.sql, que ya trae estos cambios.
USE hospital_clinicas;

-- El código QR es de cada documento, no del paciente: la columna id_qr no se usaba en ningún lado
ALTER TABLE Paciente DROP FOREIGN KEY fk_paciente_qr;
ALTER TABLE Paciente DROP COLUMN id_qr;

ALTER TABLE Paciente
    ADD COLUMN email VARCHAR(80) NULL AFTER telefono,
    ADD COLUMN fecha_alta DATE NULL;

-- Estudios y análisis de cada paciente. El PDF va en /estudios/ (carpeta cerrada al público)
-- y solo se entrega a través de php/estudio-archivo.php
CREATE TABLE Estudio (
    id_estudio INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT NOT NULL,
    tipo VARCHAR(40) NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    fecha_estudio DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
    archivo VARCHAR(150) NOT NULL DEFAULT '',
    observaciones VARCHAR(500),
    fecha_carga DATETIME NOT NULL,
    id_funcionario INT NOT NULL,

    CONSTRAINT fk_estudio_paciente
        FOREIGN KEY (id_paciente)
        REFERENCES Paciente(id_ci),

    CONSTRAINT fk_estudio_funcionario
        FOREIGN KEY (id_funcionario)
        REFERENCES Funcionario(id_funcionario)
);

-- Documentos de pautas que el personal le asignó a cada paciente
CREATE TABLE Paciente_documento (
    id_paciente INT NOT NULL,
    id_documento INT NOT NULL,
    fecha_asignacion DATE NOT NULL,
    id_funcionario INT NOT NULL,

    PRIMARY KEY (id_paciente, id_documento),

    CONSTRAINT fk_pacdoc_paciente
        FOREIGN KEY (id_paciente)
        REFERENCES Paciente(id_ci),

    CONSTRAINT fk_pacdoc_documento
        FOREIGN KEY (id_documento)
        REFERENCES Documento(id_documento),

    CONSTRAINT fk_pacdoc_funcionario
        FOREIGN KEY (id_funcionario)
        REFERENCES Funcionario(id_funcionario)
);
