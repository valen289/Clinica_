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

// Borrar: el personal vive repartido en dos tablas (Conductor y Acompaniante); "tipo" dice en cual buscar
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['eliminar_personal'])) {

    $id_borrar = (int) $_POST['id_ci'];
    $tabla = ($_POST['tipo'] === 'conductor') ? 'Conductor' : 'Acompaniante';

    // si ya participó en traslados la base no deja borrarlo: se avisa en vez de fallar callado
    try {
        $stmt_borrar = $con->prepare("DELETE FROM $tabla WHERE id_ci = ?");
        $stmt_borrar->bind_param("i", $id_borrar);
        $stmt_borrar->execute();
        $stmt_borrar->close();
    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() !== ERROR_EN_USO) throw $e;
        responder_error('No se puede eliminar: tiene traslados registrados. Si ya no trabaja, cambiale el estado a "De Licencia".');
    }

    echo json_encode(['exito' => true]);
    $con->close();
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['guardar_personal'])) {

    $nombre = trim($_POST['nombre'] ?? '');
    $apellido = trim($_POST['apellido'] ?? '');
    $rol = $_POST['rol'] ?? '';
    $estado = $_POST['estado'] ?? '';
    $es_conductor_nuevo = ($rol === 'Conductor Profesional');

    $id_ci_editar = !empty($_POST['id_ci_editar']) ? $_POST['id_ci_editar'] : null;
    $tipo_editar = !empty($_POST['tipo_editar']) ? $_POST['tipo_editar'] : null;

    if ($nombre === '' || $apellido === '' || $rol === '' || $estado === '') {
        responder_error('Completá nombre, apellido, rol y estado.');
    }
    if (!$id_ci_editar && empty($_POST['id_ci'])) {
        responder_error('Ingresá la cédula.');
    }

    // todo junto: si el cambio de rol borra de una tabla y falla al insertar en la otra, no se pierde a nadie
    $con->begin_transaction();
    try {
        if ($id_ci_editar) {
            // modo edición: si el rol elegido cambia de "familia" (conductor <-> acompañante),
            // hay que mover la fila de tabla: borrar de la vieja e insertar en la nueva
            $era_conductor = ($tipo_editar === 'conductor');

            if ($era_conductor && $es_conductor_nuevo) {
                $stmt = $con->prepare("UPDATE Conductor SET nombre = ?, apellido = ?, estado = ? WHERE id_ci = ?");
                $stmt->bind_param("sssi", $nombre, $apellido, $estado, $id_ci_editar);
                $stmt->execute();
                $stmt->close();
            } elseif (!$era_conductor && !$es_conductor_nuevo) {
                $stmt = $con->prepare("UPDATE Acompaniante SET nombre = ?, apellido = ?, rol = ?, estado = ? WHERE id_ci = ?");
                $stmt->bind_param("ssssi", $nombre, $apellido, $rol, $estado, $id_ci_editar);
                $stmt->execute();
                $stmt->close();
            } else {
                // cambia de familia: borro de la tabla original y doy de alta en la nueva
                $tabla_vieja = $era_conductor ? 'Conductor' : 'Acompaniante';
                $stmt_borrar = $con->prepare("DELETE FROM $tabla_vieja WHERE id_ci = ?");
                $stmt_borrar->bind_param("i", $id_ci_editar);
                $stmt_borrar->execute();
                $stmt_borrar->close();

                if ($es_conductor_nuevo) {
                    $stmt = $con->prepare("INSERT INTO Conductor (id_ci, nombre, apellido, estado) VALUES (?, ?, ?, ?)");
                    $stmt->bind_param("isss", $id_ci_editar, $nombre, $apellido, $estado);
                } else {
                    $stmt = $con->prepare("INSERT INTO Acompaniante (id_ci, nombre, apellido, rol, estado) VALUES (?, ?, ?, ?, ?)");
                    $stmt->bind_param("issss", $id_ci_editar, $nombre, $apellido, $rol, $estado);
                }
                $stmt->execute();
                $stmt->close();
            }
        } else {
            // modo alta: la cédula es la clave primaria, la ingresa el usuario
            $id_ci = $_POST['id_ci'];

            if ($es_conductor_nuevo) {
                $stmt = $con->prepare("INSERT INTO Conductor (id_ci, nombre, apellido, estado) VALUES (?, ?, ?, ?)");
                $stmt->bind_param("isss", $id_ci, $nombre, $apellido, $estado);
            } else {
                $stmt = $con->prepare("INSERT INTO Acompaniante (id_ci, nombre, apellido, rol, estado) VALUES (?, ?, ?, ?, ?)");
                $stmt->bind_param("issss", $id_ci, $nombre, $apellido, $rol, $estado);
            }
            $stmt->execute();
            $stmt->close();
        }
        $con->commit();
    } catch (mysqli_sql_exception $e) {
        $con->rollback();
        if ($e->getCode() === ERROR_DUPLICADO) {
            responder_error('Ya hay alguien registrado con esa cédula.');
        }
        if ($e->getCode() === ERROR_EN_USO) {
            responder_error('No se puede cambiar entre conductor y acompañante a alguien con traslados registrados.');
        }
        throw $e;
    }

    echo json_encode(['exito' => true]);
    $con->close();
    exit;
}

// Listado unificado (GET): conductores y acompañantes en una sola nómina, con el "tipo" real de cada uno
$sql_listado = "SELECT id_ci, nombre, apellido, 'Conductor' AS rol, estado, 'conductor' AS tipo FROM Conductor
                 UNION ALL
                 SELECT id_ci, nombre, apellido, rol, estado, 'acompanante' AS tipo FROM Acompaniante
                 ORDER BY id_ci DESC";
$resultado_personal = $con->query($sql_listado);

echo json_encode(['exito' => true, 'datos' => filas($resultado_personal)]);
$con->close();
