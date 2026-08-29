<?php

session_start();

if (!isset($_SESSION['id_funcionario'])) {  //esto es lo que convierte a esta página en una página protegida.\\
    header("Location: ../../index.html");
    exit;
}

$pagina_actual = 'recursos';

require_once '../../config/conexion.php';

// Borrar: viene como GET porque es un link, no un formulario
if (isset($_GET['eliminar'])) {
    $id_borrar = $_GET['eliminar'];

    $sql_borrar = "DELETE FROM Ambulancia WHERE id_ambulancia = ?";
    $stmt_borrar = $con->prepare($sql_borrar);
    $stmt_borrar->bind_param("i", $id_borrar);
    $stmt_borrar->execute();
    $stmt_borrar->close();

    header("Location: ambulancias.php");
    exit;
}

// Alta y modificación comparten el mismo formulario y el mismo POST;
// se distinguen por si viene o no el campo oculto id_ambulancia_editar
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['guardar_ambulancia'])) {

    $matricula = trim($_POST['matricula']);
    $marca = trim($_POST['marca']);
    $modelo = trim($_POST['modelo']);
    $estado = $_POST['estado'];

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

    header("Location: ambulancias.php");
    exit;
}

// Si venimos de un link "Editar", traemos esa ambulancia para precargar el formulario
$ambulancia_editar = null;
if (isset($_GET['editar'])) {
    $id_editar = $_GET['editar'];

    $sql_editar = "SELECT id_ambulancia, matricula, marca, modelo, estado FROM Ambulancia WHERE id_ambulancia = ?";
    $stmt_editar = $con->prepare($sql_editar);
    $stmt_editar->bind_param("i", $id_editar);
    $stmt_editar->execute();
    $ambulancia_editar = $stmt_editar->get_result()->fetch_assoc();
    $stmt_editar->close();
}

$sql_listado = "SELECT id_ambulancia, matricula, marca, modelo, estado FROM Ambulancia ORDER BY id_ambulancia DESC";
$resultado_ambulancias = $con->query($sql_listado);

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SIGSM - ABM Recursos</title>
    <link rel="stylesheet" href="<?php echo BASE_URL; ?>assets/css/estilos.css">
</head>
<body>

    <?php require_once '../../includes/header.php'; ?>

    <div class="layout">
        <?php require_once '../../includes/sidebar.php'; ?>

  <div class="tarjetas-portal">

    <section class="tarjeta tarjeta-formulario">
        <h3><?php echo $ambulancia_editar ? 'Editar Ambulancia' : 'Registrar Nueva Ambulancia'; ?></h3>
        <form action="ambulancias.php" method="POST">
            <input type="hidden" name="id_ambulancia_editar" value="<?php echo $ambulancia_editar ? htmlspecialchars($ambulancia_editar['id_ambulancia']) : ''; ?>">

            <label for="matricula">Matrícula:</label>
            <input type="text" id="matricula" name="matricula" placeholder="STF-9999" value="<?php echo $ambulancia_editar ? htmlspecialchars($ambulancia_editar['matricula']) : ''; ?>" required>

            <label for="marca">Marca:</label>
            <input type="text" id="marca" name="marca" placeholder="Mercedes-Benz" value="<?php echo $ambulancia_editar ? htmlspecialchars($ambulancia_editar['marca']) : ''; ?>" required>

            <label for="modelo">Modelo:</label>
            <input type="text" id="modelo" name="modelo" placeholder="Sprinter 415" value="<?php echo $ambulancia_editar ? htmlspecialchars($ambulancia_editar['modelo']) : ''; ?>" required>

            <label for="estado">Estado:</label>
            <select id="estado" name="estado" required>
                <option value="Disponible" <?php echo ($ambulancia_editar && $ambulancia_editar['estado'] === 'Disponible') ? 'selected' : ''; ?>>Disponible</option>
                <option value="Mantenimiento" <?php echo ($ambulancia_editar && $ambulancia_editar['estado'] === 'Mantenimiento') ? 'selected' : ''; ?>>Mantenimiento</option>
                <option value="Fuera de Servicio" <?php echo ($ambulancia_editar && $ambulancia_editar['estado'] === 'Fuera de Servicio') ? 'selected' : ''; ?>>Fuera de Servicio</option>
            </select>

            <button type="submit" name="guardar_ambulancia" class="boton boton-primario"><?php echo $ambulancia_editar ? 'Actualizar Vehículo' : 'Guardar Vehículo'; ?></button>
        </form>
    </section>

    <section class="tarjeta tarjeta-tabla">
        <h3>Parque Automotor Activo</h3>
        <table>
            <thead>
                <tr>
                    <th>Matrícula</th>
                    <th>Marca</th>
                    <th>Modelo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                <?php while ($fila = $resultado_ambulancias->fetch_assoc()): ?>
                <tr>
                    <td><?php echo htmlspecialchars($fila['matricula']); ?></td>
                    <td><?php echo htmlspecialchars($fila['marca']); ?></td>
                    <td><?php echo htmlspecialchars($fila['modelo']); ?></td>
                    <td><?php echo htmlspecialchars($fila['estado']); ?></td>
                    <td>
                        <a href="ambulancias.php?editar=<?php echo $fila['id_ambulancia']; ?>" class="enlace-accion">Editar</a>
                        <a href="ambulancias.php?eliminar=<?php echo $fila['id_ambulancia']; ?>" class="enlace-accion confirmar-borrado">Borrar</a>
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
