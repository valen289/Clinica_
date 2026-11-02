<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
$ci = requerir_paciente();

require_once __DIR__ . '/conexion.php';

$id_encuesta = (int) ($_GET['id'] ?? 0);

// disponible = abierta y sin fecha de cierre vencida; ya_respondio = el paciente dejó alguna respuesta
$stmt = $con->prepare("SELECT e.id_encuesta, e.titulo, e.descripcion,
                              (e.estado = 1 AND (e.fecha_cierre IS NULL OR e.fecha_cierre >= CURDATE())) AS disponible,
                              EXISTS(SELECT 1 FROM Respuesta r INNER JOIN Pregunta p ON p.id_pregunta = r.id_pregunta
                                     WHERE p.id_encuesta = e.id_encuesta AND r.id_ci = ?) AS ya_respondio
                       FROM Encuesta e WHERE e.id_encuesta = ?");
$stmt->bind_param("ii", $ci, $id_encuesta);
$stmt->execute();
$encuesta = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$encuesta) {
    echo json_encode(['exito' => true, 'datos' => null]);
    $con->close();
    exit;
}

$stmt = $con->prepare("SELECT id_pregunta, texto_pregunta, tipo_pregunta FROM Pregunta WHERE id_encuesta = ? ORDER BY id_pregunta");
$stmt->bind_param("i", $id_encuesta);
$stmt->execute();
$encuesta['preguntas'] = filas($stmt->get_result());
$stmt->close();

echo json_encode(['exito' => true, 'datos' => $encuesta]);
$con->close();
