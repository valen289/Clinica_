<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion(['Chofer']);

require_once __DIR__ . '/conexion.php';

function responder_error($mensaje) {
    http_response_code(422);
    echo json_encode(['exito' => false, 'error' => $mensaje]);
    exit;
}

// cerrar (los pacientes dejan de verla), reabrir, o eliminar (solo si nadie la respondió)
$accion = $_POST['accion'] ?? '';
$id_encuesta = (int) ($_POST['id_encuesta'] ?? 0);

$stmt = $con->prepare("SELECT (SELECT COUNT(*) FROM Respuesta r INNER JOIN Pregunta p ON p.id_pregunta = r.id_pregunta
                                WHERE p.id_encuesta = e.id_encuesta) AS respuestas
                       FROM Encuesta e WHERE e.id_encuesta = ?");
$stmt->bind_param("i", $id_encuesta);
$stmt->execute();
$encuesta = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$encuesta) {
    responder_error('La encuesta no existe.');
}

if ($accion === 'cerrar' || $accion === 'reabrir') {
    $estado = $accion === 'reabrir' ? 1 : 0;
    $stmt = $con->prepare("UPDATE Encuesta SET estado = ? WHERE id_encuesta = ?");
    $stmt->bind_param("ii", $estado, $id_encuesta);
    $stmt->execute();
    $stmt->close();
} elseif ($accion === 'eliminar') {
    // con respuestas no se borra: se perderían los resultados. Para que no se responda más, se cierra
    if ((int) $encuesta['respuestas'] > 0) {
        responder_error('No se puede eliminar una encuesta que ya tiene respuestas. Podés cerrarla.');
    }
    $stmt = $con->prepare("DELETE FROM Pregunta WHERE id_encuesta = ?");
    $stmt->bind_param("i", $id_encuesta);
    $stmt->execute();
    $stmt->close();

    $stmt = $con->prepare("DELETE FROM Encuesta WHERE id_encuesta = ?");
    $stmt->bind_param("i", $id_encuesta);
    $stmt->execute();
    $stmt->close();
} else {
    responder_error('Acción no válida.');
}

echo json_encode(['exito' => true]);
$con->close();
