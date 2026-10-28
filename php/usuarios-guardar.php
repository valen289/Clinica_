<?php

header('Content-Type: application/json');

// reemplaza al viejo auth-registro.php: ya no hay registro público,
// las cuentas del personal las crea un Administrador desde usuarios.html
require_once __DIR__ . '/auth.php';
requerir_rol(['Administrador']);

require_once __DIR__ . '/conexion.php';

function responder_error($mensaje) {
    http_response_code(422);
    echo json_encode(['exito' => false, 'error' => $mensaje]);
    exit;
}

$ROLES_VALIDOS = ['Administrador', 'Recepción', 'Médico', 'Chofer'];
$LARGO_MINIMO_CONTRASENIA = 8;

$nombre = trim($_POST['nombre'] ?? '');
$apellido = trim($_POST['apellido'] ?? '');
$email = trim($_POST['email'] ?? '');
$ci = trim($_POST['ci'] ?? '');
$usuario = trim($_POST['usuario'] ?? '');
$contrasenia = $_POST['contrasenia'] ?? '';
$rol = trim($_POST['rol'] ?? '');

if ($nombre === '' || $apellido === '' || $email === '' || $ci === '' || $usuario === '' || $contrasenia === '' || $rol === '') {
    responder_error('Completá todos los campos.');
}
// los largos máximos son los de las columnas de Funcionario
if (mb_strlen($nombre) > 50 || mb_strlen($apellido) > 50) {
    responder_error('Nombre y apellido pueden tener hasta 50 caracteres.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 40) {
    responder_error('Ingresá un email válido (hasta 40 caracteres).');
}
if (!preg_match('/^[0-9.\-]{7,11}$/', $ci)) {
    responder_error('La cédula debe tener el formato 1.234.567-8.');
}
if (!preg_match('/^[A-Za-z0-9._-]{3,40}$/', $usuario)) {
    responder_error('El usuario debe tener entre 3 y 40 caracteres, sin espacios.');
}
if (mb_strlen($contrasenia) < $LARGO_MINIMO_CONTRASENIA) {
    responder_error('La contraseña debe tener al menos ' . $LARGO_MINIMO_CONTRASENIA . ' caracteres.');
}
if (!in_array($rol, $ROLES_VALIDOS, true)) {
    responder_error('Elegí un rol válido.');
}

// usuario y cédula son únicos en Funcionario
$chequeo = $con->prepare("SELECT id_funcionario FROM Funcionario WHERE usuario = ? OR ci = ?");
$chequeo->bind_param("ss", $usuario, $ci);
$chequeo->execute();
$existe = $chequeo->get_result()->num_rows > 0;
$chequeo->close();

if ($existe) {
    responder_error('Ya existe un funcionario con ese usuario o cédula.');
}

$hash = password_hash($contrasenia, PASSWORD_BCRYPT);

$stmt = $con->prepare("INSERT INTO Funcionario (nombre, apellido, email, usuario, rol, ci, contrasenia) VALUES (?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("sssssss", $nombre, $apellido, $email, $usuario, $rol, $ci, $hash);

if (!$stmt->execute()) {
    error_log('usuarios-guardar: ' . $stmt->error);
    responder_error('No se pudo crear el usuario. Intentá de nuevo.');
}

$stmt->close();
echo json_encode(['exito' => true]);
$con->close();
