<aside class="sidebar">
       <p class="sidebar-titulo">COMPONENTES</p>
    <nav>
        <ul>
            <li class="<?php echo ($pagina_actual === 'login') ? 'activo' : ''; ?>"><a href="<?php echo BASE_URL; ?>index.html">Portal Clínicas (Login)</a></li>
            <li class="<?php echo ($pagina_actual === 'folleteria') ? 'activo' : ''; ?>"><a href="<?php echo BASE_URL; ?>modulos/folleteria/listar.php">Folletería Médica (Admin) <span class="badge">Mód. 1</span></a></li>
            <li class="<?php echo ($pagina_actual === 'folleto_publico') ? 'activo' : ''; ?>"><a href="<?php echo BASE_URL; ?>modulos/folleto_publico/ver.php">Folleto QR (Paciente)</a></li>
            <li class="<?php echo ($pagina_actual === 'ambulancias') ? 'activo' : ''; ?>"><a href="<?php echo BASE_URL; ?>modulos/ambulancias/listar.php">Rutas de Ambulancias <span class="badge">Mód. 4</span></a></li>
            <li class="<?php echo ($pagina_actual === 'recursos') ? 'activo' : ''; ?>"><a href="<?php echo BASE_URL; ?>modulos/recursos/ambulancias.php">ABM Recursos <span class="badge">Mód. 5</span></a></li>
            <li class="<?php echo ($pagina_actual === 'encuestas') ? 'activo' : ''; ?>"><a href="<?php echo BASE_URL; ?>modulos/encuestas/listar.php">Encuestas y Reportes <span class="badge">Mód. 3</span></a></li>
        </ul>
    </nav>
    </aside>
