<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion();

require_once __DIR__ . '/conexion.php';

// secuencia de estados de un traslado: cada "Avanzar" pasa al siguiente
$secuencia_estados = ['Pendiente', 'En curso', 'Llegado a destino', 'Retornando', 'Finalizado'];

$id_traslado = $_POST['id_traslado'];

$stmt_actual = $con->prepare("SELECT estado, hora_llegada FROM Traslado WHERE id_traslado = ?");
$stmt_actual->bind_param("i", $id_traslado);
$stmt_actual->execute();
$traslado_actual = $stmt_actual->get_result()->fetch_assoc();
$stmt_actual->close();

if ($traslado_actual) {
    $indice_actual = array_search($traslado_actual['estado'], $secuencia_estados);
    if ($indice_actual !== false && $indice_actual < count($secuencia_estados) - 1) {
        $nuevo_estado = $secuencia_estados[$indice_actual + 1];

        if ($nuevo_estado === 'Finalizado' && empty($traslado_actual['hora_llegada'])) {
            $stmt_update = $con->prepare("UPDATE Traslado SET estado = ?, hora_llegada = CURTIME() WHERE id_traslado = ?");
        } else {
            $stmt_update = $con->prepare("UPDATE Traslado SET estado = ? WHERE id_traslado = ?");
        }
        $stmt_update->bind_param("si", $nuevo_estado, $id_traslado);
        $stmt_update->execute();
        $stmt_update->close();
    }
}

echo json_encode(['exito' => true]);
$con->close();
