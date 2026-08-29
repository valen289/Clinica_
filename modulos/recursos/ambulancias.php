<?php

session_start();

if (!isset($_SESSION['id_funcionario'])) {  //esto es lo que convierte a esta página en una página protegida.\\
    header("Location: ../../index.html");
    exit;
}

$pagina_actual = 'recursos';

require_once '../../config/conexion.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['guardar_ambulancia'])) {

    $matricula = trim($_POST['matricula']);
    $marca = trim($_POST['marca']);
    $modelo = trim($_POST['modelo']);
    $estado = $_POST['estado'];

    $sql_insert = "INSERT INTO Ambulancia (matricula, marca, modelo, estado) VALUES (?, ?, ?, ?)";
    $stmt_insert = $con->prepare($sql_insert);
    $stmt_insert->bind_param("ssss", $matricula, $marca, $modelo, $estado);
    $stmt_insert->execute();
    $stmt_insert->close();

    header("Location: ambulancias.php");
    exit;
}

$sql_listado = "SELECT matricula, marca, modelo, estado FROM Ambulancia ORDER BY id_ambulancia DESC";
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
        <h3>Registrar Nueva Ambulancia</h3>
        <form action="ambulancias.php" method="POST">
            <label for="matricula">Matrícula:</label>
            <input type="text" id="matricula" name="matricula" placeholder="STF-9999" required>

            <label for="marca">Marca:</label>
            <input type="text" id="marca" name="marca" placeholder="Mercedes-Benz" required>

            <label for="modelo">Modelo:</label>
            <input type="text" id="modelo" name="modelo" placeholder="Sprinter 415" required>

            <label for="estado">Estado:</label>
            <select id="estado" name="estado" required>
                <option value="Disponible">Disponible</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Fuera de Servicio">Fuera de Servicio</option>
            </select>

            <button type="submit" name="guardar_ambulancia" class="boton boton-primario">Guardar Vehículo</button>
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
                </tr>
            </thead>
            <tbody>
                <?php while ($fila = $resultado_ambulancias->fetch_assoc()): ?>
                <tr>
                    <td><?php echo htmlspecialchars($fila['matricula']); ?></td>
                    <td><?php echo htmlspecialchars($fila['marca']); ?></td>
                    <td><?php echo htmlspecialchars($fila['modelo']); ?></td>
                    <td><?php echo htmlspecialchars($fila['estado']); ?></td>
                </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    </section>

</div>
