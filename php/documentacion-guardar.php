<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion(['Chofer']);

require_once __DIR__ . '/conexion.php';

// los PDF se guardan físicamente en /documentos/ (raíz del proyecto), no acá en /php/,
// así que la ruta física necesita salir de __DIR__ y no ser relativa
$carpeta_documentos = __DIR__ . '/../documentos/';

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
        move_uploaded_file($archivo['tmp_name'], $carpeta_documentos . $nombre_archivo);

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

        $nombre_archivo = time() . '_' . basename($archivo['name']); // le pego la hora actual adelante para que dos documentos con el mismo nombre no se pisen entre si
        $ruta = 'documentos/' . $nombre_archivo;
        move_uploaded_file($archivo['tmp_name'], $carpeta_documentos . $nombre_archivo); // esto es lo que realmente mueve el archivo de la carpeta temporal a documentos/

        //  en la base de datos nunca se guarda el archivo en si, solo la ruta de texto para despues poder encontrarlo
        $sql_doc = "INSERT INTO Documento (titulo, descripcion, departamento, archivo, fecha_carga, id_funcionario) VALUES (?, ?, ?, ?, CURDATE(), ?)";
        $stmt_doc = $con->prepare($sql_doc);
        $stmt_doc->bind_param("ssssi", $titulo, $descripcion, $departamento, $ruta, $_SESSION['id_funcionario']); // el funcionario sale de la sesion, no del formulario
        $stmt_doc->execute();

        $id_documento_nuevo = $stmt_doc->insert_id; // el id que mysql le puso solo al documento recien insertado, lo necesito para el QR y las instrucciones
        $stmt_doc->close();

        // armo un codigo y una url cualquiera para este documento, no hace falta que sea sofisticado, solo unico
        $codigo_generado = "QR-" . $id_documento_nuevo . "-" . time();

        // la url del QR tiene que ser absoluta (con dominio) para poder escanearse desde un celular.
        // se arma en base al request actual, asi funciona sin importar el prefijo que use el servidor
        // (ej: con proxy /core4/) en vez de depender de una carpeta fija.
        $protocolo_actual = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $ruta_actual = strtok($_SERVER['REQUEST_URI'], '?');
        $prefijo_proyecto = preg_replace('#php/documentacion-guardar\.php$#', '', $ruta_actual);
        $url_generada = $protocolo_actual . '://' . $_SERVER['HTTP_HOST'] . $prefijo_proyecto . "paginas/documento-publico.html?id=" . $id_documento_nuevo;

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

echo json_encode(['exito' => true]);
$con->close();
