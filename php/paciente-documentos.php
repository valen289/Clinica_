<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion(['Chofer']);

require_once __DIR__ . '/conexion.php';

// asigna o quita un documento de pautas a un paciente
$accion = $_POST['accion'] ?? '';
$id_paciente = (int) ($_POST['id_paciente'] ?? 0);
$id_documento = (int) ($_POST['id_documento'] ?? 0);

if ($accion === 'asignar') {
    // INSERT IGNORE: si ya lo tenía asignado (doble clic, dos pestañas) no es un error
    $stmt = $con->prepare("INSERT IGNORE INTO Paciente_documento (id_paciente, id_documento, fecha_asignacion, id_funcionario)
                           SELECT p.id_ci, d.id_documento, CURDATE(), ?
                           FROM Paciente p, Documento d
                           WHERE p.id_ci = ? AND d.id_documento = ?");
    $stmt->bind_param("iii", $_SESSION['id_funcionario'], $id_paciente, $id_documento);
} elseif ($accion === 'quitar') {
    $stmt = $con->prepare("DELETE FROM Paciente_documento WHERE id_paciente = ? AND id_documento = ?");
    $stmt->bind_param("ii", $id_paciente, $id_documento);
} else {
    http_response_code(422);
    echo json_encode(['exito' => false, 'error' => 'Acción no válida.']);
    exit;
}

$stmt->execute();
$stmt->close();

echo json_encode(['exito' => true]);
$con->close();
