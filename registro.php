<?php

header('Content-Type: application/json');

require_once 'config/conexion.php';

$nombre = trim($_POST['nombre'] ?? '');
$apellido = trim($_POST['apellido'] ?? '');
$email = trim($_POST['email'] ?? '');
$ci = trim($_POST['ci'] ?? '');
$usuario = trim($_POST['usuario'] ?? '');
$contrasenia = $_POST['contrasenia'] ?? '';
$rol = trim($_POST['rol'] ?? '');

if ($nombre === '' || $apellido === '' || $email === '' || $ci === '' || $usuario === '' || $contrasenia === '' || $rol === '') {
    echo json_encode(['error' => 'Completá todos los campos.']);
    exit;
}

// Chequeo de duplicados antes de insertar: usuario y cédula son únicos en Funcionario
$chequeo = $con->prepare("SELECT id_funcionario FROM Funcionario WHERE usuario = ? OR ci = ?");
$chequeo->bind_param("ss", $usuario, $ci);
$chequeo->execute();
$existe = $chequeo->get_result()->num_rows > 0;
$chequeo->close();

if ($existe) {
    echo json_encode(['error' => 'Ya existe un funcionario con ese usuario o cédula.']);
    $con->close();
    exit;
}

$hash = password_hash($contrasenia, PASSWORD_BCRYPT);

$stmt = $con->prepare("INSERT INTO Funcionario (nombre, apellido, email, usuario, rol, ci, contrasenia) VALUES (?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("sssssss", $nombre, $apellido, $email, $usuario, $rol, $ci, $hash);

if ($stmt->execute()) {
    echo json_encode(['exito' => true]);
} else {
    echo json_encode(['error' => 'No se pudo registrar. Intentá de nuevo.']);
}

$stmt->close();
$con->close();
