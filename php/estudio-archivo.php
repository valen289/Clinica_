<?php

// Entrega el PDF de un estudio. Es la única puerta a /estudios/ (la carpeta está cerrada por .htaccess),
// así que acá se controla quién puede ver cada resultado:
//  - el personal (no choferes): cualquier estudio
//  - el paciente logueado en el portal: solo los suyos y solo si ya están disponibles
require_once __DIR__ . '/auth.php';
iniciar_sesion();

function cortar($codigo, $texto) {
    http_response_code($codigo);
    header('Content-Type: text/plain; charset=utf-8');
    echo $texto;
    exit;
}

$es_personal = isset($_SESSION['id_funcionario']) && ($_SESSION['rol'] ?? '') !== 'Chofer';
$id_paciente = isset($_SESSION['id_paciente']) ? (int) $_SESSION['id_paciente'] : null;

if (isset($_SESSION['id_funcionario']) && !$es_personal) {
    cortar(403, 'No autorizado.');
}
if (!$es_personal && !$id_paciente) {
    cortar(401, 'Iniciá sesión para ver este estudio.');
}

require_once __DIR__ . '/conexion.php';

$id_estudio = (int) ($_GET['id'] ?? 0);

if ($es_personal) {
    $stmt = $con->prepare("SELECT archivo FROM Estudio WHERE id_estudio = ?");
    $stmt->bind_param("i", $id_estudio);
} else {
    $stmt = $con->prepare("SELECT archivo FROM Estudio WHERE id_estudio = ? AND id_paciente = ? AND estado = 'Disponible'");
    $stmt->bind_param("ii", $id_estudio, $id_paciente);
}
$stmt->execute();
$estudio = $stmt->get_result()->fetch_assoc();
$stmt->close();
$con->close();

// basename por las dudas: el nombre viene de la base, pero nunca se sale de la carpeta
$ruta = $estudio && $estudio['archivo'] !== '' ? __DIR__ . '/../estudios/' . basename($estudio['archivo']) : null;

// a un paciente que pide un estudio ajeno se le contesta lo mismo que si no existiera
if (!$ruta || !is_file($ruta)) {
    cortar(404, 'El estudio no tiene un PDF disponible.');
}

header('Content-Type: application/pdf');
header('Content-Length: ' . filesize($ruta));
header('Content-Disposition: inline; filename="estudio-' . $id_estudio . '.pdf"');
header('X-Content-Type-Options: nosniff');
// datos de salud: que no queden guardados en cachés intermedias
header('Cache-Control: private, no-store');
readfile($ruta);
