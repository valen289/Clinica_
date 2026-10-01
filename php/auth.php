<?php

function requerir_sesion(array $rolesExcluidos = []) {
    session_start();

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
