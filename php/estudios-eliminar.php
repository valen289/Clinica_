<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion(['Chofer']);

require_once __DIR__ . '/conexion.php';

$id_estudio = (int) ($_POST['id_estudio'] ?? 0);

$stmt = $con->prepare("SELECT archivo FROM Estudio WHERE id_estudio = ?");
$stmt->bind_param("i", $id_estudio);
$stmt->execute();
$estudio = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$estudio) {
    http_response_code(404);
    echo json_encode(['exito' => false, 'error' => 'El estudio no existe.']);
    $con->close();
    exit;
}

$stmt = $con->prepare("DELETE FROM Estudio WHERE id_estudio = ?");
$stmt->bind_param("i", $id_estudio);
$stmt->execute();
$stmt->close();

// el PDF se borra del disco, no solo el registro
$ruta_fisica = __DIR__ . '/../estudios/' . $estudio['archivo'];
if ($estudio['archivo'] !== '' && is_file($ruta_fisica)) {
    unlink($ruta_fisica);
}

echo json_encode(['exito' => true]);
$con->close();
