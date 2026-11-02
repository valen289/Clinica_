-- Fase 6: para bases que ya existen. Correrla UNA sola vez (no borra datos).
-- En una instalación nueva alcanza con hospital_clinicas_tablas.sql, que ya trae estos cambios.
-- Antes de importar, seleccioná la base de datos (en phpMyAdmin: clic en la base, a la izquierda).
-- No dice "USE <base>" a propósito: en el servidor la base tiene otro nombre (por ejemplo db_core4).

-- cada paciente responde cada pregunta una sola vez (lo controla la base, no solo el PHP)
ALTER TABLE Respuesta ADD UNIQUE KEY uq_respuesta_pregunta_paciente (id_pregunta, id_ci);

-- Encuesta de satisfacción inicial (las preguntas de la página vieja), a nombre del primer funcionario.
-- tipo_pregunta: 'escala' (calificación del 1 al 5), 'si_no' o 'texto' (respuesta libre)
INSERT INTO Encuesta (titulo, descripcion, fecha_creacion, fecha_cierre, estado, id_funcionario)
SELECT 'Encuesta de satisfacción', 'Contanos cómo fue tu atención en el hospital.', CURDATE(), NULL, TRUE, MIN(id_funcionario)
FROM Funcionario;

SET @id_encuesta = LAST_INSERT_ID();
INSERT INTO Pregunta (id_encuesta, texto_pregunta, tipo_pregunta) VALUES
    (@id_encuesta, '¿Cómo calificarías la atención que recibiste?', 'escala'),
    (@id_encuesta, '¿El personal te explicó claramente tus indicaciones?', 'si_no'),
    (@id_encuesta, '¿Recomendarías el Hospital de Clínicas a un familiar o amigo?', 'si_no'),
    (@id_encuesta, '¿Qué podríamos mejorar?', 'texto');
