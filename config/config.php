<?php

define('BD_HOST', getenv('BD_HOST') ?: 'localhost');
define('BD_USUARIO', getenv('BD_USUARIO') ?: 'root');
define('BD_CLAVE', getenv('BD_CLAVE') ?: '');
define('BD_NOMBRE', getenv('BD_NOMBRE') ?: 'hospital_clinicas');

// BASE_URL se calcula sola a partir de dónde está el proyecto dentro del
// document root del servidor, para que las rutas funcionen tanto en
// localhost/Clinica_/ como en un servidor donde el proyecto esté en otra
// carpeta o en la raíz del dominio. Solo se puede fijar a mano seteando la
// variable de entorno BASE_URL.
$base_url = getenv('BASE_URL');
if (!$base_url) {
    $raiz_proyecto = str_replace('\\', '/', dirname(__DIR__));
    $raiz_documentos = str_replace('\\', '/', rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/'));
    $prefijo = ($raiz_documentos !== '' && strpos($raiz_proyecto, $raiz_documentos) === 0)
        ? substr($raiz_proyecto, strlen($raiz_documentos))
        : '';
    $base_url = '/' . trim($prefijo, '/');
    $base_url = rtrim($base_url, '/') . '/';
}
define('BASE_URL', $base_url);