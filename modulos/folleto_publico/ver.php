<?php

require_once '../../config/conexion.php';

$id_documento = $_GET['id'] ?? null; //el get me sirve para traer datos que viene en la url 

$sql = "SELECT titulo, descripcion, archivo, fecha_carga FROM Documento WHERE id_documento = ?";
$stmt = $con->prepare($sql);
$stmt->bind_param("i", $id_documento);
$stmt->execute();
$resultado = $stmt->get_result();
$documento = $resultado->fetch_assoc();
$stmt->close();

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SIGSM - Folleto Médico</title>
    <link rel="stylesheet" href="<?php echo BASE_URL; ?>assets/css/estilos.css">
</head>
<body>

    <div class="pantalla-paciente">

        <?php if ($documento): ?>
        <section class="tarjeta">
            <h3><?php echo htmlspecialchars($documento['titulo']); ?></h3>
            <p><?php echo htmlspecialchars($documento['descripcion']); ?></p>
            <p class="fecha-folleto">Publicado el <?php echo htmlspecialchars($documento['fecha_carga']); ?></p>
            <a href="<?php echo BASE_URL; ?>modulos/folleteria/documentos/<?php echo htmlspecialchars(basename($documento['archivo'])); ?>" target="_blank" class="boton boton-primario">Ver Folleto Completo (PDF)</a>
        </section>
        <?php else: ?>
        <section class="tarjeta">
            <h3>Folleto no encontrado</h3>
            <p>El código QR escaneado no corresponde a ningún folleto disponible.</p>
        </section>
        <?php endif; ?>

    </div>

</body>
</html>
