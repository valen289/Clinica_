<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
// la cédula sale de la sesión: un paciente solo puede responder a su nombre
$ci = requerir_paciente();

require_once __DIR__ . '/conexion.php';

function responder_error($mensaje) {
    http_response_code(422);
    echo json_encode(['exito' => false, 'error' => $mensaje]);
    exit;
}

$id_encuesta = (int) ($_POST['id_encuesta'] ?? 0);
// respuestas[id_pregunta] = valor
$respuestas = (array) ($_POST['respuestas'] ?? []);

$stmt = $con->prepare("SELECT (estado = 1 AND (fecha_cierre IS NULL OR fecha_cierre >= CURDATE())) AS disponible,
                              EXISTS(SELECT 1 FROM Respuesta r INNER JOIN Pregunta p ON p.id_pregunta = r.id_pregunta
                                     WHERE p.id_encuesta = Encuesta.id_encuesta AND r.id_ci = ?) AS ya_respondio
                       FROM Encuesta WHERE id_encuesta = ?");
$stmt->bind_param("ii", $ci, $id_encuesta);
$stmt->execute();
$encuesta = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$encuesta || !$encuesta['disponible']) {
    responder_error('Esta encuesta ya no está disponible.');
}
if ($encuesta['ya_respondio']) {
    responder_error('Ya respondiste esta encuesta. ¡Gracias!');
}

$stmt = $con->prepare("SELECT id_pregunta, tipo_pregunta FROM Pregunta WHERE id_encuesta = ? ORDER BY id_pregunta");
$stmt->bind_param("i", $id_encuesta);
$stmt->execute();
$preguntas = filas($stmt->get_result());
$stmt->close();

// se valida cada pregunta según su tipo; las de texto libre son opcionales
$a_guardar = [];
foreach ($preguntas as $pregunta) {
    $valor = trim((string) ($respuestas[$pregunta['id_pregunta']] ?? ''));

    if ($pregunta['tipo_pregunta'] === 'escala') {
        if (!in_array($valor, ['1', '2', '3', '4', '5'], true)) {
            responder_error('Elegí una calificación del 1 al 5 en cada pregunta.');
        }
    } elseif ($pregunta['tipo_pregunta'] === 'si_no') {
        if (!in_array($valor, ['Sí', 'No'], true)) {
            responder_error('Respondé Sí o No en cada pregunta.');
        }
    } else {
        if (mb_strlen($valor) > 500) {
            responder_error('Los comentarios pueden tener hasta 500 caracteres.');
        }
        if ($valor === '') {
            continue;
        }
    }
    $a_guardar[] = [(int) $pregunta['id_pregunta'], $valor];
}

if (!$a_guardar) {
    responder_error('Respondé al menos una pregunta.');
}

// todas las respuestas juntas: o se guarda la encuesta entera o nada
$con->begin_transaction();
try {
    $stmt = $con->prepare("INSERT INTO Respuesta (id_pregunta, id_ci, respuesta_texto, fecha_respuesta) VALUES (?, ?, ?, CURDATE())");
    foreach ($a_guardar as $fila) {
        $stmt->bind_param("iis", $fila[0], $ci, $fila[1]);
        $stmt->execute();
    }
    $stmt->close();
    $con->commit();
} catch (Throwable $e) {
    // si mandó dos veces al mismo tiempo, la clave única (pregunta + paciente) frena la segunda
    $con->rollback();
    error_log('portal-encuesta-responder: ' . $e->getMessage());
    responder_error('No se pudo guardar. Si ya la respondiste, no hace falta hacerlo de nuevo.');
}

echo json_encode(['exito' => true]);
$con->close();
