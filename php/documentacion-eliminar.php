<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion(['Chofer']);

require_once __DIR__ . '/conexion.php';

$id_borrar = $_POST['id_documento'];

// primero las filas hijas (Instruccion y Codigo_qr referencian a Documento por FK,
// no se puede borrar el Documento mientras existan) y despues el archivo fisico
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

if ($doc_a_borrar) {
    $ruta_fisica = __DIR__ . '/../' . $doc_a_borrar['archivo'];
    if (file_exists($ruta_fisica)) {
        unlink($ruta_fisica); // borra el pdf del disco, no solo el registro de la bd
    }
}

echo json_encode(['exito' => true]);
$con->close();
