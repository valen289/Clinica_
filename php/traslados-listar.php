<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion();

require_once __DIR__ . '/conexion.php';

// un traslado "activo" es cualquiera que todavía no terminó: mientras dure, su ambulancia,
// su conductor y su acompañante están ocupados y no se ofrecen para otro despacho
$EN_TRASLADO = "SELECT %s FROM Traslado WHERE estado <> 'Finalizado' AND %s IS NOT NULL";

// datos para poblar los <select> del formulario
$ambulancias_disponibles = $con->query("SELECT id_ambulancia, matricula FROM Ambulancia
                                        WHERE estado = 'Disponible'
                                          AND id_ambulancia NOT IN (" . sprintf($EN_TRASLADO, 'id_ambulancia', 'id_ambulancia') . ")
                                        ORDER BY matricula");
$conductores_disponibles = $con->query("SELECT id_ci, nombre, apellido FROM Conductor
                                        WHERE estado = 'Activo'
                                          AND id_ci NOT IN (" . sprintf($EN_TRASLADO, 'id_conductor', 'id_conductor') . ")
                                        ORDER BY apellido, nombre");
$acompanantes = $con->query("SELECT id_ci, nombre, apellido FROM Acompaniante
                             WHERE estado = 'Activo'
                               AND id_ci NOT IN (" . sprintf($EN_TRASLADO, 'id_acompanante', 'id_acompanante') . ")
                             ORDER BY apellido, nombre");
$elementos = $con->query("SELECT id_elemento, tipo FROM Elemento_traslado");
$rutas = $con->query("SELECT id_ruta, origen, destino FROM Ruta");
$pacientes = $con->query("SELECT id_ci, nombre, apellido FROM Paciente ORDER BY apellido, nombre");

// listado de traslados ya despachados, con datos legibles en vez de ids sueltos
$sql_listado = "SELECT t.id_traslado, t.fecha, t.hora_salida, t.hora_llegada, t.estado,
                       a.matricula,
                       c.nombre AS conductor_nombre, c.apellido AS conductor_apellido,
                       r.origen, r.destino,
                       p.nombre AS paciente_nombre, p.apellido AS paciente_apellido
                FROM Traslado t
                INNER JOIN Ambulancia a ON t.id_ambulancia = a.id_ambulancia
                INNER JOIN Conductor c ON t.id_conductor = c.id_ci
                INNER JOIN Ruta r ON t.id_ruta = r.id_ruta
                LEFT JOIN Paciente p ON t.id_paciente = p.id_ci
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
        'pacientes' => filas($pacientes),
        'traslados' => filas($resultado_traslados),
    ],
]);

$con->close();
