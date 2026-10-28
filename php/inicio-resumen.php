<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion();

require_once __DIR__ . '/conexion.php';

function contar($con, $sql) {
    return (int) $con->query($sql)->fetch_assoc()['total'];
}

// 'Preparado' es el default de la tabla y 'Pendiente' el que pone el despacho: los dos son "esperando salida"
$traslados = [
    'hoy' => contar($con, "SELECT COUNT(*) AS total FROM Traslado WHERE fecha = CURDATE()"),
    'pendientes' => contar($con, "SELECT COUNT(*) AS total FROM Traslado WHERE estado IN ('Pendiente', 'Preparado')"),
    'en_curso' => contar($con, "SELECT COUNT(*) AS total FROM Traslado WHERE estado IN ('En curso', 'Llegado a destino', 'Retornando')"),
    'finalizados_hoy' => contar($con, "SELECT COUNT(*) AS total FROM Traslado WHERE estado = 'Finalizado' AND fecha = CURDATE()"),
];

$sql_recientes = "SELECT t.id_traslado, t.fecha, t.hora_salida, t.estado,
                         a.matricula,
                         c.nombre AS conductor_nombre, c.apellido AS conductor_apellido,
                         r.origen, r.destino
                  FROM Traslado t
                  INNER JOIN Ambulancia a ON t.id_ambulancia = a.id_ambulancia
                  INNER JOIN Conductor c ON t.id_conductor = c.id_ci
                  INNER JOIN Ruta r ON t.id_ruta = r.id_ruta
                  ORDER BY t.id_traslado DESC
                  LIMIT 5";
$traslados['recientes'] = filas($con->query($sql_recientes));

$ambulancias = ['total' => 0, 'disponibles' => 0, 'mantenimiento' => 0, 'fuera_servicio' => 0];
$resultado_ambulancias = $con->query("SELECT estado, COUNT(*) AS total FROM Ambulancia GROUP BY estado");
while ($fila = $resultado_ambulancias->fetch_assoc()) {
    $ambulancias['total'] += (int) $fila['total'];
    if ($fila['estado'] === 'Disponible') $ambulancias['disponibles'] = (int) $fila['total'];
    if ($fila['estado'] === 'Mantenimiento') $ambulancias['mantenimiento'] = (int) $fila['total'];
    if ($fila['estado'] === 'Fuera de Servicio') $ambulancias['fuera_servicio'] = (int) $fila['total'];
}

$datos = [
    'traslados' => $traslados,
    'ambulancias' => $ambulancias,
    'documentos' => null,
];

// los choferes no trabajan con folletos: a ellos no se les mandan esos datos
if ($_SESSION['rol'] !== 'Chofer') {
    $datos['documentos'] = [
        'total' => contar($con, "SELECT COUNT(*) AS total FROM Documento"),
        'con_pdf' => contar($con, "SELECT COUNT(*) AS total FROM Documento WHERE archivo <> ''"),
        'ultima_semana' => contar($con, "SELECT COUNT(*) AS total FROM Documento WHERE fecha_carga >= CURDATE() - INTERVAL 7 DAY"),
        // mismo criterio que documentacion.js: menos de 2 indicaciones que no son pauta de alarma
        'incompletos' => contar($con, "SELECT COUNT(*) AS total FROM Documento d
                                       WHERE (SELECT COUNT(*) FROM Instruccion i
                                              WHERE i.id_documento = d.id_documento AND i.es_pauta_alarma = 0) < 2"),
    ];
}

echo json_encode(['exito' => true, 'datos' => $datos]);
$con->close();
