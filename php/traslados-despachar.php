<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion();

require_once __DIR__ . '/conexion.php';

$id_ambulancia = $_POST['id_ambulancia'];
$id_conductor = $_POST['id_conductor'];
$id_acompanante = !empty($_POST['id_acompanante']) ? $_POST['id_acompanante'] : null;
$id_elemento = !empty($_POST['id_elemento']) ? $_POST['id_elemento'] : null;
$id_ruta = $_POST['id_ruta'];
$estado_inicial = 'Pendiente';

$sql_insert = "INSERT INTO Traslado (fecha, hora_salida, estado, id_ambulancia, id_conductor, id_acompanante, id_elemento, id_ruta, id_funcionario) VALUES (CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?, ?)";
$stmt_insert = $con->prepare($sql_insert);
$stmt_insert->bind_param("siiiiii", $estado_inicial, $id_ambulancia, $id_conductor, $id_acompanante, $id_elemento, $id_ruta, $_SESSION['id_funcionario']);
$stmt_insert->execute();
$stmt_insert->close();

echo json_encode(['exito' => true]);
$con->close();
