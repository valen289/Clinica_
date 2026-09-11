<?php

require_once __DIR__ . '/config.php';

$con = new mysqli(BD_HOST, BD_USUARIO, BD_CLAVE, BD_NOMBRE);

if ($con->connect_error) {
    error_log("Error de conexión MySQL: " . $con->connect_error);
    die("No se pudo conectar con el servidor. Intente más tarde.");
}
