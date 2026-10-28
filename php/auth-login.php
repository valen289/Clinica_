<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
iniciar_sesion();

require_once __DIR__ . '/conexion.php';

// cuántos intentos fallidos se toleran por usuario + IP antes de bloquear un rato
$MAX_INTENTOS = 5;
$MINUTOS_BLOQUEO = 15;

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

// limpieza: los intentos de hace más de un día ya no sirven para nada
$con->query("DELETE FROM Intento_login WHERE fecha < NOW() - INTERVAL 1 DAY");

$stmt = $con->prepare("SELECT COUNT(*) AS total FROM Intento_login WHERE usuario = ? AND ip = ? AND fecha > NOW() - INTERVAL ? MINUTE");
$stmt->bind_param("ssi", $usuario_ingresado, $ip, $MINUTOS_BLOQUEO);
$stmt->execute();
$intentos_recientes = (int) $stmt->get_result()->fetch_assoc()['total'];
$stmt->close();

if ($intentos_recientes >= $MAX_INTENTOS) {
    http_response_code(429);
    echo json_encode(['error' => 'Demasiados intentos fallidos. Esperá ' . $MINUTOS_BLOQUEO . ' minutos y volvé a probar.']);
    $con->close();
    exit;
}

$sql = "SELECT id_funcionario, nombre, contrasenia, rol FROM Funcionario WHERE usuario = ?";
$stmt = $con->prepare($sql);
$stmt->bind_param("s", $usuario_ingresado);
$stmt->execute();
$resultado = $stmt->get_result();
$funcionario = $resultado->fetch_assoc();
$stmt->close();

if ($funcionario && password_verify($contrasenia_ingresada, $funcionario['contrasenia'])) {

    // id de sesión nuevo al loguearse: un id que alguien haya "plantado" antes deja de servir
    session_regenerate_id(true);

    $_SESSION['id_funcionario'] = $funcionario['id_funcionario'];
    $_SESSION['nombre'] = $funcionario['nombre'];
    $_SESSION['rol'] = $funcionario['rol'];

    $stmt = $con->prepare("DELETE FROM Intento_login WHERE usuario = ? AND ip = ?");
    $stmt->bind_param("ss", $usuario_ingresado, $ip);
    $stmt->execute();
    $stmt->close();

    echo json_encode(['exito' => true, 'rol' => $funcionario['rol']]);

} else {
    $stmt = $con->prepare("INSERT INTO Intento_login (usuario, ip, fecha) VALUES (?, ?, NOW())");
    $stmt->bind_param("ss", $usuario_ingresado, $ip);
    $stmt->execute();
    $stmt->close();

    echo json_encode(['error' => 'Usuario o contraseña incorrectos.']);
}

$con->close();
