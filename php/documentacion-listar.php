<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion(['Chofer']);

require_once __DIR__ . '/conexion.php';

$sql_listado = "SELECT d.id_documento, d.titulo, d.descripcion, d.departamento, d.archivo, d.fecha_carga, q.codigo, q.url
                FROM Documento d LEFT JOIN Codigo_qr q ON q.id_documento = d.id_documento
                ORDER BY d.id_documento DESC";
$resultado_documentos = $con->query($sql_listado);

$documentos = [];
while ($doc = $resultado_documentos->fetch_assoc()) {

    $stmt_instrucciones = $con->prepare("SELECT texto_instruccion, es_pauta_alarma FROM Instruccion WHERE id_documento = ? ORDER BY orden");
    $stmt_instrucciones->bind_param("i", $doc['id_documento']);
    $stmt_instrucciones->execute();
    $resultado_instrucciones = $stmt_instrucciones->get_result();
    $doc['instrucciones'] = filas($resultado_instrucciones);
    $stmt_instrucciones->close();

    $documentos[] = $doc;
}

echo json_encode(['exito' => true, 'datos' => $documentos]);
$con->close();
