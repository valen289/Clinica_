<?php

session_start();

if (!isset($_SESSION['id_funcionario'])) {
    header("Location: ../../index.html");
    exit;
}

$pagina_actual = 'recursos';
$tab_activo = 'personal';

require_once '../../config/conexion.php';
require_once '../../includes/iconos.php';

// El personal vive repartido en dos tablas (Conductor y Acompaniante); "tipo" en la URL/form dice en cual buscar
if (isset($_GET['eliminar']) && isset($_GET['tipo'])) {
    $id_borrar = $_GET['eliminar'];
    $tabla = ($_GET['tipo'] === 'conductor') ? 'Conductor' : 'Acompaniante';

    $stmt_borrar = $con->prepare("DELETE FROM $tabla WHERE id_ci = ?");
    $stmt_borrar->bind_param("i", $id_borrar);
    $stmt_borrar->execute();
    $stmt_borrar->close();

    header("Location: personal.php");
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['guardar_personal'])) {

    $nombre = trim($_POST['nombre']);
    $apellido = trim($_POST['apellido']);
    $rol = $_POST['rol'];
    $estado = $_POST['estado'];
    $es_conductor_nuevo = ($rol === 'Conductor Profesional');

    $id_ci_editar = !empty($_POST['id_ci_editar']) ? $_POST['id_ci_editar'] : null;
    $tipo_editar = !empty($_POST['tipo_editar']) ? $_POST['tipo_editar'] : null;

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

    header("Location: personal.php");
    exit;
}

// Si venimos de un link "Editar", traemos a la persona (de la tabla que corresponda) para precargar el formulario
$persona_editar = null;
if (isset($_GET['editar']) && isset($_GET['tipo'])) {
    $id_editar = $_GET['editar'];

    if ($_GET['tipo'] === 'conductor') {
        $stmt_editar = $con->prepare("SELECT id_ci, nombre, apellido, 'Conductor Profesional' AS rol, estado FROM Conductor WHERE id_ci = ?");
    } else {
        $stmt_editar = $con->prepare("SELECT id_ci, nombre, apellido, rol, estado FROM Acompaniante WHERE id_ci = ?");
    }
    $stmt_editar->bind_param("i", $id_editar);
    $stmt_editar->execute();
    $persona_editar = $stmt_editar->get_result()->fetch_assoc();
    $stmt_editar->close();
    $tipo_editar_actual = $_GET['tipo'];
}

// Listado unificado: conductores y acompañantes en una sola nómina, con el "tipo" real de cada uno para poder editarlos/borrarlos
$sql_listado = "SELECT id_ci, nombre, apellido, 'Conductor' AS rol, estado, 'conductor' AS tipo FROM Conductor
                 UNION ALL
                 SELECT id_ci, nombre, apellido, rol, estado, 'acompanante' AS tipo FROM Acompaniante
                 ORDER BY id_ci DESC";
$resultado_personal = $con->query($sql_listado);
$total_personal = $resultado_personal->num_rows;

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SIGSM - ABM Personal Operativo</title>
    <link rel="stylesheet" href="<?php echo BASE_URL; ?>assets/css/estilos.css?v=<?php echo filemtime(__DIR__ . '/../../assets/css/estilos.css'); ?>">
</head>
<body>

    <?php require_once '../../includes/header.php'; ?>

    <div class="layout">
        <?php require_once '../../includes/sidebar.php'; ?>

        <main class="contenido">

    <?php require_once '../../includes/recursos_header.php'; ?>

