<?php

session_start();

if (!isset($_SESSION['id_funcionario'])) {
    header("Location: ../../index.html");
    exit;
}

$pagina_actual = 'ambulancias';

require_once '../../config/conexion.php';

// secuencia de estados de un traslado: cada "Avanzar" pasa al siguiente
$secuencia_estados = ['Pendiente', 'En curso', 'Llegado a destino', 'Retornando', 'Finalizado'];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['despachar_traslado'])) {

    $id_ambulancia = $_POST['id_ambulancia'];
    $id_conductor = $_POST['id_conductor'];
    $id_acompanante = !empty($_POST['id_acompanante']) ? $_POST['id_acompanante'] : null;
    $id_elemento = !empty($_POST['id_elemento']) ? $_POST['id_elemento'] : null;
    $id_ruta = $_POST['id_ruta'];
    $estado_inicial = $secuencia_estados[0];

    $sql_insert = "INSERT INTO Traslado (fecha, hora_salida, estado, id_ambulancia, id_conductor, id_acompanante, id_elemento, id_ruta, id_funcionario) VALUES (CURDATE(), CURTIME(), ?, ?, ?, ?, ?, ?, ?)";
    $stmt_insert = $con->prepare($sql_insert);
    $stmt_insert->bind_param("siiiiii", $estado_inicial, $id_ambulancia, $id_conductor, $id_acompanante, $id_elemento, $id_ruta, $_SESSION['id_funcionario']);
    $stmt_insert->execute();
    $stmt_insert->close();

    header("Location: listar.php");
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['avanzar_estado'])) {

    $id_traslado = $_POST['id_traslado'];

    $stmt_actual = $con->prepare("SELECT estado, hora_llegada FROM Traslado WHERE id_traslado = ?");
    $stmt_actual->bind_param("i", $id_traslado);
    $stmt_actual->execute();
    $traslado_actual = $stmt_actual->get_result()->fetch_assoc();
    $stmt_actual->close();

    if ($traslado_actual) {
        $indice_actual = array_search($traslado_actual['estado'], $secuencia_estados);
        if ($indice_actual !== false && $indice_actual < count($secuencia_estados) - 1) {
            $nuevo_estado = $secuencia_estados[$indice_actual + 1];

            if ($nuevo_estado === 'Finalizado' && empty($traslado_actual['hora_llegada'])) {
                $stmt_update = $con->prepare("UPDATE Traslado SET estado = ?, hora_llegada = CURTIME() WHERE id_traslado = ?");
            } else {
                $stmt_update = $con->prepare("UPDATE Traslado SET estado = ? WHERE id_traslado = ?");
            }
            $stmt_update->bind_param("si", $nuevo_estado, $id_traslado);
            $stmt_update->execute();
            $stmt_update->close();
        }
    }

    header("Location: listar.php");
    exit;
}

// datos para poblar los <select> del formulario
$ambulancias_disponibles = $con->query("SELECT id_ambulancia, matricula FROM Ambulancia WHERE estado = 'Disponible'");
$conductores_disponibles = $con->query("SELECT id_ci, nombre, apellido FROM Conductor WHERE estado = 'Activo'");
$acompanantes = $con->query("SELECT id_ci, nombre, apellido FROM Acompaniante");
$elementos = $con->query("SELECT id_elemento, tipo FROM Elemento_traslado");
$rutas = $con->query("SELECT id_ruta, origen, destino FROM Ruta");

// listado de traslados ya despachados, con datos legibles en vez de ids sueltos
$sql_listado = "SELECT t.id_traslado, t.fecha, t.hora_salida, t.estado,
                       a.matricula,
                       c.nombre AS conductor_nombre, c.apellido AS conductor_apellido,
                       r.origen, r.destino
                FROM Traslado t
                INNER JOIN Ambulancia a ON t.id_ambulancia = a.id_ambulancia
                INNER JOIN Conductor c ON t.id_conductor = c.id_ci
                INNER JOIN Ruta r ON t.id_ruta = r.id_ruta
                ORDER BY t.id_traslado DESC";
$resultado_traslados = $con->query($sql_listado);

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SIGSM - Rutas de Ambulancias</title>
    <link rel="stylesheet" href="<?php echo BASE_URL; ?>assets/css/estilos.css?v=<?php echo filemtime(__DIR__ . '/../../assets/css/estilos.css'); ?>">
