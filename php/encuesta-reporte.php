<?php

header('Content-Type: application/json');

require_once __DIR__ . '/auth.php';
requerir_sesion(['Chofer']);

require_once __DIR__ . '/conexion.php';

// Resultados de una encuesta, ya resumidos por pregunta.
// Nunca sale quién respondió qué: el reporte es anónimo aunque la base guarde la cédula.
$id_encuesta = (int) ($_GET['id'] ?? 0);

$stmt = $con->prepare("SELECT e.id_encuesta, e.titulo, e.descripcion, e.fecha_creacion, e.fecha_cierre, e.estado,
                              (e.fecha_cierre IS NOT NULL AND e.fecha_cierre < CURDATE()) AS vencida,
                              CONCAT(f.nombre, ' ', f.apellido) AS creada_por
                       FROM Encuesta e INNER JOIN Funcionario f ON f.id_funcionario = e.id_funcionario
                       WHERE e.id_encuesta = ?");
$stmt->bind_param("i", $id_encuesta);
$stmt->execute();
$encuesta = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$encuesta) {
    echo json_encode(['exito' => true, 'datos' => null]);
    $con->close();
    exit;
}

$stmt = $con->prepare("SELECT COUNT(DISTINCT r.id_ci) AS total FROM Respuesta r
                       INNER JOIN Pregunta p ON p.id_pregunta = r.id_pregunta WHERE p.id_encuesta = ?");
$stmt->bind_param("i", $id_encuesta);
$stmt->execute();
$encuesta['respuestas'] = (int) $stmt->get_result()->fetch_assoc()['total'];
$stmt->close();

$stmt = $con->prepare("SELECT id_pregunta, texto_pregunta, tipo_pregunta FROM Pregunta WHERE id_encuesta = ? ORDER BY id_pregunta");
$stmt->bind_param("i", $id_encuesta);
$stmt->execute();
$preguntas = filas($stmt->get_result());
$stmt->close();

$stmt_respuestas = $con->prepare("SELECT respuesta_texto, fecha_respuesta FROM Respuesta WHERE id_pregunta = ? ORDER BY id_respuesta DESC");

foreach ($preguntas as &$pregunta) {
    $stmt_respuestas->bind_param("i", $pregunta['id_pregunta']);
    $stmt_respuestas->execute();
    $respuestas = filas($stmt_respuestas->get_result());

    $pregunta['total'] = count($respuestas);

    if ($pregunta['tipo_pregunta'] === 'escala') {
        // cuántas veces se eligió cada número del 1 al 5, y el promedio
        $conteo = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
        foreach ($respuestas as $r) {
            $valor = (int) $r['respuesta_texto'];
            if (isset($conteo[$valor])) {
                $conteo[$valor]++;
            }
        }
        $suma = 0;
        foreach ($conteo as $valor => $cantidad) {
            $suma += $valor * $cantidad;
        }
        $pregunta['conteo'] = $conteo;
        $pregunta['promedio'] = $pregunta['total'] ? round($suma / $pregunta['total'], 1) : null;
    } elseif ($pregunta['tipo_pregunta'] === 'si_no') {
        $si = count(array_filter($respuestas, function ($r) { return $r['respuesta_texto'] === 'Sí'; }));
        $pregunta['conteo'] = ['Sí' => $si, 'No' => $pregunta['total'] - $si];
    } else {
        // texto libre: los comentarios con su fecha, del más nuevo al más viejo
        $pregunta['comentarios'] = $respuestas;
    }
}
unset($pregunta);
$stmt_respuestas->close();

$encuesta['preguntas'] = $preguntas;

echo json_encode(['exito' => true, 'datos' => $encuesta]);
$con->close();
