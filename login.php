<?php

session_start();
header('Content-Type: application/json');

require_once 'config/conexion.php';

$usuario_ingresado = trim($_POST['usuario'] ?? '');
$contrasenia_ingresada = trim($_POST['contrasenia'] ?? '');

$sql = "SELECT id_funcionario, nombre, contrasenia, rol FROM Funcionario WHERE usuario = ?";
$stmt = $con->prepare($sql);
$stmt->bind_param("s", $usuario_ingresado);
$stmt->execute();
$resultado = $stmt->get_result();
$funcionario = $resultado->fetch_assoc();
$stmt->close();

if ($funcionario && password_verify($contrasenia_ingresada, $funcionario['contrasenia'])) {

    $_SESSION['id_funcionario'] = $funcionario['id_funcionario'];
    $_SESSION['nombre'] = $funcionario['nombre'];
    $_SESSION['rol'] = $funcionario['rol'];

    echo json_encode(['exito' => true]);

} else {
    echo json_encode(['error' => 'Usuario o contraseña incorrectos.']);
}

$con->close();
