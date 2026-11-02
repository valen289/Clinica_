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

// Borrar
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['eliminar_ambulancia'])) {

    $id_borrar = (int) $_POST['id_ambulancia'];

    // si ya hizo traslados la base no deja borrarla (los traslados la referencian): se avisa en vez de fallar callado
    try {
        $stmt_borrar = $con->prepare("DELETE FROM Ambulancia WHERE id_ambulancia = ?");
        $stmt_borrar->bind_param("i", $id_borrar);
        $stmt_borrar->execute();
        $stmt_borrar->close();
    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() !== ERROR_EN_USO) throw $e;
        responder_error('No se puede eliminar: la ambulancia tiene traslados registrados. Si ya no se usa, cambiale el estado a "Fuera de Servicio".');
    }

    echo json_encode(['exito' => true]);
    $con->close();
    exit;
}

// Alta y modificación comparten el mismo POST; se distinguen por si viene o no id_ambulancia_editar
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['guardar_ambulancia'])) {

    $matricula = strtoupper(trim($_POST['matricula'] ?? ''));
    $marca = trim($_POST['marca'] ?? '');
    $modelo = trim($_POST['modelo'] ?? '');
    $estado = $_POST['estado'] ?? '';

    if ($matricula === '' || $marca === '' || $modelo === '') {
        responder_error('Completá matrícula, marca y modelo.');
    }
    if (!in_array($estado, ['Disponible', 'Mantenimiento', 'Fuera de Servicio'], true)) {
        responder_error('Elegí un estado válido.');
    }

    // la matrícula no se puede repetir (en edición se ignora la propia ambulancia)
    $id_propio = (int) ($_POST['id_ambulancia_editar'] ?? 0);
    $stmt = $con->prepare("SELECT 1 FROM Ambulancia WHERE matricula = ? AND id_ambulancia <> ?");
    $stmt->bind_param("si", $matricula, $id_propio);
    $stmt->execute();
    $repetida = $stmt->get_result()->num_rows > 0;
    $stmt->close();
    if ($repetida) {
        responder_error('Ya hay una ambulancia con la matrícula ' . $matricula . '.');
    }

    if (!empty($_POST['id_ambulancia_editar'])) {
        // modo edición: actualiza la fila existente
        $id_editar = $_POST['id_ambulancia_editar'];

        $sql_update = "UPDATE Ambulancia SET matricula = ?, marca = ?, modelo = ?, estado = ? WHERE id_ambulancia = ?";
        $stmt_update = $con->prepare($sql_update);
        $stmt_update->bind_param("ssssi", $matricula, $marca, $modelo, $estado, $id_editar);
        $stmt_update->execute();
        $stmt_update->close();
    } else {
        // modo alta: inserta una fila nueva
        $sql_insert = "INSERT INTO Ambulancia (matricula, marca, modelo, estado) VALUES (?, ?, ?, ?)";
        $stmt_insert = $con->prepare($sql_insert);
        $stmt_insert->bind_param("ssss", $matricula, $marca, $modelo, $estado);
        $stmt_insert->execute();
        $stmt_insert->close();
    }

    echo json_encode(['exito' => true]);
    $con->close();
    exit;
}

// Listado (GET)
$sql_listado = "SELECT id_ambulancia, matricula, marca, modelo, estado FROM Ambulancia ORDER BY id_ambulancia DESC";
$resultado_ambulancias = $con->query($sql_listado);

echo json_encode(['exito' => true, 'datos' => filas($resultado_ambulancias)]);
$con->close();
