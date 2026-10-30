<?php

// todas las páginas abren la sesión por acá, así la cookie sale siempre con las mismas opciones:
// httponly (JS no la puede leer) y samesite=Lax (no viaja en formularios de otros sitios)
function iniciar_sesion() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_set_cookie_params([
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function requerir_sesion(array $rolesExcluidos = []) {
    iniciar_sesion();

    if (!isset($_SESSION['id_funcionario'])) {
        http_response_code(401);
        echo json_encode(['error' => 'No autenticado']);
        exit;
    }

    if (in_array($_SESSION['rol'] ?? '', $rolesExcluidos, true)) {
        http_response_code(403);
        echo json_encode(['error' => 'No autorizado']);
        exit;
    }
}

// sesión del portal del paciente: es otra sesión, sin rol (un paciente nunca pasa requerir_sesion).
// Devuelve la cédula del paciente logueado.
function requerir_paciente() {
    iniciar_sesion();

    if (!isset($_SESSION['id_paciente'])) {
        http_response_code(401);
        echo json_encode(['error' => 'No autenticado']);
        exit;
    }
    return (int) $_SESSION['id_paciente'];
}

// hash de relleno: si la cédula no existe se verifica igual contra este, así la respuesta tarda lo mismo
// y no se puede averiguar por el tiempo quién es paciente del hospital
const HASH_DE_RELLENO = '$2y$10$Yfm0sQei69NGFTs76AqRK.oLdNUopritB2F2oDfiRBiaXtbhkv1Pq';

// lo contrario de requerir_sesion: acá se listan los roles que SÍ pueden entrar
function requerir_rol(array $rolesPermitidos) {
    requerir_sesion();

    if (!in_array($_SESSION['rol'] ?? '', $rolesPermitidos, true)) {
        http_response_code(403);
        echo json_encode(['error' => 'No autorizado']);
        exit;
    }
}
