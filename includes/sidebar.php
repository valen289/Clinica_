<aside class="sidebar">
       <p class="sidebar-titulo">COMPONENTES</p>
    <nav>
        <ul>
            <?php $es_chofer = (($_SESSION['rol'] ?? '') === 'Chofer'); ?>
            <li class="<?php echo ($pagina_actual === 'login') ? 'activo' : ''; ?>"><a href="../../index.html">Portal Clínicas (Login)</a></li>
            <?php if (!$es_chofer): ?>
            <li class="<?php echo ($pagina_actual === 'folleteria') ? 'activo' : ''; ?>"><a href="../../modulos/folleteria/listar.php">Documentos Médicos (Admin) <span class="badge">Mód. 1</span></a></li>
            <?php endif; ?>
            <li class="<?php echo ($pagina_actual === 'folleto_publico') ? 'activo' : ''; ?>"><a href="../../modulos/folleto_publico/ver.php">Documento QR (Paciente)</a></li>
            <li class="<?php echo ($pagina_actual === 'ambulancias') ? 'activo' : ''; ?>"><a href="../../modulos/ambulancias/listar.php">Rutas de Ambulancias <span class="badge">Mód. 4</span></a></li>
            <?php if (!$es_chofer): ?>
            <li class="<?php echo ($pagina_actual === 'recursos') ? 'activo' : ''; ?>"><a href="../../modulos/recursos/ambulancias.php">ABM Recursos <span class="badge">Mód. 5</span></a></li>
            <?php endif; ?>
            <li class="<?php echo ($pagina_actual === 'encuestas') ? 'activo' : ''; ?>"><a href="../../modulos/encuestas/listar.php">Encuestas y Reportes <span class="badge">Mód. 3</span></a></li>
        </ul>
    </nav>
    </aside>
