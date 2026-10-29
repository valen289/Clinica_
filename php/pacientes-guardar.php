<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion(['Chofer']);

require_once __DIR__ . '/conexion.php';
require_once __DIR__ . '/cedula.php';

function responder_error($mensaje) {
    http_response_code(422);
    echo json_encode(['exito' => false, 'error' => $mensaje]);
    exit;
}

// en edición la cédula no cambia: es la clave del paciente y la usan estudios, documentos y traslados
$ci_editar = !empty($_POST['ci_editar']) ? (int) $_POST['ci_editar'] : null;
$ci = $ci_editar ?: cedula_a_numero($_POST['ci'] ?? '');

$nombre = trim($_POST['nombre'] ?? '');
$apellido = trim($_POST['apellido'] ?? '');
$fecha_nacimiento = trim($_POST['fecha_nacimiento'] ?? '');
$telefono = trim($_POST['telefono'] ?? '');
$email = trim($_POST['email'] ?? '');
$direccion = trim($_POST['direccion'] ?? '');

if (!$ci) {
    responder_error('La cédula no es válida. Revisá los números y el dígito verificador.');
}
if ($nombre === '' || $apellido === '') {
    responder_error('Completá nombre y apellido.');
}
if (mb_strlen($nombre) > 50 || mb_strlen($apellido) > 50) {
    responder_error('Nombre y apellido pueden tener hasta 50 caracteres.');
}
if ($fecha_nacimiento !== '') {
    $fecha = DateTime::createFromFormat('Y-m-d', $fecha_nacimiento);
    if (!$fecha || $fecha->format('Y-m-d') !== $fecha_nacimiento || $fecha > new DateTime() || (int) $fecha->format('Y') < 1900) {
        responder_error('La fecha de nacimiento no es válida.');
    }
}
if ($telefono !== '' && !preg_match('/^[0-9 +()\-]{6,30}$/', $telefono)) {
    responder_error('El teléfono solo puede tener números, espacios, + y guiones.');
}
if ($email !== '' && (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 80)) {
    responder_error('Ingresá un email válido.');
}
if (mb_strlen($direccion) > 60) {
    responder_error('La dirección puede tener hasta 60 caracteres.');
}

// los campos opcionales vacíos se guardan como NULL
$fecha_guardar = $fecha_nacimiento !== '' ? $fecha_nacimiento : null;
$telefono_guardar = $telefono !== '' ? $telefono : null;
$email_guardar = $email !== '' ? $email : null;
$direccion_guardar = $direccion !== '' ? $direccion : null;

$stmt = $con->prepare("SELECT id_ci FROM Paciente WHERE id_ci = ?");
$stmt->bind_param("i", $ci);
$stmt->execute();
$existe = $stmt->get_result()->num_rows > 0;
$stmt->close();

if ($ci_editar) {
    if (!$existe) {
        responder_error('El paciente que intentás editar no existe.');
    }
    $stmt = $con->prepare("UPDATE Paciente SET nombre = ?, apellido = ?, fecha_nacimiento = ?, telefono = ?, email = ?, direccion = ? WHERE id_ci = ?");
    $stmt->bind_param("ssssssi", $nombre, $apellido, $fecha_guardar, $telefono_guardar, $email_guardar, $direccion_guardar, $ci);
} else {
    if ($existe) {
        responder_error('Ya hay un paciente registrado con esa cédula.');
    }
    $stmt = $con->prepare("INSERT INTO Paciente (id_ci, nombre, apellido, fecha_nacimiento, telefono, email, direccion, fecha_alta) VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())");
    $stmt->bind_param("issssss", $ci, $nombre, $apellido, $fecha_guardar, $telefono_guardar, $email_guardar, $direccion_guardar);
}

$stmt->execute();
$stmt->close();

echo json_encode(['exito' => true, 'ci' => $ci]);
$con->close();
