<?php

header('Content-Type: application/json');

require_once __DIR__ . '/conexion.php';

$id_documento = $_GET['id'] ?? null;

$sql = "SELECT titulo, descripcion, departamento, archivo, fecha_carga FROM Documento WHERE id_documento = ?";
$stmt = $con->prepare($sql);
$stmt->bind_param("i", $id_documento);
$stmt->execute();
$documento = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$documento) {
    echo json_encode(['exito' => true, 'datos' => null]);
    $con->close();
    exit;
}

$stmt_instrucciones = $con->prepare("SELECT texto_instruccion, es_pauta_alarma FROM Instruccion WHERE id_documento = ? ORDER BY orden");
$stmt_instrucciones->bind_param("i", $id_documento);
$stmt_instrucciones->execute();
$resultado_instrucciones = $stmt_instrucciones->get_result();
$documento['instrucciones'] = filas($resultado_instrucciones);
$stmt_instrucciones->close();

echo json_encode(['exito' => true, 'datos' => $documento]);
$con->close();
