<?php

// Los valores por defecto son para desarrollo local. En el servidor se
// sobrescriben de una de estas dos formas (nunca editando este archivo
// ni commiteando credenciales reales):
//   1) Variables de entorno (BD_HOST, BD_USUARIO, BD_CLAVE, BD_NOMBRE), o
//   2) Un archivo config.local.php (no versionado, ver config.local.php.example)
//      que defina esas mismas constantes. Tiene prioridad sobre las variables
//      de entorno si ambos están presentes.
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

