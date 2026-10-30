<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
$ci = requerir_paciente();

require_once __DIR__ . '/conexion.php';

function responder_error($mensaje) {
    http_response_code(422);
    echo json_encode(['exito' => false, 'error' => $mensaje]);
    exit;
}

$LARGO_MINIMO_CONTRASENIA = 8;

$actual = $_POST['actual'] ?? '';
$nueva = $_POST['nueva'] ?? '';
$confirmacion = $_POST['confirmacion'] ?? '';

if ($actual === '' || $nueva === '') {
    responder_error('Completá la contraseña actual y la nueva.');
}
if (mb_strlen($nueva) < $LARGO_MINIMO_CONTRASENIA) {
    responder_error('La contraseña nueva tiene que tener al menos ' . $LARGO_MINIMO_CONTRASENIA . ' caracteres.');
}
if ($nueva !== $confirmacion) {
    responder_error('Las dos contraseñas nuevas no coinciden.');
}
if ($nueva === $actual) {
    responder_error('La contraseña nueva tiene que ser distinta de la actual.');
}

$stmt = $con->prepare("SELECT contrasenia FROM Paciente WHERE id_ci = ?");
$stmt->bind_param("i", $ci);
$stmt->execute();
$paciente = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$paciente || !$paciente['contrasenia'] || !password_verify($actual, $paciente['contrasenia'])) {
    responder_error('La contraseña actual no es correcta.');
}

$hash = password_hash($nueva, PASSWORD_BCRYPT);
$stmt = $con->prepare("UPDATE Paciente SET contrasenia = ? WHERE id_ci = ?");
$stmt->bind_param("si", $hash, $ci);
$stmt->execute();
$stmt->close();

session_regenerate_id(true);

echo json_encode(['exito' => true]);
$con->close();