</head>
<body>

    <?php require_once '../../includes/header.php'; ?>

    <div class="layout">
        <?php require_once '../../includes/sidebar.php'; ?>

        <main class="contenido">
<div class="tarjetas-portal">

    <section class="tarjeta tarjeta-formulario">
        <h3>Despachar Ambulancia</h3>
        <form action="listar.php" method="POST">
            <label for="id_ambulancia">Ambulancia:</label>
            <select id="id_ambulancia" name="id_ambulancia" required>
                <option value="">Seleccione una ambulancia</option>
                <?php while ($amb = $ambulancias_disponibles->fetch_assoc()): ?>
                <option value="<?php echo $amb['id_ambulancia']; ?>"><?php echo htmlspecialchars($amb['matricula']); ?></option>
                <?php endwhile; ?>
            </select>

            <label for="id_conductor">Conductor:</label>
            <select id="id_conductor" name="id_conductor" required>
                <option value="">Seleccione un conductor</option>
                <?php while ($cond = $conductores_disponibles->fetch_assoc()): ?>
                <option value="<?php echo $cond['id_ci']; ?>"><?php echo htmlspecialchars($cond['nombre'] . ' ' . $cond['apellido']); ?></option>
                <?php endwhile; ?>
            </select>

            <label for="id_acompanante">Acompañante (opcional):</label>
            <select id="id_acompanante" name="id_acompanante">
                <option value="">Ninguno</option>
                <?php while ($acomp = $acompanantes->fetch_assoc()): ?>
                <option value="<?php echo $acomp['id_ci']; ?>"><?php echo htmlspecialchars($acomp['nombre'] . ' ' . $acomp['apellido']); ?></option>
                <?php endwhile; ?>
            </select>

            <label for="id_elemento">Elemento de traslado (opcional):</label>
            <select id="id_elemento" name="id_elemento">
                <option value="">Ninguno</option>
                <?php while ($elem = $elementos->fetch_assoc()): ?>
                <option value="<?php echo $elem['id_elemento']; ?>"><?php echo htmlspecialchars($elem['tipo']); ?></option>
                <?php endwhile; ?>
            </select>

            <label for="id_ruta">Ruta:</label>
            <select id="id_ruta" name="id_ruta" required>
                <option value="">Seleccione una ruta</option>
                <?php while ($r = $rutas->fetch_assoc()): ?>
                <option value="<?php echo $r['id_ruta']; ?>"><?php echo htmlspecialchars($r['origen'] . ' → ' . $r['destino']); ?></option>
                <?php endwhile; ?>
            </select>

            <button type="submit" name="despachar_traslado" class="boton boton-primario">Despachar Ambulancia</button>
        </form>
    </section>

    <section class="tarjeta tarjeta-tabla">
        <h3>Traslados Despachados</h3>
        <table>
            <thead>
                <tr>
                    <th>Ambulancia</th>
                    <th>Conductor</th>
                    <th>Ruta</th>
                    <th>Fecha</th>
                    <th>Salida</th>
                    <th>Estado</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                <?php while ($t = $resultado_traslados->fetch_assoc()):
                    $clase_pill = 'pill-naranja';
                    if (in_array($t['estado'], ['En curso', 'Retornando'])) $clase_pill = 'pill-azul';
                    if (in_array($t['estado'], ['Llegado a destino', 'Finalizado'])) $clase_pill = 'pill-verde';
                    $es_finalizado = ($t['estado'] === 'Finalizado');
                ?>
                <tr>
                    <td><?php echo htmlspecialchars($t['matricula']); ?></td>
                    <td><?php echo htmlspecialchars($t['conductor_nombre'] . ' ' . $t['conductor_apellido']); ?></td>
                    <td><?php echo htmlspecialchars($t['origen'] . ' → ' . $t['destino']); ?></td>
                    <td><?php echo htmlspecialchars($t['fecha']); ?></td>
                    <td><?php echo htmlspecialchars($t['hora_salida']); ?></td>
                    <td><span class="pill-estado <?php echo $clase_pill; ?>"><?php echo htmlspecialchars($t['estado']); ?></span></td>
                    <td>
                        <?php if (!$es_finalizado): ?>
                        <form action="listar.php" method="POST">
                            <input type="hidden" name="id_traslado" value="<?php echo $t['id_traslado']; ?>">
                            <button type="submit" name="avanzar_estado" class="enlace-accion">Avanzar →</button>
                        </form>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    </section>

</div>

        </main>
    </div>

</body>
</html>
