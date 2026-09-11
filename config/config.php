<?php

// Los valores por defecto son para desarrollo local; en el servidor se
// sobrescriben seteando estas mismas variables de entorno (sin tocar este archivo).
define('BD_HOST', getenv('BD_HOST') ?: 'localhost');
define('BD_USUARIO', getenv('BD_USUARIO') ?: 'root');
define('BD_CLAVE', getenv('BD_CLAVE') ?: '');
define('BD_NOMBRE', getenv('BD_NOMBRE') ?: 'hospital_clinicas');
define('BASE_URL', getenv('BASE_URL') ?: '/Clinica_/');