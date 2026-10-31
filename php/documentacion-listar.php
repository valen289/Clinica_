<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion(['Chofer']);

require_once __DIR__ . '/conexion.php';

$sql_listado = "SELECT d.id_documento, d.titulo, d.descripcion, d.departamento, d.archivo, d.fecha_carga, q.codigo, q.url, q.token
                FROM Documento d LEFT JOIN Codigo_qr q ON q.id_documento = d.id_documento
                ORDER BY d.id_documento DESC";
$resultado_documentos = $con->query($sql_listado);

$documentos = [];
while ($doc = $resultado_documentos->fetch_assoc()) {
    $doc['instrucciones'] = [];
    $documentos[$doc['id_documento']] = $doc;
}

// una sola consulta para todas las instrucciones (en vez de una por documento)
$resultado_instrucciones = $con->query("SELECT id_documento, texto_instruccion, es_pauta_alarma FROM Instruccion ORDER BY id_documento, orden");
while ($instruccion = $resultado_instrucciones->fetch_assoc()) {
    $id_doc = $instruccion['id_documento'];
    if (isset($documentos[$id_doc])) {
        unset($instruccion['id_documento']);
        $documentos[$id_doc]['instrucciones'][] = $instruccion;
    }
}

echo json_encode(['exito' => true, 'datos' => array_values($documentos)]);
$con->close();
