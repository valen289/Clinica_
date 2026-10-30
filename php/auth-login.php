<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
iniciar_sesion();

require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/intentos.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

$usuario_ingresado = trim($_POST['usuario'] ?? '');
// la contraseña no se recorta: un espacio al final es parte de la contraseña
$contrasenia_ingresada = $_POST['contrasenia'] ?? '';
$ip = $_SERVER['REMOTE_ADDR'] ?? '';

if ($usuario_ingresado === '' || $contrasenia_ingresada === '') {
    echo json_encode(['error' => 'Ingresá usuario y contraseña.']);
    exit;
}

if (demasiados_intentos($con, $usuario_ingresado, $ip)) {
    responder_bloqueado($con);
}

$sql = "SELECT id_funcionario, nombre, contrasenia, rol FROM Funcionario WHERE usuario = ?";
$stmt = $con->prepare($sql);
$stmt->bind_param("s", $usuario_ingresado);
$stmt->execute();
$resultado = $stmt->get_result();
$funcionario = $resultado->fetch_assoc();
$stmt->close();

if ($funcionario && password_verify($contrasenia_ingresada, $funcionario['contrasenia'])) {

    // id de sesión nuevo al loguearse: un id que alguien haya "plantado" antes deja de servir.
    // Se vacía la sesión para que no quede mezclada con una del portal del paciente.
    session_regenerate_id(true);
    $_SESSION = [];

    $_SESSION['id_funcionario'] = $funcionario['id_funcionario'];
    $_SESSION['nombre'] = $funcionario['nombre'];
    $_SESSION['rol'] = $funcionario['rol'];

    limpiar_intentos($con, $usuario_ingresado, $ip);

    echo json_encode(['exito' => true, 'rol' => $funcionario['rol']]);

} else {
    registrar_intento_fallido($con, $usuario_ingresado, $ip);
    echo json_encode(['error' => 'Usuario o contraseña incorrectos.']);
}

$con->close();
