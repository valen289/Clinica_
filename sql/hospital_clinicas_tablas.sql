CREATE DATABASE IF NOT EXISTS hospital_clinicas;
USE hospital_clinicas;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS Respuesta;
DROP TABLE IF EXISTS Pregunta;
DROP TABLE IF EXISTS Encuesta;
DROP TABLE IF EXISTS Traslado;
DROP TABLE IF EXISTS Paciente;
DROP TABLE IF EXISTS Codigo_qr;
DROP TABLE IF EXISTS Instruccion;
DROP TABLE IF EXISTS Documento;
DROP TABLE IF EXISTS Ruta;
DROP TABLE IF EXISTS Elemento_traslado;
DROP TABLE IF EXISTS Acompaniante;
DROP TABLE IF EXISTS Conductor;
DROP TABLE IF EXISTS Ambulancia;
DROP TABLE IF EXISTS Funcionario;

CREATE TABLE Funcionario (
    id_funcionario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    email VARCHAR(40) NOT NULL,
    usuario VARCHAR(40) NOT NULL,
    contrasenia VARCHAR(255) NOT NULL,
    rol VARCHAR(30) NOT NULL,
    ci VARCHAR(20) UNIQUE
);

CREATE TABLE Ambulancia (
    id_ambulancia INT AUTO_INCREMENT PRIMARY KEY,
    matricula VARCHAR(20) NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(40) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'Disponible'
);

CREATE TABLE Conductor (
    id_ci INT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL,
    apellido VARCHAR(30) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'Activo'
);

CREATE TABLE Acompaniante (
    id_ci INT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL,
    apellido VARCHAR(30) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'Acompañante Médico',
    estado VARCHAR(30) NOT NULL DEFAULT 'Activo'
);

CREATE TABLE Elemento_traslado (
    id_elemento INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(30) NOT NULL,
    descripcion VARCHAR(100),
    observaciones VARCHAR(500)
);

CREATE TABLE Ruta (
    id_ruta INT AUTO_INCREMENT PRIMARY KEY,
    origen VARCHAR(150) NOT NULL,
    destino VARCHAR(150) NOT NULL,
    distancia DECIMAL(10,2),
    descripcion VARCHAR(500),
    nombre_ruta VARCHAR(150)
);

CREATE TABLE Documento (
    id_documento INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(50) NOT NULL,
    descripcion TEXT,
    archivo VARCHAR(150) NOT NULL,
    fecha_carga DATE,
    departamento VARCHAR(100),
    id_funcionario INT NOT NULL,

    CONSTRAINT fk_documento_funcionario
        FOREIGN KEY (id_funcionario)
        REFERENCES Funcionario(id_funcionario)
);

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

CREATE TABLE Codigo_qr (
    id_qr INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(150) NOT NULL,
    url VARCHAR(200) NOT NULL,
    id_documento INT NOT NULL UNIQUE,

    CONSTRAINT fk_qr_documento
        FOREIGN KEY (id_documento)
        REFERENCES Documento(id_documento)
);

CREATE TABLE Paciente (
    id_ci INT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    telefono VARCHAR(70),
    direccion VARCHAR(60),
    fecha_nacimiento DATE,
    id_qr INT,

    CONSTRAINT fk_paciente_qr
        FOREIGN KEY (id_qr)
        REFERENCES Codigo_qr(id_qr)
);

CREATE TABLE Encuesta (
    id_encuesta INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(100) NOT NULL,
    descripcion VARCHAR(100),
    fecha_creacion DATE,
    fecha_cierre DATE,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    id_funcionario INT NOT NULL,

    CONSTRAINT fk_encuesta_funcionario
        FOREIGN KEY (id_funcionario)
        REFERENCES Funcionario(id_funcionario)
);

CREATE TABLE Pregunta (
    id_pregunta INT AUTO_INCREMENT PRIMARY KEY,
    id_encuesta INT NOT NULL,
    texto_pregunta VARCHAR(200) NOT NULL,
    tipo_pregunta VARCHAR(30) NOT NULL,

    CONSTRAINT fk_pregunta_encuesta
        FOREIGN KEY (id_encuesta)
        REFERENCES Encuesta(id_encuesta)
);

CREATE TABLE Respuesta (
    id_respuesta INT AUTO_INCREMENT PRIMARY KEY,
    id_pregunta INT NOT NULL,
    id_ci INT NOT NULL,
    respuesta_texto VARCHAR(500) NOT NULL,
    fecha_respuesta DATE,

    CONSTRAINT fk_respuesta_pregunta
        FOREIGN KEY (id_pregunta)
        REFERENCES Pregunta(id_pregunta),

    CONSTRAINT fk_respuesta_paciente
        FOREIGN KEY (id_ci)
        REFERENCES Paciente(id_ci)
);

CREATE TABLE Traslado (
    id_traslado INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE,
    hora_salida TIME,
    hora_llegada TIME,
    estado VARCHAR(30) NOT NULL DEFAULT 'Preparado',
    id_ambulancia INT NOT NULL,
    id_conductor INT NOT NULL,
    id_acompanante INT,
    id_elemento INT,
    id_ruta INT NOT NULL,
    id_paciente INT NULL,
    id_funcionario INT NOT NULL,

    CONSTRAINT fk_traslado_ambulancia
        FOREIGN KEY (id_ambulancia)
        REFERENCES Ambulancia(id_ambulancia),

    CONSTRAINT fk_traslado_conductor
        FOREIGN KEY (id_conductor)
        REFERENCES Conductor(id_ci),

    CONSTRAINT fk_traslado_acompanante
        FOREIGN KEY (id_acompanante)
        REFERENCES Acompaniante(id_ci),

    CONSTRAINT fk_traslado_elemento
        FOREIGN KEY (id_elemento)
        REFERENCES Elemento_traslado(id_elemento),

    CONSTRAINT fk_traslado_ruta
        FOREIGN KEY (id_ruta)
        REFERENCES Ruta(id_ruta),

    CONSTRAINT fk_traslado_paciente
        FOREIGN KEY (id_paciente)
        REFERENCES Paciente(id_ci),

    CONSTRAINT fk_traslado_funcionario
        FOREIGN KEY (id_funcionario)
        REFERENCES Funcionario(id_funcionario)
);

SET FOREIGN_KEY_CHECKS = 1;

-- Usuario administrador inicial para poder loguearse (usuario / contraseña: admin_clinicas / admin123)
INSERT INTO Funcionario (nombre, apellido, email, usuario, rol, ci, contrasenia)
VALUES ('Admin Clínicas', 'Clínicas', 'admin@hospitalclinicas.uy', 'admin_clinicas', 'Administrador', '1.234.567-8', '$2y$10$vDWjkj7cwAqVwjHCSi/efuonbnrDZdeiw/AIh.v/6pfLx0qLQIc62');
