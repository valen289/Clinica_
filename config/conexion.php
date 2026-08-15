<?php

require_once 'config.php';

$con = new mysqli(BD_HOST, BD_USUARIO, BD_CLAVE, BD_NOMBRE);

if ($con->connect_error) {
    die("Error al conectar: " . $con->connect_error);
}