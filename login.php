<?php

session_start();

require_once 'config/conexion.php';

$usuario_ingresado = trim($_POST['usuario']);     //utilizo trim ya que saca los espacios en blanco al principio y al final agrega un string \\
$contrasenia_ingresada = trim($_POST['contrasenia']);

$sql = "SELECT id_funcionario, nombre, contrasenia, rol FROM Funcionario WHERE usuario = ?"; //es un espacio reservado \\
$stmt = $con->prepare($sql);
$stmt->bind_param("s", $usuario_ingresado); //sirve para conectar el valor real (s es el tipo de dato string )
$stmt->execute();
$resultado = $stmt->get_result();
$funcionario = $resultado->fetch_assoc(); //trae la fila encontrada como un array asociativo\\

if ($funcionario && password_verify($contrasenia_ingresada, $funcionario['contrasenia'])) {

    $_SESSION['id_funcionario'] = $funcionario['id_funcionario'];
    $_SESSION['nombre'] = $funcionario['nombre'];
    $_SESSION['rol'] = $funcionario['rol'];

    header("Location: modulos/recursos/ambulancias.php");
    exit;

} else {
    echo "Usuario o contraseña incorrectos.";
}

$stmt->close();
$con->close();