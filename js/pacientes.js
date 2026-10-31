document.addEventListener('DOMContentLoaded', async function () {

    const sesion = await SIGSM.protegerPagina('pacientes');
    if (!sesion) return;

    // la misma página tiene dos vistas: el listado (pacientes.html) y la ficha (pacientes.html?ci=12345672)
    const parametros = new URLSearchParams(window.location.search);
    const ciFicha = parametros.get('ci');

    const ICONO_TIPO = {
        'Análisis de laboratorio': 'laboratorio',
        'Imagenología': 'imagen',
        'Informe médico': 'documento',
        'Otro': 'documento',
    };

    function hoyIso() {
        const hoy = new Date();
        return hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
    }

    function mostrarAviso(elemento, texto, esError) {
        elemento.textContent = texto;
        elemento.classList.toggle('aviso-error', !!esError);
        elemento.hidden = !texto;
    }

    function textoEdad(fecha) {
        const edad = SIGSM.calcularEdad(fecha);
        return edad === null ? '—' : SIGSM.textoPlural(edad, 'año', 'años');
    }

    function iniciales(p) {
        return ((p.nombre || '').trim().charAt(0) + (p.apellido || '').trim().charAt(0)).toUpperCase();
    }

    function botonIcono(accion, id, nombreIcono, titulo, extra) {
        return '<button type="button" class="boton-icono ' + (extra || '') + '" title="' + titulo + '" aria-label="' + titulo + '" data-accion="' + accion + '" data-id="' + id + '">' + SIGSM.icono(nombreIcono, 16) + '</button>';
    }

    // ---- modales: abrir, cerrar y avisar antes de descartar cambios (igual que en Documentos) ----
    const modalesAbiertos = [];

    function controlarModal(modal, formulario, mensaje, alCerrar) {
        let instantanea = '';
        let avisado = false;

        function estado() {
            if (!formulario) return '';
            return JSON.stringify(Array.from(new FormData(formulario)).map(function (par) {
                return [par[0], typeof par[1] === 'string' ? par[1] : par[1].name];
            }));
        }

        const control = {
            abrir: function () {
                modal.hidden = false;
                document.body.classList.add('modal-abierto');
                instantanea = estado();
                avisado = false;
                modalesAbiertos.push(control);
            },
            cerrar: function () {
                modal.hidden = true;
                document.body.classList.remove('modal-abierto');
                const posicion = modalesAbiertos.indexOf(control);
                if (posicion !== -1) modalesAbiertos.splice(posicion, 1);
                if (alCerrar) alCerrar();
            },
            // el primer intento de cerrar con cambios avisa; el segundo descarta
            intentarCerrar: function () {
                if (formulario && !avisado && estado() !== instantanea) {
                    avisado = true;
                    mensaje.textContent = 'Hay cambios sin guardar. Volvé a tocar Cancelar (o fuera del cuadro) para descartarlos.';
                    return;
                }
                control.cerrar();
            },
        };

        modal.addEventListener('click', function (e) {
            if (e.target === modal) control.intentarCerrar();
        });
        return control;
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modalesAbiertos.length) {
            modalesAbiertos[modalesAbiertos.length - 1].intentarCerrar();
        }
    });

    // ================= MODAL PACIENTE (alta y edición, se usa en las dos vistas) =================
    const modalPaciente = document.querySelector('#modal-paciente');
    const formPaciente = document.querySelector('#form-paciente');
    const mensajePaciente = document.querySelector('#mensaje-paciente');
    const campoCi = document.querySelector('#ci');
    const ayudaCi = document.querySelector('#ayuda-ci');
    const botonGuardarPaciente = document.querySelector('#guardar-paciente');
    const controlPaciente = controlarModal(modalPaciente, formPaciente, mensajePaciente);
    const AYUDA_CI = 'Con o sin puntos y guion.';

    document.querySelector('#fecha_nacimiento').max = hoyIso();

    // avisa apenas se sale del campo, con el dígito que correspondería
    function revisarCedula() {
        const digitos = campoCi.value.replace(/\D/g, '');
        let error = '';
        if (campoCi.value.trim() !== '' && !campoCi.readOnly) {
            if (digitos.length < 7 || digitos.length > 8) {
                error = 'La cédula tiene que tener 7 u 8 números (con el dígito verificador).';
            } else if (!SIGSM.cedulaValida(digitos)) {
                const cuerpo = digitos.slice(0, -1);
                error = 'El dígito verificador no coincide: para ' + SIGSM.formatearCedula(cuerpo + '0').slice(0, -2) + ' debería ser ' + SIGSM.digitoVerificador(cuerpo) + '.';
            }
        }
        ayudaCi.textContent = error || AYUDA_CI;
        ayudaCi.classList.toggle('ayuda-error', !!error);
        return !error;
    }

    campoCi.addEventListener('blur', function () {
        if (revisarCedula() && SIGSM.cedulaValida(campoCi.value)) {
            campoCi.value = SIGSM.formatearCedula(campoCi.value);
        }
    });
    campoCi.addEventListener('input', function () {
        if (ayudaCi.classList.contains('ayuda-error')) revisarCedula();
    });

    function abrirAltaPaciente() {
        formPaciente.reset();
        document.querySelector('#ci_editar').value = '';
        campoCi.readOnly = false;
        document.querySelector('#titulo-modal-paciente').textContent = 'Nuevo paciente';
        botonGuardarPaciente.textContent = 'Registrar paciente';
        mensajePaciente.textContent = '';
        revisarCedula();
        controlPaciente.abrir();
        campoCi.focus();
    }

    function abrirEdicionPaciente(p) {
        formPaciente.reset();
        document.querySelector('#ci_editar').value = p.id_ci;
        campoCi.value = SIGSM.formatearCedula(p.id_ci);
        campoCi.readOnly = true;
        formPaciente.nombre.value = p.nombre;
        formPaciente.apellido.value = p.apellido;
        formPaciente.fecha_nacimiento.value = p.fecha_nacimiento || '';
        formPaciente.telefono.value = p.telefono || '';
        formPaciente.email.value = p.email || '';
        formPaciente.direccion.value = p.direccion || '';
        document.querySelector('#titulo-modal-paciente').textContent = 'Editar paciente';
        botonGuardarPaciente.textContent = 'Guardar cambios';
        mensajePaciente.textContent = '';
        revisarCedula();
        controlPaciente.abrir();
        formPaciente.nombre.focus();
    }

    document.querySelector('#cancelar-paciente').addEventListener('click', controlPaciente.intentarCerrar);

    formPaciente.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensajePaciente.textContent = '';
        if (!revisarCedula()) {
            campoCi.focus();
            return;
        }

        const datos = new FormData(formPaciente);
        const editando = datos.get('ci_editar') !== '';
        const textoBoton = botonGuardarPaciente.textContent;
        botonGuardarPaciente.disabled = true;
        botonGuardarPaciente.textContent = 'Guardando...';

        try {
            const respuesta = await fetch('../php/pacientes-guardar.php', { method: 'POST', body: datos });
            const resultado = await respuesta.json();

            if (!resultado.exito) {
                mensajePaciente.textContent = resultado.error;
                return;
            }
            if (editando) {
                controlPaciente.cerrar();
                await cargarFicha();
                SIGSM.mostrarToast('Datos del paciente actualizados.');
            } else {
                // recién registrado: se va directo a su ficha para cargarle estudios
                window.location.href = 'pacientes.html?ci=' + resultado.ci + '&creado=1';
            }
        } catch (error) {
            mensajePaciente.textContent = 'No se pudo conectar con el servidor.';
        } finally {
            botonGuardarPaciente.disabled = false;
            botonGuardarPaciente.textContent = textoBoton;
        }
    });

    // ================= VISTA LISTADO =================
    async function iniciarListado() {
        const vista = document.querySelector('#vista-listado');
        const resumen = document.querySelector('#resumen-pacientes');
        const barraFiltros = document.querySelector('#barra-filtros');
        const buscador = document.querySelector('#buscar-paciente');
        const filtroEstudios = document.querySelector('#filtro-estudios');
        const limpiarFiltros = document.querySelector('#limpiar-filtros');
        const contador = document.querySelector('#contador-resultados');
        const aviso = document.querySelector('#aviso-lista');
        const esqueleto = document.querySelector('#esqueleto-pacientes');
        const tarjeta = document.querySelector('#tarjeta-pacientes');
        const cuerpo = document.querySelector('#lista-pacientes');
        let pacientes = [];

        vista.hidden = false;

        function dato(nombreIcono, valor, texto, clase, filtro) {
            const etiqueta = filtro ? 'button' : 'div';
            return '<' + etiqueta + (filtro ? ' type="button" data-filtro="' + filtro + '"' : '') + ' class="dato-resumen ' + clase + '">' +
                '<span class="dato-icono">' + SIGSM.icono(nombreIcono, 20) + '</span>' +
                '<span><strong>' + valor + '</strong><small>' + texto + '</small></span></' + etiqueta + '>';
        }

        function renderResumen() {
            const mesActual = hoyIso().slice(0, 7);
            const conPendientes = pacientes.filter(function (p) { return Number(p.estudios_pendientes) > 0; }).length;
            const conDisponibles = pacientes.filter(function (p) { return Number(p.estudios_disponibles) > 0; }).length;
            const altasMes = pacientes.filter(function (p) { return (p.fecha_alta || '').slice(0, 7) === mesActual; }).length;

            resumen.innerHTML =
                dato('usuario', pacientes.length, 'Pacientes registrados', '', '') +
                dato('reloj', conPendientes, 'Con estudios pendientes', 'dato-ambar', 'pendientes') +
                dato('documento', conDisponibles, 'Con resultados disponibles', 'dato-verde', 'disponibles') +
                dato('calendario', altasMes, 'Altas este mes', 'dato-violeta', '');
            resumen.hidden = pacientes.length === 0;
        }

        function renderFila(p) {
            const contacto = [p.telefono, p.email].filter(Boolean).join(' · ');
            const estudios = Number(p.estudios);
            const pendientes = Number(p.estudios_pendientes);
            const celdaEstudios = estudios
                ? estudios + (pendientes ? ' <span class="chip-pendiente">' + SIGSM.textoPlural(pendientes, 'pendiente', 'pendientes') + '</span>' : '')
                : '<span class="texto-tenue">—</span>';

            return '<tr class="fila-enlace" data-ci="' + p.id_ci + '">' +
                '<td><div class="celda-usuario">' +
                    '<span class="usuario-avatar">' + SIGSM.escapar(iniciales(p)) + '</span>' +
                    '<span><a href="pacientes.html?ci=' + p.id_ci + '"><strong>' + SIGSM.escapar(p.nombre + ' ' + p.apellido) + '</strong></a>' +
                    (contacto ? '<small>' + SIGSM.escapar(contacto) + '</small>' : '') + '</span>' +
                '</div></td>' +
                '<td><span class="texto-ci">' + SIGSM.formatearCedula(p.id_ci) + '</span></td>' +
                '<td>' + textoEdad(p.fecha_nacimiento) + '</td>' +
                '<td>' + celdaEstudios + '</td>' +
                '<td>' + (p.fecha_alta ? SIGSM.formatearFecha(p.fecha_alta) : '—') + '</td>' +
            '</tr>';
        }

        function filtrar() {
            const termino = SIGSM.normalizar(buscador.value.trim());
            const filtro = filtroEstudios.value;
            return pacientes.filter(function (p) {
                if (filtro === 'pendientes' && !Number(p.estudios_pendientes)) return false;
                if (filtro === 'disponibles' && !Number(p.estudios_disponibles)) return false;
                if (filtro === 'sin-estudios' && Number(p.estudios)) return false;
                // la cédula se busca con y sin puntos
                const texto = [p.nombre, p.apellido, p.telefono, p.email, p.id_ci, SIGSM.formatearCedula(p.id_ci)].join(' ');
                return !termino || SIGSM.normalizar(texto).indexOf(termino) !== -1;
            });
        }

        function pintar() {
            const visibles = filtrar();
            cuerpo.innerHTML = visibles.map(renderFila).join('');
            tarjeta.hidden = visibles.length === 0;
            barraFiltros.hidden = pacientes.length === 0;
            limpiarFiltros.hidden = buscador.value.trim() === '' && filtroEstudios.value === '';
            contador.textContent = pacientes.length ? 'Mostrando ' + visibles.length + ' de ' + pacientes.length : '';
            resumen.querySelectorAll('[data-filtro]').forEach(function (d) {
                d.classList.toggle('dato-activo', d.dataset.filtro === filtroEstudios.value);
            });

            if (!pacientes.length) {
                mostrarAviso(aviso, 'Todavía no hay pacientes registrados. Usá "+ Nuevo paciente" para dar de alta el primero.', false);
            } else {
                mostrarAviso(aviso, visibles.length ? '' : 'Ningún paciente coincide con la búsqueda.', false);
            }
        }

        buscador.addEventListener('input', pintar);
        filtroEstudios.addEventListener('change', pintar);
        limpiarFiltros.addEventListener('click', function () {
            buscador.value = '';
            filtroEstudios.value = '';
            pintar();
            buscador.focus();
        });
        resumen.addEventListener('click', function (e) {
            const d = e.target.closest('[data-filtro]');
            if (!d) return;
            filtroEstudios.value = filtroEstudios.value === d.dataset.filtro ? '' : d.dataset.filtro;
            pintar();
        });

        // toda la fila lleva a la ficha (el nombre además es un enlace, para abrirlo en otra pestaña)
        cuerpo.addEventListener('click', function (e) {
            const fila = e.target.closest('[data-ci]');
            if (fila && !e.target.closest('a')) window.location.href = 'pacientes.html?ci=' + fila.dataset.ci;
        });

        document.querySelector('#boton-nuevo-paciente').addEventListener('click', abrirAltaPaciente);

        document.addEventListener('keydown', function (e) {
            const escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
            if (e.key === '/' && !escribiendo && !modalesAbiertos.length) {
                e.preventDefault();
                buscador.focus();
            }
        });

        // enlaces que llegan desde Inicio: ?nuevo=1 abre el alta y ?filtro=pendientes filtra
        const filtroUrl = parametros.get('filtro');
        if (filtroUrl && Array.from(filtroEstudios.options).some(function (o) { return o.value === filtroUrl; })) {
            filtroEstudios.value = filtroUrl;
        }
        if (parametros.get('nuevo') === '1') abrirAltaPaciente();
        if (parametros.toString()) history.replaceState(null, '', window.location.pathname);

        try {
            const respuesta = await fetch('../php/pacientes-listar.php');
            const resultado = await respuesta.json();
            if (!resultado.exito) throw new Error(resultado.error || 'Error al listar');
            pacientes = resultado.datos;
            renderResumen();
            pintar();
        } catch (error) {
            mostrarAviso(aviso, 'No se pudieron cargar los pacientes. Revisá la conexión e intentá de nuevo.', true);
        } finally {
            esqueleto.hidden = true;
        }
    }

    // ================= VISTA FICHA =================
    const listaEstudios = document.querySelector('#lista-estudios');
    const listaDocumentos = document.querySelector('#lista-documentos');
    const listaTraslados = document.querySelector('#lista-traslados-paciente');
    const botonAsignar = document.querySelector('#boton-asignar-documento');
    let paciente = null;

    function vacio(texto) {
        return '<li class="vacio-inicio"><p>' + texto + '</p></li>';
    }

    function renderCabeceraFicha() {
        const edad = SIGSM.calcularEdad(paciente.fecha_nacimiento);
        const datos = [
            ['cedula', SIGSM.formatearCedula(paciente.id_ci)],
            ['calendario', edad === null ? '' : SIGSM.textoPlural(edad, 'año', 'años') + ' · ' + SIGSM.formatearFecha(paciente.fecha_nacimiento)],
            ['telefono', paciente.telefono],
            ['correo', paciente.email],
            ['ubicacion', paciente.direccion],
        ].filter(function (d) { return d[1]; });

        document.title = 'SIGSM - ' + paciente.nombre + ' ' + paciente.apellido;
        document.querySelector('#ficha-avatar').textContent = iniciales(paciente);
        document.querySelector('#ficha-nombre').textContent = paciente.nombre + ' ' + paciente.apellido;
        document.querySelector('#ficha-datos').innerHTML = datos.map(function (d) {
            return '<li>' + SIGSM.icono(d[0], 15) + '<span>' + SIGSM.escapar(d[1]) + '</span></li>';
        }).join('') + (paciente.fecha_alta ? '<li class="ficha-alta">Alta ' + SIGSM.formatearFecha(paciente.fecha_alta) + '</li>' : '');
    }

    function renderEstudios() {
        if (!paciente.estudios.length) {
            listaEstudios.innerHTML = vacio('Todavía no tiene estudios cargados.');
            return;
        }
        listaEstudios.innerHTML = paciente.estudios.map(function (e) {
            const disponible = e.estado === 'Disponible';
            const pdf = Number(e.tiene_pdf)
                ? '<a class="boton-icono" href="../php/estudio-archivo.php?id=' + e.id_estudio + '" target="_blank" rel="noopener" title="Ver PDF" aria-label="Ver PDF">' + SIGSM.icono('documento', 16) + '</a>'
                : '';

            return '<li class="item-lista">' +
                '<span class="item-lista-icono">' + SIGSM.icono(ICONO_TIPO[e.tipo] || 'documento', 18) + '</span>' +
                '<div class="item-lista-datos">' +
                    '<strong>' + SIGSM.escapar(e.titulo) + '</strong>' +
                    '<small>' + SIGSM.escapar(e.tipo + ' · ' + SIGSM.formatearFecha(e.fecha_estudio) + ' · cargado por ' + e.cargado_por) + '</small>' +
                    (e.observaciones ? '<p class="item-lista-nota">' + SIGSM.escapar(e.observaciones) + '</p>' : '') +
                '</div>' +
                '<div class="item-lista-estado">' +
                    '<span class="pill-estado ' + (disponible ? 'pill-verde' : 'pill-naranja') + '">' + SIGSM.escapar(e.estado) + '</span>' +
                    '<span class="item-lista-botones">' +
                        pdf +
                        botonIcono('editar-estudio', e.id_estudio, 'lapiz', 'Editar estudio') +
                        botonIcono('borrar-estudio', e.id_estudio, 'basura', 'Eliminar estudio', 'boton-icono-peligro') +
                    '</span>' +
                '</div>' +
            '</li>';
        }).join('');
    }

    function renderDocumentos() {
        botonAsignar.disabled = paciente.documentos_disponibles.length === 0;
        botonAsignar.title = botonAsignar.disabled ? 'No quedan documentos para asignar' : '';

        if (!paciente.documentos.length) {
            listaDocumentos.innerHTML = vacio('No tiene documentos asignados.');
            return;
        }
        listaDocumentos.innerHTML = paciente.documentos.map(function (f) {
            return '<li class="item-lista">' +
                '<span class="item-lista-icono">' + SIGSM.icono('libro', 18) + '</span>' +
                '<div class="item-lista-datos">' +
                    '<strong>' + SIGSM.escapar(f.titulo) + '</strong>' +
                    '<small>' + SIGSM.escapar((f.departamento || 'Sin departamento') + ' · asignado ' + SIGSM.formatearFecha(f.fecha_asignacion)) + '</small>' +
                '</div>' +
                '<span class="item-lista-botones">' +
                    '<a class="boton-icono" href="' + SIGSM.urlDocumentoPublico(f.token) + '" target="_blank" rel="noopener" title="Ver como lo ve el paciente" aria-label="Ver como lo ve el paciente">' + SIGSM.icono('enlace', 16) + '</a>' +
                    botonIcono('quitar-documento', f.id_documento, 'basura', 'Quitar documento', 'boton-icono-peligro') +
                '</span>' +
            '</li>';
        }).join('');
    }

    function renderTrasladosPaciente() {
        if (!paciente.traslados.length) {
            listaTraslados.innerHTML = vacio('No tiene traslados registrados.');
            return;
        }
        listaTraslados.innerHTML = paciente.traslados.map(function (t) {
            return '<li class="item-lista">' +
                '<span class="item-lista-icono">' + SIGSM.icono('ambulancia', 18) + '</span>' +
                '<div class="item-lista-datos">' +
                    '<strong>' + SIGSM.escapar(t.origen + ' → ' + t.destino) + '</strong>' +
                    '<small>' + SIGSM.escapar(t.matricula + ' · ' + SIGSM.formatearFecha(t.fecha) + (t.hora_salida ? ' ' + t.hora_salida.slice(0, 5) : '')) + '</small>' +
                '</div>' +
                '<span class="pill-estado ' + SIGSM.claseEstadoTraslado(t.estado) + '">' + SIGSM.escapar(t.estado) + '</span>' +
            '</li>';
        }).join('');
    }

    // "2026-11-05 20:40:00" -> "05/11/2026 20:40" (o solo la fecha)
    function fechaHora(valor, conHora) {
        if (!valor) return '';
        const fecha = SIGSM.formatearFecha(valor.slice(0, 10));
        return conHora ? fecha + ' ' + valor.slice(11, 16) : fecha;
    }

    // ---- acceso al portal del paciente ----
    const estadoPortal = document.querySelector('#estado-portal');
    const textoPortal = document.querySelector('#texto-portal');
    const botonGenerarCodigo = document.querySelector('#boton-generar-codigo');

    function renderPortal() {
        const activa = Number(paciente.cuenta_activa) === 1;
        const codigoVigente = Number(paciente.codigo_vigente) === 1;
        let estado, clase, texto, boton;

        if (activa) {
            estado = 'Activa';
            clase = 'pill-verde';
            texto = 'Activó su cuenta el ' + fechaHora(paciente.cuenta_activada) +
                (paciente.ultimo_ingreso ? '. Último ingreso: ' + fechaHora(paciente.ultimo_ingreso, true) + '.' : '.') +
                (codigoVigente ? ' Tiene un código para elegir otra contraseña que vence el ' + fechaHora(paciente.codigo_vence) + '.' : ' Si olvidó la contraseña, generale un código para que elija otra.');
            boton = 'Restablecer contraseña';
        } else if (codigoVigente) {
            estado = 'Código entregado';
            clase = 'pill-naranja';
            texto = 'Todavía no activó la cuenta. El código vence el ' + fechaHora(paciente.codigo_vence) + '; si lo perdió, generá uno nuevo (el anterior deja de servir).';
            boton = 'Generar código nuevo';
        } else {
            estado = 'Sin activar';
            clase = 'pill-gris';
            texto = 'Todavía no tiene acceso al portal. Generá un código de activación y entregáselo para que vea sus estudios y documentos desde el celular.' +
                (paciente.codigo_vence ? ' El último código venció el ' + fechaHora(paciente.codigo_vence) + '.' : '');
            boton = 'Generar código de activación';
        }

        estadoPortal.textContent = estado;
        estadoPortal.className = 'pill-estado ' + clase;
        textoPortal.textContent = texto;
        botonGenerarCodigo.textContent = boton;
        botonGenerarCodigo.className = 'boton boton-chico ' + (activa ? 'boton-secundario' : 'boton-primario');
    }

    // al cerrar (botón, Escape o clic afuera) el código se borra de la página:
    // no queda a la vista de quien use la computadora después
    const modalCodigo = document.querySelector('#modal-codigo');
    const controlCodigo = controlarModal(modalCodigo, null, null, function () {
        document.querySelector('#hoja-codigo-valor').textContent = '';
        document.querySelector('#hoja-qr').innerHTML = '';
    });

    function mostrarHojaCodigo(datos) {
        // la URL del QR tiene que ser absoluta para poder abrirse desde el celular del paciente
        const urlActivar = new URL('portal-activar.html', window.location.href).href;

        document.querySelector('#hoja-paciente').textContent = datos.nombre + ' ' + datos.apellido + ' · CI ' + SIGSM.formatearCedula(datos.id_ci);
        document.querySelector('#hoja-codigo-valor').textContent = datos.codigo;
        document.querySelector('#hoja-vence').textContent = 'Vence el ' + fechaHora(datos.vence, true);
        document.querySelector('#hoja-url').textContent = urlActivar;

        const contenedorQr = document.querySelector('#hoja-qr');
        contenedorQr.innerHTML = '';
        if (window.QRCode) {
            new QRCode(contenedorQr, { text: urlActivar, width: 120, height: 120, correctLevel: QRCode.CorrectLevel.M });
        }

        controlCodigo.abrir();
        document.querySelector('#imprimir-codigo').focus();
    }

    botonGenerarCodigo.addEventListener('click', async function () {
        const datos = new FormData();
        datos.append('ci', paciente.id_ci);
        botonGenerarCodigo.disabled = true;
        try {
            const respuesta = await fetch('../php/paciente-codigo.php', { method: 'POST', body: datos });
            const resultado = await respuesta.json();
            if (!resultado.exito) throw new Error(resultado.error);
            mostrarHojaCodigo(resultado.datos);
            await cargarFicha();
        } catch (error) {
            SIGSM.mostrarToast('No se pudo generar el código. Intentá de nuevo.', 'error');
        } finally {
            botonGenerarCodigo.disabled = false;
        }
    });

    document.querySelector('#cerrar-codigo').addEventListener('click', controlCodigo.cerrar);

    // se imprime solo la hoja (ver @media print en paginas.css)
    document.querySelector('#imprimir-codigo').addEventListener('click', function () {
        document.body.classList.add('imprimir-hoja');
        window.print();
    });
    window.addEventListener('afterprint', function () {
        document.body.classList.remove('imprimir-hoja');
    });

    async function cargarFicha() {
        const aviso = document.querySelector('#aviso-ficha');
        try {
            const respuesta = await fetch('../php/paciente-ver.php?ci=' + encodeURIComponent(ciFicha));
            const resultado = await respuesta.json();
            if (!resultado.exito) throw new Error(resultado.error || 'Error al cargar la ficha');

            paciente = resultado.datos;
            if (!paciente) {
                mostrarAviso(aviso, 'No encontramos un paciente con esa cédula.', false);
                return;
            }
            renderCabeceraFicha();
            renderEstudios();
            renderDocumentos();
            renderTrasladosPaciente();
            renderPortal();
            document.querySelector('#contenido-ficha').hidden = false;
        } catch (error) {
            mostrarAviso(aviso, 'No se pudo cargar la ficha del paciente. Revisá la conexión e intentá de nuevo.', true);
        } finally {
            document.querySelector('#esqueleto-ficha').hidden = true;
        }
    }

    // ---- modal estudio ----
    const modalEstudio = document.querySelector('#modal-estudio');
    const formEstudio = document.querySelector('#form-estudio');
    const mensajeEstudio = document.querySelector('#mensaje-estudio');
    const botonGuardarEstudio = document.querySelector('#guardar-estudio');
    const controlEstudio = controlarModal(modalEstudio, formEstudio, mensajeEstudio);
    let estudioEditando = null;

    document.querySelector('#fecha_estudio').max = hoyIso();

    function abrirEstudio(estudio) {
        estudioEditando = estudio || null;
        formEstudio.reset();
        mensajeEstudio.textContent = '';
        document.querySelector('#id_estudio_editar').value = estudio ? estudio.id_estudio : '';
        formEstudio.tipo.value = estudio ? estudio.tipo : '';
        formEstudio.fecha_estudio.value = estudio ? estudio.fecha_estudio : hoyIso();
        formEstudio.titulo.value = estudio ? estudio.titulo : '';
        formEstudio.estado.value = estudio ? estudio.estado : 'Pendiente';
        formEstudio.observaciones.value = estudio ? (estudio.observaciones || '') : '';
        document.querySelector('#titulo-modal-estudio').textContent = estudio ? 'Editar estudio' : 'Cargar estudio';
        document.querySelector('#label-archivo-estudio').textContent = estudio && Number(estudio.tiene_pdf)
            ? 'PDF del resultado (dejar vacío para mantener el actual):'
            : 'PDF del resultado:';
        controlEstudio.abrir();
        formEstudio.tipo.focus();
    }

    document.querySelector('#boton-nuevo-estudio').addEventListener('click', function () { abrirEstudio(null); });
    document.querySelector('#cancelar-estudio').addEventListener('click', controlEstudio.intentarCerrar);

    formEstudio.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensajeEstudio.textContent = '';

        const hayPdf = formEstudio.archivo.files.length > 0 || (estudioEditando && Number(estudioEditando.tiene_pdf));
        if (formEstudio.estado.value === 'Disponible' && !hayPdf) {
            mensajeEstudio.textContent = 'Para marcarlo como disponible adjuntá el PDF del resultado.';
            return;
        }

        const datos = new FormData(formEstudio);
        datos.append('id_paciente', paciente.id_ci);
        botonGuardarEstudio.disabled = true;
        botonGuardarEstudio.textContent = 'Guardando...';

        try {
            const respuesta = await fetch('../php/estudios-guardar.php', { method: 'POST', body: datos });
            const resultado = await respuesta.json();
            if (!resultado.exito) {
                mensajeEstudio.textContent = resultado.error;
                return;
            }
            controlEstudio.cerrar();
            await cargarFicha();
            SIGSM.mostrarToast(estudioEditando ? 'Estudio actualizado.' : 'Estudio cargado.');
        } catch (error) {
            mensajeEstudio.textContent = 'No se pudo conectar con el servidor.';
        } finally {
            botonGuardarEstudio.disabled = false;
            botonGuardarEstudio.textContent = 'Guardar estudio';
        }
    });

    // ---- modal borrar estudio ----
    const modalBorrar = document.querySelector('#modal-borrar-estudio');
    const botonConfirmarBorrado = document.querySelector('#borrar-estudio-confirmar');
    const errorBorrado = document.querySelector('#borrar-estudio-error');
    const controlBorrar = controlarModal(modalBorrar, null, null);
    let idEstudioBorrar = null;

    function abrirBorrado(estudio) {
        idEstudioBorrar = estudio.id_estudio;
        document.querySelector('#borrar-estudio-titulo').textContent = estudio.titulo;
        errorBorrado.textContent = '';
        controlBorrar.abrir();
        document.querySelector('#borrar-estudio-cancelar').focus();
    }

    document.querySelector('#borrar-estudio-cancelar').addEventListener('click', controlBorrar.cerrar);

    botonConfirmarBorrado.addEventListener('click', async function () {
        const datos = new FormData();
        datos.append('id_estudio', idEstudioBorrar);
        botonConfirmarBorrado.disabled = true;
        try {
            const respuesta = await fetch('../php/estudios-eliminar.php', { method: 'POST', body: datos });
            const resultado = await respuesta.json();
            if (!resultado.exito) throw new Error(resultado.error);
            controlBorrar.cerrar();
            await cargarFicha();
            SIGSM.mostrarToast('Estudio eliminado.');
        } catch (error) {
            errorBorrado.textContent = 'No se pudo eliminar el estudio. Intentá de nuevo.';
        } finally {
            botonConfirmarBorrado.disabled = false;
        }
    });

    // ---- modal asignar documento ----
    const modalDocumento = document.querySelector('#modal-documento');
    const formDocumento = document.querySelector('#form-documento');
    const mensajeDocumento = document.querySelector('#mensaje-documento');
    const controlDocumento = controlarModal(modalDocumento, null, null);

    botonAsignar.addEventListener('click', function () {
        const select = formDocumento.id_documento;
        select.innerHTML = '<option value="">Seleccione un documento</option>';
        paciente.documentos_disponibles.forEach(function (f) {
            select.appendChild(new Option(f.titulo + (f.departamento ? ' — ' + f.departamento : ''), f.id_documento));
        });
        mensajeDocumento.textContent = '';
        controlDocumento.abrir();
        select.focus();
    });

    document.querySelector('#cancelar-documento').addEventListener('click', controlDocumento.cerrar);

    async function cambiarDocumento(accion, idDocumento) {
        const datos = new FormData();
        datos.append('accion', accion);
        datos.append('id_paciente', paciente.id_ci);
        datos.append('id_documento', idDocumento);
        const respuesta = await fetch('../php/paciente-documentos.php', { method: 'POST', body: datos });
        const resultado = await respuesta.json();
        if (!resultado.exito) throw new Error(resultado.error);
    }

    formDocumento.addEventListener('submit', async function (e) {
        e.preventDefault();
        try {
            await cambiarDocumento('asignar', formDocumento.id_documento.value);
            controlDocumento.cerrar();
            await cargarFicha();
            SIGSM.mostrarToast('Documento asignado.');
        } catch (error) {
            mensajeDocumento.textContent = 'No se pudo asignar el documento. Intentá de nuevo.';
        }
    });

    // ---- acciones de las listas de la ficha ----
    document.querySelector('#contenido-ficha').addEventListener('click', async function (e) {
        const boton = e.target.closest('button[data-accion]');
        if (!boton) return;
        const id = boton.dataset.id;
        const estudio = paciente.estudios.find(function (x) { return String(x.id_estudio) === id; });

        if (boton.dataset.accion === 'editar-estudio' && estudio) abrirEstudio(estudio);
        if (boton.dataset.accion === 'borrar-estudio' && estudio) abrirBorrado(estudio);

        // quitar un documento se puede deshacer volviéndolo a asignar: no pide confirmación
        if (boton.dataset.accion === 'quitar-documento') {
            boton.disabled = true;
            try {
                await cambiarDocumento('quitar', id);
                await cargarFicha();
                SIGSM.mostrarToast('Documento quitado.');
            } catch (error) {
                boton.disabled = false;
                SIGSM.mostrarToast('No se pudo quitar el documento.', 'error');
            }
        }
    });

    document.querySelector('#boton-editar-paciente').addEventListener('click', function () {
        if (paciente) abrirEdicionPaciente(paciente);
    });

    async function iniciarFicha() {
        document.querySelector('#vista-ficha').hidden = false;
        document.querySelector('#enlace-volver').innerHTML = SIGSM.icono('volver', 16) + ' Pacientes';

        const recienCreado = parametros.get('creado') === '1';
        if (recienCreado) history.replaceState(null, '', 'pacientes.html?ci=' + encodeURIComponent(ciFicha));

        await cargarFicha();
        if (recienCreado && paciente) SIGSM.mostrarToast('Paciente registrado. Ya podés cargarle estudios.');
    }

    if (ciFicha) {
        iniciarFicha();
    } else {
        iniciarListado();
    }

});
