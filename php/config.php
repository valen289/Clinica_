<?php

$config_local = __DIR__ . '/config.local.php';
if (file_exists($config_local)) {
    require $config_local;
}

if (!defined('BD_HOST')) {
    define('BD_HOST', getenv('BD_HOST') ?: 'localhost');
}
if (!defined('BD_USUARIO')) {
    define('BD_USUARIO', getenv('BD_USUARIO') ?: 'root');
}
if (!defined('BD_CLAVE')) {
    define('BD_CLAVE', getenv('BD_CLAVE') ?: '');
}
if (!defined('BD_NOMBRE')) {
    define('BD_NOMBRE', getenv('BD_NOMBRE') ?: 'hospital_clinicas');
}