<div class="tarjetas-portal">

    <section class="tarjeta tarjeta-formulario">
        <h3><?php echo icono($persona_editar ? 'pencil' : 'plus'); ?><?php echo $persona_editar ? 'Editar Personal Operativo' : 'Registrar Personal Operativo'; ?></h3>
        <form action="personal.php" method="POST">
            <input type="hidden" name="id_ci_editar" value="<?php echo $persona_editar ? htmlspecialchars($persona_editar['id_ci']) : ''; ?>">
            <input type="hidden" name="tipo_editar" value="<?php echo $persona_editar ? htmlspecialchars($tipo_editar_actual) : ''; ?>">

            <label for="id_ci">Cédula de Identidad (C.I.):</label>
            <input type="number" id="id_ci" name="id_ci" placeholder="3.888.999-0" value="<?php echo $persona_editar ? htmlspecialchars($persona_editar['id_ci']) : ''; ?>" <?php echo $persona_editar ? 'readonly' : 'required'; ?>>

            <label for="nombre">Nombre:</label>
            <input type="text" id="nombre" name="nombre" placeholder="Ej: Gabriel" value="<?php echo $persona_editar ? htmlspecialchars($persona_editar['nombre']) : ''; ?>" required>

            <label for="apellido">Apellido:</label>
            <input type="text" id="apellido" name="apellido" placeholder="Ej: Méndez" value="<?php echo $persona_editar ? htmlspecialchars($persona_editar['apellido']) : ''; ?>" required>

            <label for="rol">Rol / Función:</label>
            <select id="rol" name="rol" required>
                <option value="Conductor Profesional" <?php echo ($persona_editar && $persona_editar['rol'] === 'Conductor Profesional') ? 'selected' : ''; ?>>Conductor Profesional</option>
                <option value="Acompañante Médico" <?php echo ($persona_editar && $persona_editar['rol'] === 'Acompañante Médico') ? 'selected' : ''; ?>>Acompañante Médico</option>
                <option value="Enfermero de Traslado" <?php echo ($persona_editar && $persona_editar['rol'] === 'Enfermero de Traslado') ? 'selected' : ''; ?>>Enfermero de Traslado</option>
            </select>

            <label for="estado">Estado:</label>
            <select id="estado" name="estado" required>
                <option value="Activo" <?php echo ($persona_editar && $persona_editar['estado'] === 'Activo') ? 'selected' : ''; ?>>Activo</option>
                <option value="De Licencia" <?php echo ($persona_editar && $persona_editar['estado'] === 'De Licencia') ? 'selected' : ''; ?>>De Licencia</option>
            </select>

            <button type="submit" name="guardar_personal" class="boton boton-violeta"><?php echo $persona_editar ? 'Actualizar Personal' : 'Guardar Personal'; ?></button>
        </form>
    </section>

    <section class="tarjeta tarjeta-tabla">
        <div class="cabecera-tarjeta">
            <h3><?php echo icono('users'); ?>Nómina de Conductores y Acompañantes</h3>
            <span class="badge-total">Total: <?php echo $total_personal; ?> funcionarios</span>
        </div>
        <table>
            <thead>
                <tr>
                    <th>C.I.</th>
                    <th>Nombre y Apellido</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                <?php while ($fila = $resultado_personal->fetch_assoc()):
                    $clase_pill = ($fila['estado'] === 'Activo') ? 'pill-verde' : 'pill-naranja';
                ?>
                <tr>
                    <td><span class="texto-ci"><?php echo htmlspecialchars($fila['id_ci']); ?></span></td>
                    <td><?php echo htmlspecialchars($fila['nombre'] . ' ' . $fila['apellido']); ?></td>
                    <td><?php echo htmlspecialchars($fila['rol']); ?></td>
                    <td><span class="pill-estado <?php echo $clase_pill; ?>"><?php echo htmlspecialchars($fila['estado']); ?></span></td>
                    <td>
                        <a href="personal.php?editar=<?php echo $fila['id_ci']; ?>&tipo=<?php echo $fila['tipo']; ?>" class="enlace-accion">Editar</a>
                        <a href="personal.php?eliminar=<?php echo $fila['id_ci']; ?>&tipo=<?php echo $fila['tipo']; ?>" class="enlace-accion confirmar-borrado enlace-icono" title="Borrar"><?php echo icono('trash'); ?></a>
                    </td>
                </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    </section>

</div>

        </main>
    </div>

    <script src="<?php echo BASE_URL; ?>assets/js/main.js"></script>

</body>
</html>
