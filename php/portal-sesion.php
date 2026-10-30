<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
iniciar_sesion();

if (isset($_SESSION['id_paciente'])) {
    echo json_encode([
        'autenticado' => true,
        'nombre' => $_SESSION['nombre_paciente'],
    ]);
} else {
    echo json_encode(['autenticado' => false]);
}
