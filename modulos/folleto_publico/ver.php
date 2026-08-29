<?php

require_once '../../config/conexion.php';

$id_documento = $_GET['id'] ?? null; //el get me sirve para traer datos que viene en la url 

$sql = "SELECT titulo, descripcion, departamento, archivo, fecha_carga FROM Documento WHERE id_documento = ?";
$stmt = $con->prepare($sql);
$stmt->bind_param("i", $id_documento);
$stmt->execute();
$resultado = $stmt->get_result();
$documento = $resultado->fetch_assoc();
$stmt->close();

$instrucciones_doc = [];
if ($documento) {
    $sql_instrucciones = $con->prepare("SELECT texto_instruccion, es_pauta_alarma FROM Instruccion WHERE id_documento = ? ORDER BY orden");
    $sql_instrucciones->bind_param("i", $id_documento);
    $sql_instrucciones->execute();
    $instrucciones_doc = $sql_instrucciones->get_result();
}

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
            <span class="badge"><?php echo htmlspecialchars($documento['departamento']); ?></span>
            <h3><?php echo htmlspecialchars($documento['titulo']); ?></h3>
            <p><?php echo htmlspecialchars($documento['descripcion']); ?></p>
            <p class="fecha-folleto">Publicado el <?php echo htmlspecialchars($documento['fecha_carga']); ?></p>

            <ul class="lista-instrucciones">
                <?php while ($instruccion = $instrucciones_doc->fetch_assoc()): ?>
                <li class="<?php echo $instruccion['es_pauta_alarma'] ? 'pauta-alarma' : ''; ?>">
                    <?php echo htmlspecialchars($instruccion['texto_instruccion']); ?>
                </li>
                <?php endwhile; ?>
            </ul>

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
