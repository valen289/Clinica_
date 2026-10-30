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

function responder_error($mensaje) {
    http_response_code(422);
    echo json_encode(['exito' => false, 'error' => $mensaje]);
    exit;
}

$LARGO_MINIMO_CONTRASENIA = 8;

$ci = cedula_a_numero($_POST['ci'] ?? '');
// el código se acepta con o sin guion y en minúsculas: "abcd-efgh" = "ABCDEFGH"
$codigo = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $_POST['codigo'] ?? ''));
$contrasenia = $_POST['contrasenia'] ?? '';
$confirmacion = $_POST['confirmacion'] ?? '';
$ip = $_SERVER['REMOTE_ADDR'] ?? '';

if (!$ci) {
    responder_error('Revisá la cédula: el número no es válido.');
}
if (strlen($codigo) !== 8) {
    responder_error('El código de activación tiene 8 letras y números (por ejemplo ABCD-2345).');
}
if (mb_strlen($contrasenia) < $LARGO_MINIMO_CONTRASENIA) {
    responder_error('La contraseña tiene que tener al menos ' . $LARGO_MINIMO_CONTRASENIA . ' caracteres.');
}
if ($contrasenia !== $confirmacion) {
    responder_error('Las dos contraseñas no coinciden.');
}

// sin límite de intentos alguien podría probar códigos hasta acertar
$clave_intentos = 'act:' . $ci;
if (demasiados_intentos($con, $clave_intentos, $ip)) {
    responder_bloqueado($con);
}

// el vencimiento se compara en la base (NOW()), con el mismo reloj con el que se generó
$stmt = $con->prepare("SELECT id_ci, nombre, codigo_activacion, codigo_vence > NOW() AS vigente FROM Paciente WHERE id_ci = ?");
$stmt->bind_param("i", $ci);
$stmt->execute();
$paciente = $stmt->get_result()->fetch_assoc();
$stmt->close();

$tiene_codigo = $paciente && $paciente['codigo_activacion'] && $paciente['vigente'];
$hash = $tiene_codigo ? $paciente['codigo_activacion'] : HASH_DE_RELLENO;
$codigo_ok = password_verify($codigo, $hash) && $tiene_codigo;

if (!$codigo_ok) {
    registrar_intento_fallido($con, $clave_intentos, $ip);
    http_response_code(422);
    echo json_encode(['exito' => false, 'error' => 'La cédula o el código no son correctos, o el código ya venció. Si no lo tenés, pedí uno nuevo en Recepción.']);
    $con->close();
    exit;
}

// el código es de un solo uso: se borra al activar. Si ya tenía cuenta, esto funciona como "restablecer contraseña"
$hash_contrasenia = password_hash($contrasenia, PASSWORD_BCRYPT);
$stmt = $con->prepare("UPDATE Paciente
                       SET contrasenia = ?, codigo_activacion = NULL, codigo_vence = NULL,
                           cuenta_activada = COALESCE(cuenta_activada, NOW()), ultimo_ingreso = NOW()
                       WHERE id_ci = ?");
$stmt->bind_param("si", $hash_contrasenia, $ci);
$stmt->execute();
$stmt->close();

limpiar_intentos($con, $clave_intentos, $ip);

// queda logueado directamente: no tiene sentido pedirle que vuelva a escribir lo que acaba de elegir
session_regenerate_id(true);
$_SESSION = [];
$_SESSION['id_paciente'] = (int) $paciente['id_ci'];
$_SESSION['nombre_paciente'] = $paciente['nombre'];

echo json_encode(['exito' => true]);
$con->close();
