<?php

// Límite de intentos fallidos (login del personal, login y activación del paciente).
// La clave identifica qué se está intentando: el usuario del personal, "pac:12345672", "act:12345672"...
// y se cuenta junto con la IP, para bloquear un rato a quien prueba de más.

const MAX_INTENTOS = 5;
const MINUTOS_BLOQUEO = 15;

function demasiados_intentos($con, $clave, $ip) {
    // limpieza: los intentos de hace más de un día ya no sirven para nada
    $con->query("DELETE FROM Intento_login WHERE fecha < NOW() - INTERVAL 1 DAY");

    $minutos = MINUTOS_BLOQUEO;
    $stmt = $con->prepare("SELECT COUNT(*) AS total FROM Intento_login WHERE usuario = ? AND ip = ? AND fecha > NOW() - INTERVAL ? MINUTE");
    $stmt->bind_param("ssi", $clave, $ip, $minutos);
    $stmt->execute();
    $total = (int) $stmt->get_result()->fetch_assoc()['total'];
    $stmt->close();

    return $total >= MAX_INTENTOS;
}

function registrar_intento_fallido($con, $clave, $ip) {
    $stmt = $con->prepare("INSERT INTO Intento_login (usuario, ip, fecha) VALUES (?, ?, NOW())");
    $stmt->bind_param("ss", $clave, $ip);
    $stmt->execute();
    $stmt->close();
}

function limpiar_intentos($con, $clave, $ip) {
    $stmt = $con->prepare("DELETE FROM Intento_login WHERE usuario = ? AND ip = ?");
    $stmt->bind_param("ss", $clave, $ip);
    $stmt->execute();
    $stmt->close();
}

function responder_bloqueado($con) {
    http_response_code(429);
    echo json_encode(['error' => 'Demasiados intentos fallidos. Esperá ' . MINUTOS_BLOQUEO . ' minutos y volvé a probar.']);
    $con->close();
    exit;
}
