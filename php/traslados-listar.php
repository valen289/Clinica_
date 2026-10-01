<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion();

require_once __DIR__ . '/conexion.php';

// datos para poblar los <select> del formulario
$ambulancias_disponibles = $con->query("SELECT id_ambulancia, matricula FROM Ambulancia WHERE estado = 'Disponible'");
$conductores_disponibles = $con->query("SELECT id_ci, nombre, apellido FROM Conductor WHERE estado = 'Activo'");
$acompanantes = $con->query("SELECT id_ci, nombre, apellido FROM Acompaniante");
$elementos = $con->query("SELECT id_elemento, tipo FROM Elemento_traslado");
$rutas = $con->query("SELECT id_ruta, origen, destino FROM Ruta");

// listado de traslados ya despachados, con datos legibles en vez de ids sueltos
$sql_listado = "SELECT t.id_traslado, t.fecha, t.hora_salida, t.estado,
                       a.matricula,
                       c.nombre AS conductor_nombre, c.apellido AS conductor_apellido,
                       r.origen, r.destino
                FROM Traslado t
                INNER JOIN Ambulancia a ON t.id_ambulancia = a.id_ambulancia
                INNER JOIN Conductor c ON t.id_conductor = c.id_ci
                INNER JOIN Ruta r ON t.id_ruta = r.id_ruta
                ORDER BY t.id_traslado DESC";
$resultado_traslados = $con->query($sql_listado);

echo json_encode([
    'exito' => true,
    'datos' => [
        'ambulancias_disponibles' => filas($ambulancias_disponibles),
        'conductores_disponibles' => filas($conductores_disponibles),
        'acompanantes' => filas($acompanantes),
        'elementos' => filas($elementos),
        'rutas' => filas($rutas),
        'traslados' => filas($resultado_traslados),
    ],
]);

$con->close();
