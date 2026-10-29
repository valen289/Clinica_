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

$TIPOS_VALIDOS = ['Análisis de laboratorio', 'Imagenología', 'Informe médico', 'Otro'];
$ESTADOS_VALIDOS = ['Pendiente', 'Disponible'];

// los PDF de pacientes van a /estudios/, que tiene un .htaccess que no deja abrirlos directo;
// el nombre es aleatorio para que no se pueda adivinar ni revele de quién es
$carpeta_estudios = __DIR__ . '/../estudios/';
$tamanio_maximo_pdf = 10 * 1024 * 1024;

$id_paciente = (int) ($_POST['id_paciente'] ?? 0);
$id_estudio_editar = !empty($_POST['id_estudio_editar']) ? (int) $_POST['id_estudio_editar'] : null;
$tipo = trim($_POST['tipo'] ?? '');
$titulo = trim($_POST['titulo'] ?? '');
$fecha_estudio = trim($_POST['fecha_estudio'] ?? '');
$estado = trim($_POST['estado'] ?? '');
$observaciones = trim($_POST['observaciones'] ?? '');

if (!in_array($tipo, $TIPOS_VALIDOS, true)) {
    responder_error('Elegí el tipo de estudio.');
}
if ($titulo === '' || mb_strlen($titulo) > 100) {
    responder_error('El título es obligatorio y puede tener hasta 100 caracteres.');
}
$fecha = DateTime::createFromFormat('Y-m-d', $fecha_estudio);
if (!$fecha || $fecha->format('Y-m-d') !== $fecha_estudio || $fecha > new DateTime()) {
    responder_error('La fecha del estudio no es válida (no puede ser futura).');
}
if (!in_array($estado, $ESTADOS_VALIDOS, true)) {
    responder_error('Elegí el estado del estudio.');
}
if (mb_strlen($observaciones) > 500) {
    responder_error('Las observaciones pueden tener hasta 500 caracteres.');
}

$stmt = $con->prepare("SELECT id_ci FROM Paciente WHERE id_ci = ?");
$stmt->bind_param("i", $id_paciente);
$stmt->execute();
$paciente_existe = $stmt->get_result()->num_rows > 0;
$stmt->close();
if (!$paciente_existe) {
    responder_error('El paciente no existe.');
}

$archivo_anterior = '';
if ($id_estudio_editar) {
    // el estudio tiene que ser de este mismo paciente
    $stmt = $con->prepare("SELECT archivo FROM Estudio WHERE id_estudio = ? AND id_paciente = ?");
    $stmt->bind_param("ii", $id_estudio_editar, $id_paciente);
    $stmt->execute();
    $existente = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$existente) {
        responder_error('El estudio que intentás editar no existe.');
    }
    $archivo_anterior = $existente['archivo'];
}

$archivo = $_FILES['archivo'] ?? null;
$hay_archivo = $archivo && $archivo['error'] !== UPLOAD_ERR_NO_FILE;

if ($hay_archivo) {
    if ($archivo['error'] !== UPLOAD_ERR_OK) {
        responder_error('No se pudo subir el archivo (error ' . $archivo['error'] . ').');
    }
    if ($archivo['size'] > $tamanio_maximo_pdf) {
        responder_error('El PDF no puede superar los 10 MB.');
    }
    if ((new finfo(FILEINFO_MIME_TYPE))->file($archivo['tmp_name']) !== 'application/pdf') {
        responder_error('El archivo debe ser un PDF.');
    }
}

// "Disponible" significa que el paciente ya puede ver el resultado: sin PDF no hay resultado que mostrar
if ($estado === 'Disponible' && !$hay_archivo && $archivo_anterior === '') {
    responder_error('Para marcarlo como disponible adjuntá el PDF del resultado.');
}

$archivo_nuevo = '';
if ($hay_archivo) {
    $archivo_nuevo = bin2hex(random_bytes(16)) . '.pdf';
    if (!move_uploaded_file($archivo['tmp_name'], $carpeta_estudios . $archivo_nuevo)) {
        responder_error('No se pudo guardar el archivo en el servidor.');
    }
}

$observaciones_guardar = $observaciones !== '' ? $observaciones : null;

try {
    if ($id_estudio_editar) {
        $archivo_guardar = $archivo_nuevo !== '' ? $archivo_nuevo : $archivo_anterior;
        $stmt = $con->prepare("UPDATE Estudio SET tipo = ?, titulo = ?, fecha_estudio = ?, estado = ?, archivo = ?, observaciones = ? WHERE id_estudio = ?");
        $stmt->bind_param("ssssssi", $tipo, $titulo, $fecha_estudio, $estado, $archivo_guardar, $observaciones_guardar, $id_estudio_editar);
    } else {
        $stmt = $con->prepare("INSERT INTO Estudio (id_paciente, tipo, titulo, fecha_estudio, estado, archivo, observaciones, fecha_carga, id_funcionario) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)");
        $stmt->bind_param("issssssi", $id_paciente, $tipo, $titulo, $fecha_estudio, $estado, $archivo_nuevo, $observaciones_guardar, $_SESSION['id_funcionario']);
    }
    $stmt->execute();
    $stmt->close();
} catch (Throwable $e) {
    if ($archivo_nuevo !== '' && is_file($carpeta_estudios . $archivo_nuevo)) {
        unlink($carpeta_estudios . $archivo_nuevo); // no dejar un PDF huérfano si falló la base
    }
    error_log('estudios-guardar: ' . $e->getMessage());
    responder_error('No se pudo guardar el estudio. Intentá de nuevo.');
}

// recién con la base actualizada se borra el PDF reemplazado
if ($archivo_nuevo !== '' && $archivo_anterior !== '' && is_file($carpeta_estudios . $archivo_anterior)) {
    unlink($carpeta_estudios . $archivo_anterior);
}

echo json_encode(['exito' => true]);
$con->close();
