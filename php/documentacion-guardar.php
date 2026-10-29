<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion(['Chofer']);

require_once __DIR__ . '/conexion.php';

function responder_error($mensaje) {
    http_response_code(422);
    echo json_encode(['exito' => false, 'error' => $mensaje]);
    exit;
}

// los PDF se guardan físicamente en /documentos/ (raíz del proyecto), no acá en /php/,
// así que la ruta física necesita salir de __DIR__ y no ser relativa
$carpeta_documentos = __DIR__ . '/../documentos/';
$tamanio_maximo_pdf = 10 * 1024 * 1024;

$titulo = trim($_POST['titulo'] ?? '');
$descripcion = trim($_POST['descripcion'] ?? '');
$departamento = trim($_POST['departamento'] ?? '');
$id_documento_editar = !empty($_POST['id_documento_editar']) ? (int) $_POST['id_documento_editar'] : null;

// instrucciones[] y alarmas[] llegan como arrays; se descartan los campos vacíos
$instrucciones = array_values(array_filter(array_map('trim', (array) ($_POST['instrucciones'] ?? [])), 'strlen'));
$alarmas = array_values(array_filter(array_map('trim', (array) ($_POST['alarmas'] ?? [])), 'strlen'));

if ($titulo === '' || $descripcion === '' || $departamento === '') {
    responder_error('Completá título, descripción y departamento.');
}
if (mb_strlen($titulo) > 50) {
    responder_error('El título no puede superar los 50 caracteres.');
}
if (count($instrucciones) < 2) {
    responder_error('Ingresá al menos 2 indicaciones clínicas.');
}

// el PDF es opcional: solo se valida si se subió algo
$archivo = $_FILES['archivo'] ?? null;
$hay_archivo = $archivo && $archivo['error'] !== UPLOAD_ERR_NO_FILE;
$ruta_nueva = null;

if ($hay_archivo) {
    if ($archivo['error'] !== UPLOAD_ERR_OK) {
        responder_error('No se pudo subir el archivo (error ' . $archivo['error'] . ').');
    }
    if ($archivo['size'] > $tamanio_maximo_pdf) {
        responder_error('El PDF no puede superar los 10 MB.');
    }
    $tipo = (new finfo(FILEINFO_MIME_TYPE))->file($archivo['tmp_name']);
    if ($tipo !== 'application/pdf') {
        responder_error('El archivo debe ser un PDF.');
    }
}

$archivo_anterior = null;
if ($id_documento_editar) {
    $stmt_existe = $con->prepare("SELECT archivo FROM Documento WHERE id_documento = ?");
    $stmt_existe->bind_param("i", $id_documento_editar);
    $stmt_existe->execute();
    $existente = $stmt_existe->get_result()->fetch_assoc();
    $stmt_existe->close();
    if (!$existente) {
        responder_error('El documento que intentás editar no existe.');
    }
    $archivo_anterior = $existente['archivo'];
}

if ($hay_archivo) {
    // la hora adelante evita que dos documentos con el mismo nombre se pisen; el resto del nombre se limpia
    $nombre_limpio = preg_replace('/[^A-Za-z0-9._-]/', '_', basename($archivo['name']));
    $nombre_archivo = time() . '_' . $nombre_limpio;
    $ruta_nueva = 'documentos/' . $nombre_archivo;
    if (!move_uploaded_file($archivo['tmp_name'], $carpeta_documentos . $nombre_archivo)) {
        responder_error('No se pudo guardar el archivo en el servidor.');
    }
}

$con->begin_transaction();
try {
    if ($id_documento_editar) {
        $id_documento = $id_documento_editar;

        if ($ruta_nueva) {
            $stmt = $con->prepare("UPDATE Documento SET titulo = ?, descripcion = ?, departamento = ?, archivo = ? WHERE id_documento = ?");
            $stmt->bind_param("ssssi", $titulo, $descripcion, $departamento, $ruta_nueva, $id_documento);
        } else {
            $stmt = $con->prepare("UPDATE Documento SET titulo = ?, descripcion = ?, departamento = ? WHERE id_documento = ?");
            $stmt->bind_param("sssi", $titulo, $descripcion, $departamento, $id_documento);
        }
        $stmt->execute();
        $stmt->close();

        // las instrucciones se reemplazan enteras
        $stmt = $con->prepare("DELETE FROM Instruccion WHERE id_documento = ?");
        $stmt->bind_param("i", $id_documento);
        $stmt->execute();
        $stmt->close();
    } else {
        // sin PDF se guarda cadena vacía (la columna es NOT NULL)
        $ruta_guardar = $ruta_nueva ?? '';
        $stmt = $con->prepare("INSERT INTO Documento (titulo, descripcion, departamento, archivo, fecha_carga, id_funcionario) VALUES (?, ?, ?, ?, CURDATE(), ?)");
        $stmt->bind_param("ssssi", $titulo, $descripcion, $departamento, $ruta_guardar, $_SESSION['id_funcionario']);
        $stmt->execute();
        $id_documento = $stmt->insert_id;
        $stmt->close();

        $codigo_generado = "QR-" . $id_documento . "-" . time();

        // la url del QR tiene que ser absoluta (con dominio) para poder escanearse desde un celular.
        // se arma en base al request actual, asi funciona sin importar el prefijo que use el servidor
        $protocolo_actual = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $ruta_actual = strtok($_SERVER['REQUEST_URI'], '?');
        $prefijo_proyecto = preg_replace('#php/documentacion-guardar\.php$#', '', $ruta_actual);
        $url_generada = $protocolo_actual . '://' . $_SERVER['HTTP_HOST'] . $prefijo_proyecto . "paginas/documento-publico.html?id=" . $id_documento;

        $stmt = $con->prepare("INSERT INTO Codigo_qr (codigo, url, id_documento) VALUES (?, ?, ?)");
        $stmt->bind_param("ssi", $codigo_generado, $url_generada, $id_documento);
        $stmt->execute();
        $stmt->close();
    }

    $stmt = $con->prepare("INSERT INTO Instruccion (id_documento, orden, texto_instruccion, es_pauta_alarma) VALUES (?, ?, ?, ?)");
    $orden = 1;
    $es_alarma = 0;
    $texto = '';
    $stmt->bind_param("iisi", $id_documento, $orden, $texto, $es_alarma);
    foreach ($instrucciones as $texto) {
        $stmt->execute();
        $orden++;
    }
    $es_alarma = 1;
    foreach ($alarmas as $texto) {
        $stmt->execute();
        $orden++;
    }
    $stmt->close();

    $con->commit();
} catch (Throwable $e) {
    $con->rollback();
    if ($ruta_nueva && file_exists(__DIR__ . '/../' . $ruta_nueva)) {
        unlink(__DIR__ . '/../' . $ruta_nueva); // no dejar un PDF huérfano si falló la base
    }
    error_log('documentacion-guardar: ' . $e->getMessage());
    responder_error('No se pudo guardar el documento. Intente nuevamente.');
}

// recién con la base confirmada se borra el PDF reemplazado
if ($ruta_nueva && $archivo_anterior) {
    $ruta_vieja = __DIR__ . '/../' . $archivo_anterior;
    if (is_file($ruta_vieja)) {
        unlink($ruta_vieja);
    }
}

echo json_encode(['exito' => true]);
$con->close();
