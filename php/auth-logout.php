<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
iniciar_sesion();

$_SESSION = [];
session_destroy();

// además de vaciar la sesión en el servidor, se le pide al navegador que borre la cookie
$parametros = session_get_cookie_params();
setcookie(session_name(), '', [
    'expires' => time() - 3600,
    'path' => $parametros['path'],
    'httponly' => true,
    'samesite' => 'Lax',
]);

echo json_encode(['exito' => true]);
