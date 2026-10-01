<?php

session_start();
header('Content-Type: application/json');

if (isset($_SESSION['id_funcionario'])) {
    echo json_encode([
        'autenticado' => true,
        'id_funcionario' => $_SESSION['id_funcionario'],
        'nombre' => $_SESSION['nombre'],
        'rol' => $_SESSION['rol'],
    ]);
} else {
    echo json_encode(['autenticado' => false]);
}
