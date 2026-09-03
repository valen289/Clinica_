<?php
// Requiere $con (conexión) y $tab_activo ('ambulancias' | 'personal' | 'rutas') definidos antes de incluir este archivo.

$total_ambulancias = $con->query("SELECT COUNT(*) AS total FROM Ambulancia")->fetch_assoc()['total'];
$total_conductores = $con->query("SELECT COUNT(*) AS total FROM Conductor")->fetch_assoc()['total'];
$total_acompanantes = $con->query("SELECT COUNT(*) AS total FROM Acompaniante")->fetch_assoc()['total'];
$total_personal = $total_conductores + $total_acompanantes;
$total_rutas = $con->query("SELECT COUNT(*) AS total FROM Ruta")->fetch_assoc()['total'];
?>
<div class="cabecera-modulo">
    <div class="fila-badges-modulo">
        <span class="badge-modulo">MÓDULO 5 · ABM RECURSOS</span>
    </div>
    <h2>Mantenimiento de Recursos Operativos de Traslado</h2>
    <p>Administración centralizada de unidades móviles (Ambulancias), personal operativo (Conductores y Acompañantes) y catálogo de rutas de traslado nacional.</p>

    <div class="tabs-cu">
        <a href="<?php echo BASE_URL; ?>modulos/recursos/ambulancias.php" class="tab-cu tab-azul <?php echo ($tab_activo === 'ambulancias') ? 'activo' : ''; ?>">
            AMBULANCIAS<span>(<?php echo $total_ambulancias; ?>)</span>
        </a>
        <a href="<?php echo BASE_URL; ?>modulos/recursos/personal.php" class="tab-cu tab-violeta <?php echo ($tab_activo === 'personal') ? 'activo' : ''; ?>">
            PERSONAL<span>(<?php echo $total_personal; ?>)</span>
        </a>
        <a href="<?php echo BASE_URL; ?>modulos/recursos/rutas.php" class="tab-cu tab-verde <?php echo ($tab_activo === 'rutas') ? 'activo' : ''; ?>">
            RUTAS<span>(<?php echo $total_rutas; ?>)</span>
        </a>
    </div>
</div>
