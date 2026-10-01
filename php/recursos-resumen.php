<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion(['Chofer']);

require_once __DIR__ . '/conexion.php';

$total_ambulancias = $con->query("SELECT COUNT(*) AS total FROM Ambulancia")->fetch_assoc()['total'];
$total_conductores = $con->query("SELECT COUNT(*) AS total FROM Conductor")->fetch_assoc()['total'];
$total_acompanantes = $con->query("SELECT COUNT(*) AS total FROM Acompaniante")->fetch_assoc()['total'];
$total_personal = $total_conductores + $total_acompanantes;
$total_rutas = $con->query("SELECT COUNT(*) AS total FROM Ruta")->fetch_assoc()['total'];

echo json_encode([
    'exito' => true,
    'datos' => [
        'total_ambulancias' => (int) $total_ambulancias,
        'total_personal' => (int) $total_personal,
        'total_rutas' => (int) $total_rutas,
    ],
]);

$con->close();
