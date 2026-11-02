<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
iniciar_sesion();

require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/cedula.php';
require_once __DIR__ . '/intentos.php';

// "Crear mi cuenta": el paciente se registra solo con su cédula y su número de paciente
// (el número se lo da el hospital al darlo de alta y no es público como la cédula).
// Solo pueden crear cuenta los pacientes que ya están registrados en el hospital y que todavía no tienen una.

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

function responder_error($mensaje) {
    http_response_code(422);
    echo json_encode(['exito' => false, 'error' => $mensaje]);
    exit;
}

$LARGO_MINIMO_CONTRASENIA = 8;

$ci = cedula_a_numero($_POST['ci'] ?? '');
$numero_paciente = preg_replace('/\D/', '', $_POST['numero_paciente'] ?? '');
$contrasenia = $_POST['contrasenia'] ?? '';
$confirmacion = $_POST['confirmacion'] ?? '';
$ip = $_SERVER['REMOTE_ADDR'] ?? '';

if (!$ci) {
    responder_error('Revisá la cédula: el número no es válido.');
}
if (strlen($numero_paciente) !== 6) {
    responder_error('El número de paciente tiene 6 cifras.');
}
if (mb_strlen($contrasenia) < $LARGO_MINIMO_CONTRASENIA) {
    responder_error('La contraseña tiene que tener al menos ' . $LARGO_MINIMO_CONTRASENIA . ' caracteres.');
}
if ($contrasenia !== $confirmacion) {
    responder_error('Las dos contraseñas no coinciden.');
}

// sin límite de intentos alguien podría probar números de paciente hasta acertar
$clave_intentos = 'reg:' . $ci;
if (demasiados_intentos($con, $clave_intentos, $ip)) {
    responder_bloqueado($con);
}

$stmt = $con->prepare("SELECT id_ci, nombre, numero_paciente, contrasenia IS NOT NULL AS tiene_cuenta FROM Paciente WHERE id_ci = ?");
$stmt->bind_param("i", $ci);
$stmt->execute();
$paciente = $stmt->get_result()->fetch_assoc();
$stmt->close();

// mismo mensaje si la cédula no es de un paciente o si el número no coincide:
// decir cuál de los dos falló revelaría quién se atiende en el hospital
$datos_ok = $paciente && hash_equals((string) $paciente['numero_paciente'], $numero_paciente);
if (!$datos_ok) {
    registrar_intento_fallido($con, $clave_intentos, $ip);
    responder_error('La cédula o el número de paciente no coinciden con los registrados en el hospital. Si no sabés tu número, consultá en Recepción.');
}

// con los dos datos correctos ya se sabe que es el paciente; si ya tiene cuenta no se pisa su contraseña
if ($paciente['tiene_cuenta']) {
    responder_error('Ya tenés una cuenta creada. Ingresá con tu cédula y tu contraseña; si la olvidaste, pedí un código en Recepción.');
}

$hash = password_hash($contrasenia, PASSWORD_BCRYPT);
$stmt = $con->prepare("UPDATE Paciente SET contrasenia = ?, cuenta_activada = NOW(), ultimo_ingreso = NOW() WHERE id_ci = ? AND contrasenia IS NULL");
$stmt->bind_param("si", $hash, $ci);
$stmt->execute();
$stmt->close();

limpiar_intentos($con, $clave_intentos, $ip);

// queda logueado directamente
session_regenerate_id(true);
$_SESSION = [];
$_SESSION['id_paciente'] = (int) $paciente['id_ci'];
$_SESSION['nombre_paciente'] = $paciente['nombre'];

echo json_encode(['exito' => true]);
$con->close();
