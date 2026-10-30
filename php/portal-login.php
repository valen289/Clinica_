<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
iniciar_sesion();

require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/cedula.php';
require_once __DIR__ . '/intentos.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

// el mismo mensaje para "no es paciente", "no activó la cuenta" y "contraseña mal":
// decir cuál de los tres es revelaría quién se atiende en el hospital
$ERROR_INGRESO = 'Cédula o contraseña incorrectas. Si es la primera vez que entrás, activá tu cuenta con el código que te dieron en el hospital.';

$ci = cedula_a_numero($_POST['ci'] ?? '');
$contrasenia = $_POST['contrasenia'] ?? '';
$ip = $_SERVER['REMOTE_ADDR'] ?? '';

if (!$ci) {
    echo json_encode(['error' => 'Revisá la cédula: el número no es válido.']);
    exit;
}
if ($contrasenia === '') {
    echo json_encode(['error' => 'Ingresá tu contraseña.']);
    exit;
}

$clave_intentos = 'pac:' . $ci;
if (demasiados_intentos($con, $clave_intentos, $ip)) {
    responder_bloqueado($con);
}

$stmt = $con->prepare("SELECT id_ci, nombre, contrasenia FROM Paciente WHERE id_ci = ?");
$stmt->bind_param("i", $ci);
$stmt->execute();
$paciente = $stmt->get_result()->fetch_assoc();
$stmt->close();

$hash = ($paciente && $paciente['contrasenia']) ? $paciente['contrasenia'] : HASH_DE_RELLENO;
$contrasenia_ok = password_verify($contrasenia, $hash) && $paciente && $paciente['contrasenia'];

if (!$contrasenia_ok) {
    registrar_intento_fallido($con, $clave_intentos, $ip);
    echo json_encode(['error' => $ERROR_INGRESO]);
    $con->close();
    exit;
}

// sesión nueva y vacía: no queda mezclada con una del personal en el mismo navegador
session_regenerate_id(true);
$_SESSION = [];
$_SESSION['id_paciente'] = (int) $paciente['id_ci'];
$_SESSION['nombre_paciente'] = $paciente['nombre'];

$stmt = $con->prepare("UPDATE Paciente SET ultimo_ingreso = NOW() WHERE id_ci = ?");
$stmt->bind_param("i", $ci);
$stmt->execute();
$stmt->close();

limpiar_intentos($con, $clave_intentos, $ip);

echo json_encode(['exito' => true]);
$con->close();
