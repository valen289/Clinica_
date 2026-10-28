<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_rol(['Administrador']);

require_once __DIR__ . '/conexion.php';

// la contraseña nunca sale del servidor, ni siquiera el hash
$resultado = $con->query("SELECT id_funcionario, nombre, apellido, email, usuario, rol, ci FROM Funcionario ORDER BY apellido, nombre");

echo json_encode(['exito' => true, 'datos' => filas($resultado)]);
$con->close();
