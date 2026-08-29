<?php

session_start();

if (!isset($_SESSION['id_funcionario'])) {
    header("Location: ../../index.html");
    exit;
}

$pagina_actual = 'folleteria';

require_once '../../config/conexion.php';

// Borrar: primero las filas hijas (Instruccion y Codigo_qr referencian a Documento por FK,
// no se puede borrar el Documento mientras existan) y despues el archivo fisico
if (isset($_GET['eliminar'])) {
    $id_borrar = $_GET['eliminar'];

    $sql_archivo = "SELECT archivo FROM Documento WHERE id_documento = ?";
    $stmt_archivo = $con->prepare($sql_archivo);
    $stmt_archivo->bind_param("i", $id_borrar);
    $stmt_archivo->execute();
    $doc_a_borrar = $stmt_archivo->get_result()->fetch_assoc();
    $stmt_archivo->close();

    $stmt_borrar_instr = $con->prepare("DELETE FROM Instruccion WHERE id_documento = ?");
    $stmt_borrar_instr->bind_param("i", $id_borrar);
    $stmt_borrar_instr->execute();
    $stmt_borrar_instr->close();

    $stmt_borrar_qr = $con->prepare("DELETE FROM Codigo_qr WHERE id_documento = ?");
    $stmt_borrar_qr->bind_param("i", $id_borrar);
    $stmt_borrar_qr->execute();
    $stmt_borrar_qr->close();

    $sql_borrar = "DELETE FROM Documento WHERE id_documento = ?";
    $stmt_borrar = $con->prepare($sql_borrar);
    $stmt_borrar->bind_param("i", $id_borrar);
    $stmt_borrar->execute();
    $stmt_borrar->close();

    if ($doc_a_borrar && file_exists($doc_a_borrar['archivo'])) {
        unlink($doc_a_borrar['archivo']); // borra el pdf del disco, no solo el registro de la bd
    }

    header("Location: listar.php");
    exit;
}

// esta pagina se manda el formulario a si misma, por eso hay que fijarse si es un POST antes de procesar nada
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['guardar_documento'])) {

    $titulo = trim($_POST['titulo']);
    $descripcion = trim($_POST['descripcion']);
    $departamento = trim($_POST['departamento']);
    $archivo = $_FILES['archivo']; // $_FILES no es como $_POST, es un array con datos del archivo (nombre, tipo, y donde quedo guardado momentaneamente)
    $id_documento_editar = !empty($_POST['id_documento_editar']) ? $_POST['id_documento_editar'] : null;

    if ($id_documento_editar) {
        // modo edicion: actualiza titulo/descripcion/departamento siempre;
        // el archivo solo se reemplaza si se subio uno nuevo
        if ($archivo['error'] === 0) {
            $nombre_archivo = time() . '_' . basename($archivo['name']);
            $ruta = 'documentos/' . $nombre_archivo;
            move_uploaded_file($archivo['tmp_name'], $ruta);

            $sql_update = "UPDATE Documento SET titulo = ?, descripcion = ?, departamento = ?, archivo = ? WHERE id_documento = ?";
            $stmt_update = $con->prepare($sql_update);
            $stmt_update->bind_param("ssssi", $titulo, $descripcion, $departamento, $ruta, $id_documento_editar);
        } else {
            $sql_update = "UPDATE Documento SET titulo = ?, descripcion = ?, departamento = ? WHERE id_documento = ?";
            $stmt_update = $con->prepare($sql_update);
            $stmt_update->bind_param("sssi", $titulo, $descripcion, $departamento, $id_documento_editar);
        }
        $stmt_update->execute();
        $stmt_update->close();

        // las instrucciones se reemplazan enteras: se borran las viejas y se insertan las del formulario
        $stmt_borrar_instr_edit = $con->prepare("DELETE FROM Instruccion WHERE id_documento = ?");
        $stmt_borrar_instr_edit->bind_param("i", $id_documento_editar);
        $stmt_borrar_instr_edit->execute();
        $stmt_borrar_instr_edit->close();

        $id_documento_nuevo = $id_documento_editar;

    } else {
        if ($archivo['error'] === 0) { // 0 = subio bien, cualquier otro numero es que algo fallo

            $nombre_archivo = time() . '_' . basename($archivo['name']); // le pego la hora actual adelante para que dos folletos con el mismo nombre no se pisen entre si
            $ruta = 'documentos/' . $nombre_archivo;
            move_uploaded_file($archivo['tmp_name'], $ruta); // esto es lo que realmente mueve el archivo de la carpeta temporal a documentos/

            //  en la base de datos nunca se guarda el archivo en si, solo la ruta de texto para despues poder encontrarlo
            $sql_doc = "INSERT INTO Documento (titulo, descripcion, departamento, archivo, fecha_carga, id_funcionario) VALUES (?, ?, ?, ?, CURDATE(), ?)";
            $stmt_doc = $con->prepare($sql_doc);
            $stmt_doc->bind_param("ssssi", $titulo, $descripcion, $departamento, $ruta, $_SESSION['id_funcionario']); // el funcionario sale de la sesion, no del formulario
            $stmt_doc->execute();

            $id_documento_nuevo = $stmt_doc->insert_id; // el id que mysql le puso solo al documento recien insertado, lo necesito para el QR y las instrucciones
            $stmt_doc->close();

            // armo un codigo y una url cualquiera para este documento, no hace falta que sea sofisticado, solo unico
            $codigo_generado = "QR-" . $id_documento_nuevo . "-" . time();
            $url_generada = BASE_URL . "modulos/folleto_publico/ver.php?id=" . $id_documento_nuevo;

            $sql_qr = "INSERT INTO Codigo_qr (codigo, url, id_documento) VALUES (?, ?, ?)";
            $stmt_qr = $con->prepare($sql_qr);
            $stmt_qr->bind_param("ssi", $codigo_generado, $url_generada, $id_documento_nuevo);
            $stmt_qr->execute();
            $stmt_qr->close();
        } else {
            $id_documento_nuevo = null; // no se subio archivo en un alta nueva, no hay nada que insertar
        }
    }

    // instrucciones clinicas: minimo 2 normales + 1 opcional marcada como pauta de alarma
    // (se ejecuta tanto para alta como para edicion, siempre que haya un documento valido)
    if ($id_documento_nuevo) {
        $instrucciones = [
            ['texto' => trim($_POST['instruccion1']), 'alarma' => false],
            ['texto' => trim($_POST['instruccion2']), 'alarma' => false],
        ];
        if (!empty(trim($_POST['pauta_alarma']))) {
            $instrucciones[] = ['texto' => trim($_POST['pauta_alarma']), 'alarma' => true];
        }

        $sql_instruccion = "INSERT INTO Instruccion (id_documento, orden, texto_instruccion, es_pauta_alarma) VALUES (?, ?, ?, ?)";
        $stmt_instruccion = $con->prepare($sql_instruccion);
        $orden = 1;
        foreach ($instrucciones as $instruccion) {
            $stmt_instruccion->bind_param("iisi", $id_documento_nuevo, $orden, $instruccion['texto'], $instruccion['alarma']);
            $stmt_instruccion->execute();
            $orden++;
        }
        $stmt_instruccion->close();
    }

    header("Location: listar.php"); // pase lo que pase (bien o mal), siempre redirijo para que no se pueda reenviar el formulario con F5
    exit;
}

