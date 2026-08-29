<?php

session_start();

if (!isset($_SESSION['id_funcionario'])) {
    header("Location: ../../index.html");
    exit;
}

$pagina_actual = 'folleteria';

require_once '../../config/conexion.php';

// esta pagina se manda el formulario a si misma, por eso hay que fijarse si es un POST antes de procesar nada
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['guardar_documento'])) {

    $titulo = trim($_POST['titulo']);
    $descripcion = trim($_POST['descripcion']);
    $departamento = trim($_POST['departamento']);
    $archivo = $_FILES['archivo']; // $_FILES no es como $_POST, es un array con datos del archivo (nombre, tipo, y donde quedo guardado momentaneamente)

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

        // instrucciones clinicas: minimo 2 normales + 1 opcional marcada como pauta de alarma
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

        // armo un codigo y una url cualquiera para este documento, no hace falta que sea sofisticado, solo unico
        $codigo_generado = "QR-" . $id_documento_nuevo . "-" . time();
        $url_generada = BASE_URL . "modulos/folleto_publico/ver.php?id=" . $id_documento_nuevo;

        $sql_qr = "INSERT INTO Codigo_qr (codigo, url, id_documento) VALUES (?, ?, ?)";
        $stmt_qr = $con->prepare($sql_qr);
        $stmt_qr->bind_param("ssi", $codigo_generado, $url_generada, $id_documento_nuevo);
        $stmt_qr->execute();
        $stmt_qr->close();
    }

    header("Location: listar.php"); // pase lo que pase (bien o mal), siempre redirijo para que no se pueda reenviar el formulario con F5
    exit;
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
                    <h3>Agregar Folleto Médico</h3>
                    <!-- sin enctype="multipart/form-data" el archivo llega vacio al servidor, no tira error, simplemente no llega -->
                    <form action="listar.php" method="POST" enctype="multipart/form-data">
                        <label for="titulo">Título:</label>
                        <input type="text" id="titulo" name="titulo" placeholder="Indicaciones de IVE" required>

                        <label for="descripcion">Descripción:</label>
                        <input type="text" id="descripcion" name="descripcion" placeholder="Protocolo de cuidados..." required>

                        <label for="departamento">Departamento Médico:</label>
                        <select id="departamento" name="departamento" required>
                            <option value="Ginecología y Obstetricia">Ginecología y Obstetricia</option>
                            <option value="Urología">Urología</option>
                            <option value="Cardiología y Hematología">Cardiología y Hematología</option>
                            <option value="Radiología / Imagenología">Radiología / Imagenología</option>
                            <option value="Nefrología y Trasplante Renal">Nefrología y Trasplante Renal</option>
                        </select>

                        <label for="instruccion1">Indicación clínica 1:</label>
                        <input type="text" id="instruccion1" name="instruccion1" placeholder="Reposo relativo por 48hs" required>

                        <label for="instruccion2">Indicación clínica 2:</label>
                        <input type="text" id="instruccion2" name="instruccion2" placeholder="Tomar la medicación cada 8hs" required>

                        <label for="pauta_alarma">Pauta de alarma (opcional):</label>
                        <input type="text" id="pauta_alarma" name="pauta_alarma" placeholder="Fiebre mayor a 38° o sangrado abundante">

                        <label for="archivo">Archivo (PDF):</label>
                        <input type="file" id="archivo" name="archivo" accept="application/pdf" required>

                        <button type="submit" name="guardar_documento" class="boton boton-primario">Agregar Folleto Médico</button>
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
                </section>
                <?php endwhile; ?>

            </div>

        </main>

    </div>

</body>
</html>
