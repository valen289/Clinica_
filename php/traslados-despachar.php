<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion();

require_once __DIR__ . '/conexion.php';

function responder_error($mensaje) {
    http_response_code(422);
    echo json_encode(['exito' => false, 'error' => $mensaje]);
    exit;
}

// cuenta filas de una consulta con un solo parámetro entero
function existe($con, $sql, $id) {
    $stmt = $con->prepare($sql);
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $hay = $stmt->get_result()->num_rows > 0;
    $stmt->close();
    return $hay;
}

$id_ambulancia = (int) ($_POST['id_ambulancia'] ?? 0);
$id_conductor = (int) ($_POST['id_conductor'] ?? 0);
$id_acompanante = !empty($_POST['id_acompanante']) ? (int) $_POST['id_acompanante'] : null;
$id_elemento = !empty($_POST['id_elemento']) ? (int) $_POST['id_elemento'] : null;
$id_ruta = (int) ($_POST['id_ruta'] ?? 0);
$id_paciente = !empty($_POST['id_paciente']) ? (int) $_POST['id_paciente'] : null;
$estado_inicial = 'Pendiente';

if (!$id_ambulancia || !$id_conductor || !$id_ruta) {
    responder_error('Elegí ambulancia, conductor y ruta.');
}

// el formulario ya muestra solo lo libre, pero se vuelve a controlar acá:
// otra persona pudo haber despachado la misma ambulancia un segundo antes
$ACTIVO = "estado <> 'Finalizado'";
if (!existe($con, "SELECT 1 FROM Ambulancia WHERE id_ambulancia = ? AND estado = 'Disponible'", $id_ambulancia)) {
    responder_error('Esa ambulancia no está disponible.');
}
if (existe($con, "SELECT 1 FROM Traslado WHERE id_ambulancia = ? AND $ACTIVO", $id_ambulancia)) {
    responder_error('Esa ambulancia ya está en otro traslado.');
}
if (!existe($con, "SELECT 1 FROM Conductor WHERE id_ci = ? AND estado = 'Activo'", $id_conductor)) {
    responder_error('Ese conductor no está activo.');
}
if (existe($con, "SELECT 1 FROM Traslado WHERE id_conductor = ? AND $ACTIVO", $id_conductor)) {
    responder_error('Ese conductor ya está en otro traslado.');
}
if ($id_acompanante && existe($con, "SELECT 1 FROM Traslado WHERE id_acompanante = ? AND $ACTIVO", $id_acompanante)) {
    responder_error('Ese acompañante ya está en otro traslado.');
}
if (!existe($con, "SELECT 1 FROM Ruta WHERE id_ruta = ?", $id_ruta)) {
    responder_error('La ruta elegida no existe.');
}
if ($id_paciente && !existe($con, "SELECT 1 FROM Paciente WHERE id_ci = ?", $id_paciente)) {
    responder_error('El paciente elegido no existe.');
}

$sql_insert = "INSERT INTO Traslado (fecha, hora_salida, estado, id_ambulancia, id_conductor, id_acompanante, id_elemento, id_ruta, id_paciente, id_funcionario) VALUES (CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?, ?, ?)";
$stmt_insert = $con->prepare($sql_insert);
$stmt_insert->bind_param("siiiiiii", $estado_inicial, $id_ambulancia, $id_conductor, $id_acompanante, $id_elemento, $id_ruta, $id_paciente, $_SESSION['id_funcionario']);
$stmt_insert->execute();
$stmt_insert->close();

echo json_encode(['exito' => true]);
$con->close();