// Si venimos de un link "Editar", traemos el documento y sus instrucciones para precargar el formulario
$documento_editar = null;
$instrucciones_editar = [];
if (isset($_GET['editar'])) {
    $id_editar = $_GET['editar'];

    $sql_doc_editar = "SELECT id_documento, titulo, descripcion, departamento FROM Documento WHERE id_documento = ?";
    $stmt_doc_editar = $con->prepare($sql_doc_editar);
    $stmt_doc_editar->bind_param("i", $id_editar);
    $stmt_doc_editar->execute();
    $documento_editar = $stmt_doc_editar->get_result()->fetch_assoc();
    $stmt_doc_editar->close();

    $sql_instr_editar = "SELECT texto_instruccion, es_pauta_alarma FROM Instruccion WHERE id_documento = ? ORDER BY orden";
    $stmt_instr_editar = $con->prepare($sql_instr_editar);
    $stmt_instr_editar->bind_param("i", $id_editar);
    $stmt_instr_editar->execute();
    $resultado_instr_editar = $stmt_instr_editar->get_result();
    while ($fila_instr = $resultado_instr_editar->fetch_assoc()) {
        $instrucciones_editar[] = $fila_instr;
    }
    $stmt_instr_editar->close();
}

// separo las instrucciones ya cargadas para poder precargar cada input del formulario por separado
$instruccion1_valor = '';
$instruccion2_valor = '';
$pauta_alarma_valor = '';
$contador_normales = 0;
foreach ($instrucciones_editar as $instr) {
    if ($instr['es_pauta_alarma']) {
        $pauta_alarma_valor = $instr['texto_instruccion'];
    } else {
        $contador_normales++;
        if ($contador_normales === 1) {
            $instruccion1_valor = $instr['texto_instruccion'];
        } elseif ($contador_normales === 2) {
            $instruccion2_valor = $instr['texto_instruccion'];
        }
    }
}

$sql_listado = "SELECT id_documento, titulo, descripcion, departamento, archivo, fecha_carga FROM Documento ORDER BY id_documento DESC";
$resultado_documentos = $con->query($sql_listado); // este SELECT no necesita prepare porque no tiene ningun dato que venga de afuera

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SIGSM - Folletería Médica</title>
    <link rel="stylesheet" href="<?php echo BASE_URL; ?>assets/css/estilos.css">
</head>
<body>

    <?php require_once '../../includes/header.php'; ?>

    <div class="layout">
        <?php require_once '../../includes/sidebar.php'; ?>

