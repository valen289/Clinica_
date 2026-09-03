<?php

session_start();

if (!isset($_SESSION['id_funcionario'])) {
    header("Location: ../../index.html");
    exit;
}

$pagina_actual = 'recursos';
$tab_activo = 'rutas';

require_once '../../config/conexion.php';
require_once '../../includes/iconos.php';

if (isset($_GET['eliminar'])) {
    $id_borrar = $_GET['eliminar'];

    $sql_borrar = "DELETE FROM Ruta WHERE id_ruta = ?";
    $stmt_borrar = $con->prepare($sql_borrar);
    $stmt_borrar->bind_param("i", $id_borrar);
    $stmt_borrar->execute();
    $stmt_borrar->close();

    header("Location: rutas.php");
    exit;
}

// Alta y modificación comparten el mismo formulario y el mismo POST;
// se distinguen por si viene o no el campo oculto id_ruta_editar
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['guardar_ruta'])) {

    $nombre_ruta = trim($_POST['nombre_ruta']);
    $origen = trim($_POST['origen']);
    $destino = trim($_POST['destino']);
    $distancia = !empty($_POST['distancia']) ? $_POST['distancia'] : null;
    $descripcion = trim($_POST['descripcion']);

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

    header("Location: rutas.php");
    exit;
}

// Si venimos de un link "Editar", traemos esa ruta para precargar el formulario
$ruta_editar = null;
if (isset($_GET['editar'])) {
    $id_editar = $_GET['editar'];

    $sql_editar = "SELECT id_ruta, nombre_ruta, origen, destino, distancia, descripcion FROM Ruta WHERE id_ruta = ?";
    $stmt_editar = $con->prepare($sql_editar);
    $stmt_editar->bind_param("i", $id_editar);
    $stmt_editar->execute();
    $ruta_editar = $stmt_editar->get_result()->fetch_assoc();
    $stmt_editar->close();
}

$sql_listado = "SELECT id_ruta, nombre_ruta, origen, destino, distancia, descripcion FROM Ruta ORDER BY id_ruta DESC";
$resultado_rutas = $con->query($sql_listado);
$total_rutas = $resultado_rutas->num_rows;

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SIGSM - ABM Rutas</title>
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
        <h3><?php echo icono($ruta_editar ? 'pencil' : 'plus'); ?><?php echo $ruta_editar ? 'Editar Ruta' : 'Registrar Nueva Ruta'; ?></h3>
        <form action="rutas.php" method="POST">
            <input type="hidden" name="id_ruta_editar" value="<?php echo $ruta_editar ? htmlspecialchars($ruta_editar['id_ruta']) : ''; ?>">

            <label for="nombre_ruta">Nombre de la ruta:</label>
            <input type="text" id="nombre_ruta" name="nombre_ruta" placeholder="Corredor Litoral Norte" value="<?php echo $ruta_editar ? htmlspecialchars($ruta_editar['nombre_ruta']) : ''; ?>" required>

            <label for="origen">Origen:</label>
            <input type="text" id="origen" name="origen" placeholder="Hospital de Salto" value="<?php echo $ruta_editar ? htmlspecialchars($ruta_editar['origen']) : ''; ?>" required>

            <label for="destino">Destino:</label>
            <input type="text" id="destino" name="destino" placeholder="Hospital de Clínicas, Montevideo" value="<?php echo $ruta_editar ? htmlspecialchars($ruta_editar['destino']) : ''; ?>" required>

            <label for="distancia">Distancia (km):</label>
            <input type="number" step="0.01" id="distancia" name="distancia" placeholder="498.00" value="<?php echo $ruta_editar ? htmlspecialchars($ruta_editar['distancia']) : ''; ?>">

            <label for="descripcion">Descripción:</label>
            <input type="text" id="descripcion" name="descripcion" placeholder="Ruta 3 y 1, sin peajes" value="<?php echo $ruta_editar ? htmlspecialchars($ruta_editar['descripcion']) : ''; ?>">

            <button type="submit" name="guardar_ruta" class="boton boton-verde"><?php echo $ruta_editar ? 'Actualizar Ruta' : 'Guardar Ruta'; ?></button>
        </form>
    </section>

    <section class="tarjeta tarjeta-tabla">
        <div class="cabecera-tarjeta">
            <h3><?php echo icono('route'); ?>Catálogo de Rutas</h3>
            <span class="badge-total">Total: <?php echo $total_rutas; ?> rutas</span>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>Trayecto</th>
                    <th>Distancia</th>
                    <th>Descripción</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                <?php while ($fila = $resultado_rutas->fetch_assoc()): ?>
                <tr>
                    <td><?php echo htmlspecialchars($fila['nombre_ruta']); ?></td>
                    <td><?php echo htmlspecialchars($fila['origen'] . ' → ' . $fila['destino']); ?></td>
                    <td><?php echo $fila['distancia'] !== null ? htmlspecialchars($fila['distancia']) . ' km' : '—'; ?></td>
                    <td><?php echo htmlspecialchars($fila['descripcion']); ?></td>
                    <td>
                        <a href="rutas.php?editar=<?php echo $fila['id_ruta']; ?>" class="enlace-accion">Editar</a>
                        <a href="rutas.php?eliminar=<?php echo $fila['id_ruta']; ?>" class="enlace-accion confirmar-borrado enlace-icono" title="Borrar"><?php echo icono('trash'); ?></a>
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
