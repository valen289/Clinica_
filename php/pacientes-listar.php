<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion(['Chofer']);

require_once __DIR__ . '/conexion.php';

// una fila por paciente con el conteo de sus estudios (agrupado por la PK, así que el resto de columnas es seguro)
$sql = "SELECT p.id_ci, p.nombre, p.apellido, p.telefono, p.email, p.fecha_nacimiento, p.fecha_alta,
               COUNT(e.id_estudio) AS estudios,
               COALESCE(SUM(e.estado = 'Pendiente'), 0) AS estudios_pendientes,
               COALESCE(SUM(e.estado = 'Disponible'), 0) AS estudios_disponibles
        FROM Paciente p
        LEFT JOIN Estudio e ON e.id_paciente = p.id_ci
        GROUP BY p.id_ci
        ORDER BY p.apellido, p.nombre";

echo json_encode(['exito' => true, 'datos' => filas($con->query($sql))]);
$con->close();