<main class="contenido">

            <div class="tarjetas-portal">

                <section class="tarjeta tarjeta-formulario">
                    <h3><?php echo $documento_editar ? 'Editar Folleto Médico' : 'Agregar Folleto Médico'; ?></h3>
                    <!-- sin enctype="multipart/form-data" el archivo llega vacio al servidor, no tira error, simplemente no llega -->
                    <form action="listar.php" method="POST" enctype="multipart/form-data">
                        <input type="hidden" name="id_documento_editar" value="<?php echo $documento_editar ? htmlspecialchars($documento_editar['id_documento']) : ''; ?>">

                        <label for="titulo">Título:</label>
                        <input type="text" id="titulo" name="titulo" placeholder="Indicaciones de IVE" value="<?php echo $documento_editar ? htmlspecialchars($documento_editar['titulo']) : ''; ?>" required>

                        <label for="descripcion">Descripción:</label>
                        <input type="text" id="descripcion" name="descripcion" placeholder="Protocolo de cuidados..." value="<?php echo $documento_editar ? htmlspecialchars($documento_editar['descripcion']) : ''; ?>" required>

                        <label for="departamento">Departamento Médico:</label>
                        <select id="departamento" name="departamento" required>
                            <?php $departamentos = ['Ginecología y Obstetricia', 'Urología', 'Cardiología y Hematología', 'Radiología / Imagenología', 'Nefrología y Trasplante Renal']; ?>
                            <?php foreach ($departamentos as $dep): ?>
                            <option value="<?php echo $dep; ?>" <?php echo ($documento_editar && $documento_editar['departamento'] === $dep) ? 'selected' : ''; ?>><?php echo $dep; ?></option>
                            <?php endforeach; ?>
                        </select>

                        <label for="instruccion1">Indicación clínica 1:</label>
                        <input type="text" id="instruccion1" name="instruccion1" placeholder="Reposo relativo por 48hs" value="<?php echo htmlspecialchars($instruccion1_valor); ?>" required>

                        <label for="instruccion2">Indicación clínica 2:</label>
                        <input type="text" id="instruccion2" name="instruccion2" placeholder="Tomar la medicación cada 8hs" value="<?php echo htmlspecialchars($instruccion2_valor); ?>" required>

                        <label for="pauta_alarma">Pauta de alarma (opcional):</label>
                        <input type="text" id="pauta_alarma" name="pauta_alarma" placeholder="Fiebre mayor a 38° o sangrado abundante" value="<?php echo htmlspecialchars($pauta_alarma_valor); ?>">

                        <label for="archivo">Archivo (PDF)<?php echo $documento_editar ? ' — dejar vacío para mantener el actual' : ''; ?>:</label>
                        <input type="file" id="archivo" name="archivo" accept="application/pdf" <?php echo $documento_editar ? '' : 'required'; ?>>

                        <button type="submit" name="guardar_documento" class="boton boton-primario"><?php echo $documento_editar ? 'Actualizar Folleto' : 'Agregar Folleto Médico'; ?></button>
                    </form>
                </section>

                <?php while ($doc = $resultado_documentos->fetch_assoc()): ?>
                <!-- htmlspecialchars en todo lo que sale de la bd, asi si a alguien se le ocurre cargar codigo raro en el titulo no se ejecuta -->
                <section class="tarjeta tarjeta-folleto">
                    <span class="badge"><?php echo htmlspecialchars($doc['departamento']); ?></span>
                    <h3><?php echo htmlspecialchars($doc['titulo']); ?></h3>
                    <p><?php echo htmlspecialchars($doc['descripcion']); ?></p>
                    <p class="fecha-folleto">Cargado el <?php echo htmlspecialchars($doc['fecha_carga']); ?></p>

                    <?php
                    // consulta por documento (una por tarjeta) para traer sus instrucciones ordenadas
                    $sql_instrucciones = $con->prepare("SELECT texto_instruccion, es_pauta_alarma FROM Instruccion WHERE id_documento = ? ORDER BY orden");
                    $sql_instrucciones->bind_param("i", $doc['id_documento']);
                    $sql_instrucciones->execute();
                    $instrucciones_doc = $sql_instrucciones->get_result();
                    ?>
                    <ul class="lista-instrucciones">
                        <?php while ($instruccion = $instrucciones_doc->fetch_assoc()): ?>
                        <li class="<?php echo $instruccion['es_pauta_alarma'] ? 'pauta-alarma' : ''; ?>">
                            <?php echo htmlspecialchars($instruccion['texto_instruccion']); ?>
                        </li>
                        <?php endwhile; ?>
                    </ul>
                    <?php $sql_instrucciones->close(); ?>

                    <!-- basename() se queda solo con el nombre del archivo, tira las carpetas, por las dudas -->
                    <a href="documentos/<?php echo htmlspecialchars(basename($doc['archivo'])); ?>" target="_blank" class="boton boton-secundario">Ver Archivo</a>

                    <div class="acciones-tarjeta">
                        <a href="listar.php?editar=<?php echo $doc['id_documento']; ?>" class="enlace-accion">Editar</a>
                        <a href="listar.php?eliminar=<?php echo $doc['id_documento']; ?>" class="enlace-accion confirmar-borrado">Borrar</a>
                    </div>
                </section>
                <?php endwhile; ?>

            </div>

        </main>

    </div>

    <script src="<?php echo BASE_URL; ?>assets/js/main.js"></script>

</body>
</html>
