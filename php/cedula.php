<?php

// Cédula uruguaya: se acepta con o sin puntos y guion ("1.234.567-2", "12345672")
// y se guarda como número entero incluyendo el dígito verificador.

// devuelve el número limpio (int) o null si no es una cédula válida
function cedula_a_numero($texto) {
    $digitos = preg_replace('/\D/', '', (string) $texto);
    if (strlen($digitos) < 7 || strlen($digitos) > 8) {
        return null;
    }
    $cuerpo = substr($digitos, 0, -1);
    $verificador = (int) substr($digitos, -1);

    return cedula_digito_verificador($cuerpo) === $verificador ? (int) $digitos : null;
}

// algoritmo oficial: cada dígito (completado a 7 con ceros a la izquierda) por 2987634, módulo 10
function cedula_digito_verificador($cuerpo) {
    $cuerpo = str_pad($cuerpo, 7, '0', STR_PAD_LEFT);
    $pesos = [2, 9, 8, 7, 6, 3, 4];
    $suma = 0;
    for ($i = 0; $i < 7; $i++) {
        $suma += (int) $cuerpo[$i] * $pesos[$i];
    }
    return (10 - ($suma % 10)) % 10;
}
