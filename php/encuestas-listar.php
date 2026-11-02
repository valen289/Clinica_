<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion(['Chofer']);

require_once __DIR__ . '/conexion.php';

// "respuestas" = cuántos pacientes distintos la respondieron (cada uno deja una fila por pregunta)
$sql = "SELECT e.id_encuesta, e.titulo, e.descripcion, e.fecha_creacion, e.fecha_cierre, e.estado,
               (e.fecha_cierre IS NOT NULL AND e.fecha_cierre < CURDATE()) AS vencida,
               CONCAT(f.nombre, ' ', f.apellido) AS creada_por,
               (SELECT COUNT(*) FROM Pregunta p WHERE p.id_encuesta = e.id_encuesta) AS preguntas,
               (SELECT COUNT(DISTINCT r.id_ci) FROM Respuesta r
                INNER JOIN Pregunta p ON p.id_pregunta = r.id_pregunta
                WHERE p.id_encuesta = e.id_encuesta) AS respuestas
        FROM Encuesta e
        INNER JOIN Funcionario f ON f.id_funcionario = e.id_funcionario
        ORDER BY e.id_encuesta DESC";
$encuestas = filas($con->query($sql));

// promedio de todas las calificaciones del 1 al 5 y cuántas encuestas se respondieron este mes
$promedio = $con->query("SELECT AVG(CAST(r.respuesta_texto AS UNSIGNED)) AS promedio
                         FROM Respuesta r INNER JOIN Pregunta p ON p.id_pregunta = r.id_pregunta
                         WHERE p.tipo_pregunta = 'escala'")->fetch_assoc()['promedio'];
$respuestas_mes = $con->query("SELECT COUNT(DISTINCT r.id_ci, p.id_encuesta) AS total
                               FROM Respuesta r INNER JOIN Pregunta p ON p.id_pregunta = r.id_pregunta
                               WHERE r.fecha_respuesta >= DATE_FORMAT(CURDATE(), '%Y-%m-01')")->fetch_assoc()['total'];

echo json_encode([
    'exito' => true,
    'datos' => [
        'encuestas' => $encuestas,
        'promedio_calificacion' => $promedio !== null ? round((float) $promedio, 1) : null,
        'respuestas_mes' => (int) $respuestas_mes,
    ],
]);
$con->close();
