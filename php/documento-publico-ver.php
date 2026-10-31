<?php

header('Content-Type: application/json');

require_once __DIR__ . '/conexion.php';

// Página pública (la abre cualquiera que escanee el QR, sin iniciar sesión).
// El documento se busca por el token del QR, nunca por el id: así no se pueden recorrer probando números.
$token = strtolower(trim($_GET['t'] ?? ''));

if (!preg_match('/^[a-f0-9]{32}$/', $token)) {
    echo json_encode(['exito' => true, 'datos' => null]);
    exit;
}

$sql = "SELECT d.id_documento, d.titulo, d.descripcion, d.departamento, d.archivo, d.fecha_carga
        FROM Codigo_qr q
        INNER JOIN Documento d ON d.id_documento = q.id_documento
        WHERE q.token = ?";
$stmt = $con->prepare($sql);
$stmt->bind_param("s", $token);
$stmt->execute();
$documento = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$documento) {
    echo json_encode(['exito' => true, 'datos' => null]);
    $con->close();
    exit;
}

$stmt_instrucciones = $con->prepare("SELECT texto_instruccion, es_pauta_alarma FROM Instruccion WHERE id_documento = ? ORDER BY orden");
$stmt_instrucciones->bind_param("i", $documento['id_documento']);
$stmt_instrucciones->execute();
$resultado_instrucciones = $stmt_instrucciones->get_result();
$documento['instrucciones'] = filas($resultado_instrucciones);
$stmt_instrucciones->close();

// el id interno no hace falta afuera
unset($documento['id_documento']);

echo json_encode(['exito' => true, 'datos' => $documento]);
$con->close();
