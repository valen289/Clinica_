document.addEventListener('DOMContentLoaded', async function () {

    const sesion = await SIGSM.protegerPagina('inicio');
    if (!sesion) return;

    const resumen = document.querySelector('#resumen-inicio');
    const listaTraslados = document.querySelector('#lista-traslados');
    const listaAlertas = document.querySelector('#lista-alertas');
    const accesosRapidos = document.querySelector('#accesos-rapidos');
    const aviso = document.querySelector('#aviso-inicio');
    const actualizado = document.querySelector('#inicio-actualizado');
    const botonActualizar = document.querySelector('#boton-actualizar');
    const esChofer = sesion.rol === 'Chofer';
    const MINUTOS_REFRESCO = 2;

    // solo se ofrecen los accesos a páginas que este rol puede abrir
    const ACCESOS = [
        { pagina: 'traslados', href: 'traslados.html#form-despacho', texto: 'Despachar ambulancia', icono: 'ruta' },
        { pagina: 'documentacion', href: 'documentacion.html?nuevo=1', texto: 'Nuevo folleto médico', icono: 'documento' },
        { pagina: 'recursos', href: 'recursos-ambulancias.html', texto: 'Registrar ambulancia', icono: 'ambulancia' },
        { pagina: 'usuarios', href: 'usuarios.html?nuevo=1', texto: 'Crear usuario', icono: 'usuarios' },
    ];

    function renderCabecera() {
        const ahora = new Date();
        const hora = ahora.getHours();
        const saludo = hora < 12 ? 'Buen día' : (hora < 20 ? 'Buenas tardes' : 'Buenas noches');
        const fecha = ahora.toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        document.querySelector('#inicio-fecha').textContent = fecha.charAt(0).toUpperCase() + fecha.slice(1);
        document.querySelector('#inicio-saludo').textContent = saludo + ', ' + (sesion.nombre || '').trim();
    }

    function dato(href, nombreIcono, valor, texto, clase) {
        return '<a href="' + href + '" class="dato-resumen ' + (clase || '') + '">' +
            '<span class="dato-icono">' + SIGSM.icono(nombreIcono, 20) + '</span>' +
            '<span><strong>' + valor + '</strong><small>' + texto + '</small></span></a>';
    }

    function renderResumen(datos) {
        const t = datos.traslados;
        const a = datos.ambulancias;
        const disponibles = a.disponibles + '<span class="dato-total">/' + a.total + '</span>';
        const claseAmbulancias = a.total > 0 && a.disponibles === 0 ? 'dato-rojo' : 'dato-verde';
        const hrefAmbulancias = SIGSM.puedeEntrar('recursos', sesion.rol) ? 'recursos-ambulancias.html' : 'traslados.html';

        let cuarto;
        if (datos.documentos) {
            cuarto = dato('documentacion.html', 'documento', datos.documentos.total, 'Folletos publicados', 'dato-ambar');
        } else {
            cuarto = dato('traslados.html', 'reloj', t.pendientes, 'Esperando salida', 'dato-ambar');
        }

        resumen.innerHTML =
            dato('traslados.html', 'ruta', t.hoy, 'Traslados de hoy', '') +
            dato('traslados.html', 'actividad', t.en_curso, 'Traslados en curso', 'dato-violeta') +
            dato(hrefAmbulancias, 'ambulancia', disponibles, 'Ambulancias disponibles', claseAmbulancias) +
            cuarto;
    }

    // "2026-10-28" + "21:36:10" -> "Hoy · 21:36" (o la fecha si no es de hoy)
    function cuando(fecha, hora) {
        const hoy = new Date();
        const hoyIso = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
        const dia = fecha === hoyIso ? 'Hoy' : SIGSM.formatearFecha(fecha);
        return hora ? dia + ' · ' + String(hora).slice(0, 5) : dia;
    }

    function renderTraslados(recientes) {
        if (!recientes.length) {
            listaTraslados.innerHTML =
                '<li class="vacio-inicio">' +
                    '<p>Todavía no hay traslados despachados.</p>' +
                    '<a class="enlace-ver-todo" href="traslados.html#form-despacho">Despachar el primero</a>' +
                '</li>';
            return;
        }

        listaTraslados.innerHTML = recientes.map(function (t) {
            return '<li class="item-traslado">' +
                '<span class="item-traslado-icono">' + SIGSM.icono('ambulancia', 18) + '</span>' +
                '<div class="item-traslado-datos">' +
                    '<strong>' + SIGSM.escapar(t.origen + ' → ' + t.destino) + '</strong>' +
                    '<small>' + SIGSM.escapar(t.matricula + ' · ' + t.conductor_nombre + ' ' + t.conductor_apellido) + '</small>' +
                '</div>' +
                '<div class="item-traslado-estado">' +
                    '<span class="pill-estado ' + SIGSM.claseEstadoTraslado(t.estado) + '">' + SIGSM.escapar(t.estado) + '</span>' +
                    '<small>' + SIGSM.escapar(cuando(t.fecha, t.hora_salida)) + '</small>' +
                '</div>' +
            '</li>';
        }).join('');
    }

    function armarAlertas(datos) {
        const alertas = [];
        const a = datos.ambulancias;
        const noOperativas = a.mantenimiento + a.fuera_servicio;
        const hrefRecursos = SIGSM.puedeEntrar('recursos', sesion.rol) ? 'recursos-ambulancias.html' : '';

        if (a.total > 0 && a.disponibles === 0) {
            alertas.push({ tipo: 'rojo', icono: 'alarma', titulo: 'No hay ambulancias disponibles', detalle: 'No se puede despachar ningún traslado nuevo.', href: hrefRecursos });
        }
        if (noOperativas > 0) {
            alertas.push({
                tipo: 'rojo', icono: 'ambulancia',
                titulo: SIGSM.textoPlural(noOperativas, 'ambulancia no operativa', 'ambulancias no operativas'),
                detalle: a.mantenimiento + ' en mantenimiento, ' + a.fuera_servicio + ' fuera de servicio.',
                href: hrefRecursos,
            });
        }
        if (datos.traslados.pendientes > 0) {
            alertas.push({
                tipo: 'ambar', icono: 'reloj',
                titulo: SIGSM.textoPlural(datos.traslados.pendientes, 'traslado esperando salida', 'traslados esperando salida'),
                detalle: 'Ya se despacharon pero todavía no salieron.',
                href: 'traslados.html',
            });
        }
        if (datos.documentos && datos.documentos.incompletos > 0) {
            alertas.push({
                tipo: 'ambar', icono: 'incompleto',
                titulo: SIGSM.textoPlural(datos.documentos.incompletos, 'folleto incompleto', 'folletos incompletos'),
                detalle: 'Tienen menos de 2 indicaciones clínicas.',
                href: 'documentacion.html?estado=incompleto',
            });
        }
        return alertas;
    }

    function renderAlertas(datos) {
        const alertas = armarAlertas(datos);

        if (!alertas.length) {
            listaAlertas.innerHTML =
                '<li class="alerta-inicio alerta-ok">' +
                    '<span class="alerta-icono">' + SIGSM.icono('check', 18) + '</span>' +
                    '<span><strong>Todo en orden</strong><small>No hay nada pendiente de revisar.</small></span>' +
                '</li>';
            return;
        }

        listaAlertas.innerHTML = alertas.map(function (alerta) {
            const etiqueta = alerta.href ? 'a' : 'div';
            const destino = alerta.href ? ' href="' + alerta.href + '"' : '';
            return '<li><' + etiqueta + destino + ' class="alerta-inicio alerta-' + alerta.tipo + '">' +
                '<span class="alerta-icono">' + SIGSM.icono(alerta.icono, 18) + '</span>' +
                '<span><strong>' + SIGSM.escapar(alerta.titulo) + '</strong><small>' + SIGSM.escapar(alerta.detalle) + '</small></span>' +
            '</' + etiqueta + '></li>';
        }).join('');
    }

    function renderAccesos() {
        accesosRapidos.innerHTML = ACCESOS
            .filter(function (acceso) { return SIGSM.puedeEntrar(acceso.pagina, sesion.rol); })
            .map(function (acceso) {
                return '<a class="acceso-rapido" href="' + acceso.href + '">' + SIGSM.icono(acceso.icono, 18) + '<span>' + acceso.texto + '</span></a>';
            })
            .join('');
    }

    async function cargarResumen() {
        botonActualizar.disabled = true;
        try {
            const respuesta = await fetch('../php/inicio-resumen.php');
            const resultado = await respuesta.json();
            if (!resultado.exito) throw new Error(resultado.error || 'Error al cargar el resumen');

            renderResumen(resultado.datos);
            renderTraslados(resultado.datos.traslados.recientes);
            renderAlertas(resultado.datos);
            aviso.hidden = true;
            actualizado.textContent = 'Actualizado ' + new Date().toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch (error) {
            aviso.textContent = 'No se pudo cargar el resumen. Revisá la conexión e intentá de nuevo.';
            aviso.classList.add('aviso-error');
            aviso.hidden = false;
        } finally {
            botonActualizar.disabled = false;
        }
    }

    botonActualizar.addEventListener('click', cargarResumen);

    // se refresca solo mientras la pestaña está a la vista (no tiene sentido consultar en segundo plano)
    setInterval(function () {
        if (document.visibilityState === 'visible') cargarResumen();
    }, MINUTOS_REFRESCO * 60 * 1000);

    if (esChofer) {
        document.querySelector('.inicio-bajada').textContent = 'Resumen de los traslados del día.';
    }

    renderCabecera();
    renderAccesos();
    cargarResumen();

});
