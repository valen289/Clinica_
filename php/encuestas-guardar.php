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

// tipos de pregunta: calificación del 1 al 5, sí/no o respuesta libre
$TIPOS_VALIDOS = ['escala', 'si_no', 'texto'];
$MAXIMO_PREGUNTAS = 15;

$titulo = trim($_POST['titulo'] ?? '');
$descripcion = trim($_POST['descripcion'] ?? '');
$fecha_cierre = trim($_POST['fecha_cierre'] ?? '');
// preguntas[] y tipos[] llegan como arrays paralelos (una fila del formulario = una pregunta)
$textos = array_map('trim', (array) ($_POST['preguntas'] ?? []));
$tipos = (array) ($_POST['tipos'] ?? []);

if ($titulo === '' || mb_strlen($titulo) > 100) {
    responder_error('El título es obligatorio y puede tener hasta 100 caracteres.');
}
if (mb_strlen($descripcion) > 100) {
    responder_error('La descripción puede tener hasta 100 caracteres.');
}
if ($fecha_cierre !== '') {
    $fecha = DateTime::createFromFormat('Y-m-d', $fecha_cierre);
    if (!$fecha || $fecha->format('Y-m-d') !== $fecha_cierre || $fecha_cierre < date('Y-m-d')) {
        responder_error('La fecha de cierre no puede ser anterior a hoy.');
    }
}

$preguntas = [];
foreach ($textos as $i => $texto) {
    if ($texto === '') {
        continue;
    }
    $tipo = $tipos[$i] ?? '';
    if (!in_array($tipo, $TIPOS_VALIDOS, true)) {
        responder_error('Elegí el tipo de cada pregunta.');
    }
    if (mb_strlen($texto) > 200) {
        responder_error('Cada pregunta puede tener hasta 200 caracteres.');
    }
    $preguntas[] = ['texto' => $texto, 'tipo' => $tipo];
}
if (count($preguntas) === 0) {
    responder_error('Agregá al menos una pregunta.');
}
if (count($preguntas) > $MAXIMO_PREGUNTAS) {
    responder_error('Una encuesta puede tener hasta ' . $MAXIMO_PREGUNTAS . ' preguntas.');
}

$descripcion_guardar = $descripcion !== '' ? $descripcion : null;
$cierre_guardar = $fecha_cierre !== '' ? $fecha_cierre : null;

// encuesta y preguntas juntas: o se guarda todo o nada
$con->begin_transaction();
try {
    $stmt = $con->prepare("INSERT INTO Encuesta (titulo, descripcion, fecha_creacion, fecha_cierre, estado, id_funcionario) VALUES (?, ?, CURDATE(), ?, TRUE, ?)");
    $stmt->bind_param("sssi", $titulo, $descripcion_guardar, $cierre_guardar, $_SESSION['id_funcionario']);
    $stmt->execute();
    $id_encuesta = $stmt->insert_id;
    $stmt->close();

    $stmt = $con->prepare("INSERT INTO Pregunta (id_encuesta, texto_pregunta, tipo_pregunta) VALUES (?, ?, ?)");
    foreach ($preguntas as $pregunta) {
        $stmt->bind_param("iss", $id_encuesta, $pregunta['texto'], $pregunta['tipo']);
        $stmt->execute();
    }
    $stmt->close();

    $con->commit();
} catch (Throwable $e) {
    $con->rollback();
    error_log('encuestas-guardar: ' . $e->getMessage());
    responder_error('No se pudo guardar la encuesta. Intentá de nuevo.');
}

echo json_encode(['exito' => true, 'id_encuesta' => $id_encuesta]);
$con->close();
