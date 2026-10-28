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

// lo contrario de requerir_sesion: acá se listan los roles que SÍ pueden entrar
function requerir_rol(array $rolesPermitidos) {
    requerir_sesion();

    if (!in_array($_SESSION['rol'] ?? '', $rolesPermitidos, true)) {
        http_response_code(403);
        echo json_encode(['error' => 'No autorizado']);
        exit;
    }
}
