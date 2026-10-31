<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
// la cédula sale de la sesión, nunca de la URL: un paciente solo puede pedir lo suyo
$ci = requerir_paciente();

require_once __DIR__ . '/conexion.php';

$stmt = $con->prepare("SELECT id_ci, nombre, apellido, fecha_nacimiento, telefono, email, direccion, cuenta_activada FROM Paciente WHERE id_ci = ?");
$stmt->bind_param("i", $ci);
$stmt->execute();
$paciente = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$paciente) {
    // el paciente se borró mientras tenía la sesión abierta
    http_response_code(401);
    echo json_encode(['error' => 'No autenticado']);
    $con->close();
    exit;
}

// las observaciones y el PDF se muestran solo cuando el resultado está disponible:
// mientras está pendiente el paciente ve el estudio como "en proceso"
$stmt = $con->prepare("SELECT id_estudio, tipo, titulo, fecha_estudio, estado,
                              (archivo <> '' AND estado = 'Disponible') AS tiene_pdf,
                              IF(estado = 'Disponible', observaciones, NULL) AS observaciones
                       FROM Estudio
                       WHERE id_paciente = ?
                       ORDER BY fecha_estudio DESC, id_estudio DESC");
$stmt->bind_param("i", $ci);
$stmt->execute();
$paciente['estudios'] = filas($stmt->get_result());
$stmt->close();

// el token abre la vista del documento (la misma que se ve al escanear el QR)
$stmt = $con->prepare("SELECT d.id_documento, d.titulo, d.descripcion, d.departamento, pd.fecha_asignacion, q.token
                       FROM Paciente_documento pd
                       INNER JOIN Documento d ON d.id_documento = pd.id_documento
                       LEFT JOIN Codigo_qr q ON q.id_documento = d.id_documento
                       WHERE pd.id_paciente = ?
                       ORDER BY pd.fecha_asignacion DESC, d.titulo");
$stmt->bind_param("i", $ci);
$stmt->execute();
$paciente['documentos'] = filas($stmt->get_result());
$stmt->close();

echo json_encode(['exito' => true, 'datos' => $paciente]);
$con->close();
