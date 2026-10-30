<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion(['Chofer']);

require_once __DIR__ . '/conexion.php';

$ci = (int) ($_GET['ci'] ?? 0);

// del portal solo sale el estado de la cuenta: nunca los hashes de la contraseña o del código
$stmt = $con->prepare("SELECT id_ci, nombre, apellido, fecha_nacimiento, telefono, email, direccion, fecha_alta,
                              contrasenia IS NOT NULL AS cuenta_activa,
                              (codigo_activacion IS NOT NULL AND codigo_vence > NOW()) AS codigo_vigente,
                              codigo_vence, cuenta_activada, ultimo_ingreso
                       FROM Paciente WHERE id_ci = ?");
$stmt->bind_param("i", $ci);
$stmt->execute();
$paciente = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$paciente) {
    echo json_encode(['exito' => true, 'datos' => null]);
    $con->close();
    exit;
}

// del archivo solo se avisa si hay o no: el PDF se pide por id a estudio-archivo.php, nunca por ruta
$stmt = $con->prepare("SELECT e.id_estudio, e.tipo, e.titulo, e.fecha_estudio, e.estado, e.observaciones, e.fecha_carga,
                              e.archivo <> '' AS tiene_pdf,
                              CONCAT(f.nombre, ' ', f.apellido) AS cargado_por
                       FROM Estudio e
                       INNER JOIN Funcionario f ON f.id_funcionario = e.id_funcionario
                       WHERE e.id_paciente = ?
                       ORDER BY e.fecha_estudio DESC, e.id_estudio DESC");
$stmt->bind_param("i", $ci);
$stmt->execute();
$estudios = filas($stmt->get_result());
$stmt->close();

$stmt = $con->prepare("SELECT d.id_documento, d.titulo, d.departamento, pd.fecha_asignacion
                       FROM Paciente_documento pd
                       INNER JOIN Documento d ON d.id_documento = pd.id_documento
                       WHERE pd.id_paciente = ?
                       ORDER BY pd.fecha_asignacion DESC, d.titulo");
$stmt->bind_param("i", $ci);
$stmt->execute();
$documentos = filas($stmt->get_result());
$stmt->close();

// los documentos que todavía no tiene, para el selector de "Asignar documento"
$stmt = $con->prepare("SELECT d.id_documento, d.titulo, d.departamento
                       FROM Documento d
                       WHERE d.id_documento NOT IN (SELECT id_documento FROM Paciente_documento WHERE id_paciente = ?)
                       ORDER BY d.departamento, d.titulo");
$stmt->bind_param("i", $ci);
$stmt->execute();
$documentos_disponibles = filas($stmt->get_result());
$stmt->close();

$stmt = $con->prepare("SELECT t.id_traslado, t.fecha, t.hora_salida, t.estado, r.origen, r.destino, a.matricula
                       FROM Traslado t
                       INNER JOIN Ruta r ON r.id_ruta = t.id_ruta
                       INNER JOIN Ambulancia a ON a.id_ambulancia = t.id_ambulancia
                       WHERE t.id_paciente = ?
                       ORDER BY t.id_traslado DESC");
$stmt->bind_param("i", $ci);
$stmt->execute();
$traslados = filas($stmt->get_result());
$stmt->close();

$paciente['estudios'] = $estudios;
$paciente['documentos'] = $documentos;
$paciente['documentos_disponibles'] = $documentos_disponibles;
$paciente['traslados'] = $traslados;

echo json_encode(['exito' => true, 'datos' => $paciente]);
$con->close();
