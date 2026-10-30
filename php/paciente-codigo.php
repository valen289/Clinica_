<?php

header('Content-Type: application/json');

// Genera el código de activación del portal para un paciente (lo usa Recepción desde su ficha).
// Si el paciente ya tenía cuenta, el código sirve para elegir una contraseña nueva.
require_once __DIR__ . '/auth.php';
requerir_sesion(['Chofer']);

require_once __DIR__ . '/conexion.php';

$DIAS_VIGENCIA = 7;
// sin I, O, 0 ni 1: son los caracteres que se confunden al copiarlo de un papel
$ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

$ci = (int) ($_POST['ci'] ?? 0);

$stmt = $con->prepare("SELECT id_ci, nombre, apellido FROM Paciente WHERE id_ci = ?");
$stmt->bind_param("i", $ci);
$stmt->execute();
$paciente = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$paciente) {
    http_response_code(404);
    echo json_encode(['exito' => false, 'error' => 'El paciente no existe.']);
    $con->close();
    exit;
}

$codigo = '';
for ($i = 0; $i < 8; $i++) {
    $codigo .= $ALFABETO[random_int(0, strlen($ALFABETO) - 1)];
}

// en la base queda solo el hash: el código se muestra esta única vez (si se pierde, se genera otro)
$hash = password_hash($codigo, PASSWORD_BCRYPT);
$stmt = $con->prepare("UPDATE Paciente SET codigo_activacion = ?, codigo_vence = NOW() + INTERVAL ? DAY WHERE id_ci = ?");
$stmt->bind_param("sii", $hash, $DIAS_VIGENCIA, $ci);
$stmt->execute();
$stmt->close();

$stmt = $con->prepare("SELECT codigo_vence FROM Paciente WHERE id_ci = ?");
$stmt->bind_param("i", $ci);
$stmt->execute();
$vence = $stmt->get_result()->fetch_assoc()['codigo_vence'];
$stmt->close();

echo json_encode([
    'exito' => true,
    'datos' => [
        'codigo' => substr($codigo, 0, 4) . '-' . substr($codigo, 4),
        'vence' => $vence,
        'nombre' => $paciente['nombre'],
        'apellido' => $paciente['apellido'],
        'id_ci' => $paciente['id_ci'],
    ],
]);
$con->close();
