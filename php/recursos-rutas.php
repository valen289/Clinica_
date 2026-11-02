<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion(['Chofer']);

require_once __DIR__ . '/conexion.php';

function responder_error($mensaje) {
    http_response_code(422);
    echo json_encode(['exito' => false, 'error' => $mensaje]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['eliminar_ruta'])) {

    $id_borrar = (int) $_POST['id_ruta'];

    // una ruta que ya se usó en traslados no se puede borrar (la referencian): se avisa en vez de fallar callado
    try {
        $stmt_borrar = $con->prepare("DELETE FROM Ruta WHERE id_ruta = ?");
        $stmt_borrar->bind_param("i", $id_borrar);
        $stmt_borrar->execute();
        $stmt_borrar->close();
    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() !== ERROR_EN_USO) throw $e;
        responder_error('No se puede eliminar: la ruta ya se usó en traslados.');
    }

    echo json_encode(['exito' => true]);
    $con->close();
    exit;
}

// Alta y modificación comparten el mismo POST; se distinguen por si viene o no id_ruta_editar
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['guardar_ruta'])) {

    $nombre_ruta = trim($_POST['nombre_ruta'] ?? '');
    $origen = trim($_POST['origen'] ?? '');
    $destino = trim($_POST['destino'] ?? '');
    $distancia = ($_POST['distancia'] ?? '') !== '' ? $_POST['distancia'] : null;
    $descripcion = trim($_POST['descripcion'] ?? '');

    if ($origen === '' || $destino === '') {
        responder_error('Completá origen y destino.');
    }
    if ($distancia !== null && (!is_numeric($distancia) || $distancia < 0)) {
        responder_error('La distancia tiene que ser un número de kilómetros.');
    }

    if (!empty($_POST['id_ruta_editar'])) {
        $id_editar = $_POST['id_ruta_editar'];

        $sql_update = "UPDATE Ruta SET nombre_ruta = ?, origen = ?, destino = ?, distancia = ?, descripcion = ? WHERE id_ruta = ?";
        $stmt_update = $con->prepare($sql_update);
        $stmt_update->bind_param("sssdsi", $nombre_ruta, $origen, $destino, $distancia, $descripcion, $id_editar);
        $stmt_update->execute();
        $stmt_update->close();
    } else {
        $sql_insert = "INSERT INTO Ruta (nombre_ruta, origen, destino, distancia, descripcion) VALUES (?, ?, ?, ?, ?)";
        $stmt_insert = $con->prepare($sql_insert);
        $stmt_insert->bind_param("sssds", $nombre_ruta, $origen, $destino, $distancia, $descripcion);
        $stmt_insert->execute();
        $stmt_insert->close();
    }

    echo json_encode(['exito' => true]);
    $con->close();
    exit;
}

// Listado (GET)
$sql_listado = "SELECT id_ruta, nombre_ruta, origen, destino, distancia, descripcion FROM Ruta ORDER BY id_ruta DESC";
$resultado_rutas = $con->query($sql_listado);

echo json_encode(['exito' => true, 'datos' => filas($resultado_rutas)]);
$con->close();
