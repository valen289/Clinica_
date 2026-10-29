<?php

// Entrega el PDF de un estudio. Es la única puerta a /estudios/ (la carpeta está cerrada por .htaccess),
// así que acá se controla quién puede ver cada resultado.
require_once __DIR__ . '/auth.php';
requerir_sesion(['Chofer']);

require_once __DIR__ . '/conexion.php';

$id_estudio = (int) ($_GET['id'] ?? 0);

$stmt = $con->prepare("SELECT archivo FROM Estudio WHERE id_estudio = ?");
$stmt->bind_param("i", $id_estudio);
$stmt->execute();
$estudio = $stmt->get_result()->fetch_assoc();
$stmt->close();
$con->close();

// basename por las dudas: el nombre viene de la base, pero nunca se sale de la carpeta
$ruta = $estudio && $estudio['archivo'] !== '' ? __DIR__ . '/../estudios/' . basename($estudio['archivo']) : null;

if (!$ruta || !is_file($ruta)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'El estudio no tiene un PDF disponible.';
    exit;
}

header('Content-Type: application/pdf');
header('Content-Length: ' . filesize($ruta));
header('Content-Disposition: inline; filename="estudio-' . $id_estudio . '.pdf"');
header('X-Content-Type-Options: nosniff');
// datos de salud: que no queden guardados en cachés intermedias
header('Cache-Control: private, no-store');
readfile($ruta);
