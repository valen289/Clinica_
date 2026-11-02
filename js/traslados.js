document.addEventListener('DOMContentLoaded', async function () {

    const sesion = await SIGSM.protegerPagina('traslados');
    if (!sesion) return;

    const formulario = document.querySelector('#form-despacho');
    const mensaje = document.querySelector('#mensaje-form');
    const tabla = document.querySelector('#tabla-traslados');
    const selectRuta = document.querySelector('#id_ruta');
    const resumen = document.querySelector('#resumen-traslados');
    let rutasCache = [];
    let listaTraslados = [];

    // mismo orden que traslados-avanzar.php: el botón dice cuál es el próximo paso, no solo "Avanzar"
    const SIGUIENTE_PASO = {
        'Pendiente': 'Iniciar traslado',
        'Preparado': 'Iniciar traslado',
        'En curso': 'Llegó a destino',
        'Llegado a destino': 'Emprender regreso',
        'Retornando': 'Finalizar',
    };

    function hoyIso() {
        const hoy = new Date();
        return hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
    }

    // "2026-10-24" + "21:36:10" -> "Hoy · 21:36" o "24/10/2026 · 21:36"
    function cuando(fecha, hora) {
        const dia = fecha === hoyIso() ? 'Hoy' : SIGSM.formatearFecha(fecha);
        return hora ? dia + ' · ' + String(hora).slice(0, 5) : dia;
    }

    function llenarSelect(select, opciones, campoId, textoFn) {
        while (select.options.length > 1) select.remove(1); // deja solo el placeholder ("Seleccione...")
        opciones.forEach(function (opcion) {
            const elemento = document.createElement('option');
            elemento.value = opcion[campoId];
            elemento.textContent = textoFn(opcion);
            select.appendChild(elemento);
        });
    }

    function renderFilaTraslado(t) {
        const paso = SIGUIENTE_PASO[t.estado];
        const paciente = t.paciente_nombre ? t.paciente_nombre + ' ' + t.paciente_apellido : '';
        const llegada = t.hora_llegada ? ' · volvió ' + String(t.hora_llegada).slice(0, 5) : '';

        return '<tr>' +
            '<td><strong>' + SIGSM.escapar(t.matricula) + '</strong><small class="celda-detalle">' + SIGSM.escapar(t.conductor_nombre + ' ' + t.conductor_apellido) + '</small></td>' +
            '<td>' + SIGSM.escapar(t.origen + ' → ' + t.destino) + '</td>' +
            '<td>' + (paciente ? SIGSM.escapar(paciente) : '<span class="texto-tenue">—</span>') + '</td>' +
            '<td class="celda-fecha">' + SIGSM.escapar(cuando(t.fecha, t.hora_salida) + llegada) + '</td>' +
            '<td><span class="pill-estado ' + SIGSM.claseEstadoTraslado(t.estado) + '">' + SIGSM.escapar(t.estado) + '</span></td>' +
            '<td>' +
                (paso ? '<button type="button" class="boton boton-secundario boton-chico boton-paso" data-accion="avanzar" data-id="' + t.id_traslado + '">' + paso + '</button>' : '<span class="texto-tenue">Terminado</span>') +
            '</td>' +
        '</tr>';
    }

    function dato(nombreIcono, valor, texto, clase) {
        return '<div class="dato-resumen ' + (clase || '') + '">' +
            '<span class="dato-icono">' + SIGSM.icono(nombreIcono, 20) + '</span>' +
            '<span><strong>' + valor + '</strong><small>' + texto + '</small></span></div>';
    }

    function renderResumen(datos) {
        const contar = function (estados) {
            return listaTraslados.filter(function (t) { return estados.indexOf(t.estado) !== -1; }).length;
        };
        const finalizadosHoy = listaTraslados.filter(function (t) { return t.estado === 'Finalizado' && t.fecha === hoyIso(); }).length;
        const libres = datos.ambulancias_disponibles.length;

        resumen.innerHTML =
            dato('reloj', contar(['Pendiente', 'Preparado']), 'Esperando salida', 'dato-ambar') +
            dato('actividad', contar(['En curso', 'Llegado a destino', 'Retornando']), 'En curso', 'dato-violeta') +
            dato('check', finalizadosHoy, 'Finalizados hoy', 'dato-verde') +
            dato('ambulancia', libres, libres === 1 ? 'Ambulancia libre' : 'Ambulancias libres', libres ? '' : 'dato-rojo');
        resumen.hidden = false;
    }

    async function cargarDatos() {
        const respuesta = await fetch('../php/traslados-listar.php');
        const resultado = await respuesta.json();
        if (!resultado.exito) return;

        const datos = resultado.datos;
        rutasCache = datos.rutas;

        llenarSelect(document.querySelector('#id_ambulancia'), datos.ambulancias_disponibles, 'id_ambulancia', function (a) { return a.matricula; });
        llenarSelect(document.querySelector('#id_conductor'), datos.conductores_disponibles, 'id_ci', function (c) { return c.nombre + ' ' + c.apellido; });
        llenarSelect(document.querySelector('#id_acompanante'), datos.acompanantes, 'id_ci', function (a) { return a.nombre + ' ' + a.apellido; });
        llenarSelect(document.querySelector('#id_elemento'), datos.elementos, 'id_elemento', function (e) { return e.tipo; });
        llenarSelect(selectRuta, datos.rutas, 'id_ruta', function (r) { return r.origen + ' → ' + r.destino; });
        llenarSelect(document.querySelector('#id_paciente'), datos.pacientes, 'id_ci', function (p) { return p.apellido + ', ' + p.nombre + ' (' + SIGSM.formatearCedula(p.id_ci) + ')'; });

        listaTraslados = datos.traslados;
        tabla.innerHTML = listaTraslados.map(renderFilaTraslado).join('');
        document.querySelector('#sin-traslados').hidden = listaTraslados.length > 0;
        renderResumen(datos);
    }

    tabla.addEventListener('click', async function (e) {
        const boton = e.target.closest('[data-accion="avanzar"]');
        if (!boton) return;

        const traslado = listaTraslados.find(function (t) { return String(t.id_traslado) === boton.dataset.id; });
        const datos = new FormData();
        datos.append('id_traslado', boton.dataset.id);

        boton.disabled = true;
        try {
            const respuesta = await fetch('../php/traslados-avanzar.php', { method: 'POST', body: datos });
            const resultado = await respuesta.json();
            if (!resultado.exito) throw new Error();
            await cargarDatos();
            const actualizado = listaTraslados.find(function (t) { return traslado && t.id_traslado === traslado.id_traslado; });
            SIGSM.mostrarToast(actualizado ? actualizado.matricula + ' pasó a "' + actualizado.estado + '".' : 'Traslado actualizado.');
        } catch (error) {
            boton.disabled = false;
            SIGSM.mostrarToast('No se pudo actualizar el traslado. Intentá de nuevo.', 'error');
        }
    });

    formulario.addEventListener('submit', async function (e) {
        e.preventDefault();
        mensaje.textContent = '';

        const datos = new FormData(formulario);

        try {
            const respuesta = await fetch('../php/traslados-despachar.php', {
                method: 'POST',
                body: datos
            });
            const resultado = await respuesta.json();

            if (resultado.exito) {
                const matricula = formulario.id_ambulancia.selectedOptions[0].textContent;
                formulario.reset();
                reiniciarMapa();
                await cargarDatos();
                SIGSM.mostrarToast('Ambulancia ' + matricula + ' despachada.');
            } else {
                mensaje.textContent = resultado.error;
            }
        } catch (error) {
            mensaje.textContent = 'No se pudo conectar con el servidor.';
        }
    });

    // ---- Mapa de la ruta (Leaflet + OpenStreetMap + Geoapify) ----

    const GEOAPIFY_API_KEY = '4572a7318c164b3b873097a1f7b2c618';

    const iconoAmbulancia = L.icon({
        iconUrl: '../assets/img/ambulancia.svg',
        iconSize: [38, 45],
        iconAnchor: [19, 45],
    });

    const iconoDestino = L.icon({
        iconUrl: '../assets/img/destino.svg',
        iconSize: [38, 45],
        iconAnchor: [19, 45],
    });

    const mapa = L.map('mapa-ruta').setView([-34.9011, -56.1645], 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
    }).addTo(mapa);

    // si el contenedor cambia de tamaño (la tabla se llena, se redimensiona la ventana)
    // Leaflet no se entera solo y deja tiles/marcadores mal ubicados
    new ResizeObserver(function () { mapa.invalidateSize(); }).observe(document.querySelector('#mapa-ruta'));

    const estadoMapa = document.querySelector('#mapa-estado');
    let marcadorOrigen = null;
    let marcadorDestino = null;
    let lineaRuta = null;

    function limpiarMapa() {
        if (marcadorOrigen) { mapa.removeLayer(marcadorOrigen); marcadorOrigen = null; }
        if (marcadorDestino) { mapa.removeLayer(marcadorDestino); marcadorDestino = null; }
        if (lineaRuta) { mapa.removeLayer(lineaRuta); lineaRuta = null; }
    }

    async function geocodificar(direccion) {
        const texto = direccion + ', Uruguay';
        const url = 'https://api.geoapify.com/v1/geocode/search?' +
            'text=' + encodeURIComponent(texto) +
            '&filter=countrycode:uy' +
            '&lang=es&limit=1&format=json&apiKey=' + GEOAPIFY_API_KEY;

        const respuesta = await fetch(url);
        const dato = await respuesta.json();
        if (!dato.results || dato.results.length === 0) return null;

        return { lat: dato.results[0].lat, lon: dato.results[0].lon };
    }

    let numeroTrazado = 0;

    async function trazarRuta(origenTexto, destinoTexto) {
        const miTrazado = ++numeroTrazado;
        limpiarMapa();
        estadoMapa.className = 'mapa-estado';
        estadoMapa.textContent = 'Buscando la ruta en el mapa…';

        try {
            const [origen, destino] = await Promise.all([
                geocodificar(origenTexto),
                geocodificar(destinoTexto),
            ]);

            if (miTrazado !== numeroTrazado) return;

            if (!origen || !destino) {
                estadoMapa.className = 'mapa-estado mapa-error';
                estadoMapa.textContent = 'No se pudo ubicar el origen y/o el destino de esta ruta en el mapa.';
                return;
            }

            marcadorOrigen = L.marker([origen.lat, origen.lon], { icon: iconoAmbulancia }).addTo(mapa);
            marcadorDestino = L.marker([destino.lat, destino.lon], { icon: iconoDestino }).addTo(mapa);

            const urlRuta = 'https://api.geoapify.com/v1/routing?' +
                'waypoints=' + origen.lat + ',' + origen.lon + '|' + destino.lat + ',' + destino.lon +
                '&mode=drive' +
                '&units=metric' +
                '&lang=es' +
                '&apiKey=' + GEOAPIFY_API_KEY;

            const respuestaRuta = await fetch(urlRuta);
            const routeo = await respuestaRuta.json();
            if (miTrazado !== numeroTrazado) return;

            if (!routeo.features || routeo.features.length === 0) {
                mapa.fitBounds(L.latLngBounds([marcadorOrigen.getLatLng(), marcadorDestino.getLatLng()]), { padding: [40, 40] });
                estadoMapa.className = 'mapa-estado mapa-error';
                estadoMapa.textContent = 'Se ubicaron el origen y el destino, pero no se pudo calcular el trayecto entre ambos.';
                return;
            }

            const routeoDatos = routeo.features[0].properties;
            // Geoapify devuelve un MultiLineString: una lista de tramos, cada uno con puntos [lon, lat].
            // Si fuera un LineString simple, coordinates ya es la lista de puntos.
            const geometria = routeo.features[0].geometry;
            const tramos = (geometria.type === 'MultiLineString') ? geometria.coordinates : [geometria.coordinates];
            const puntosRuta = [].concat.apply([], tramos).map(function (coordenada) {
                return [coordenada[1], coordenada[0]]; // Geoapify da [lon, lat]; Leaflet necesita [lat, lon]
            });

            lineaRuta = L.polyline(puntosRuta, { color: '#2f6fed', weight: 5 }).addTo(mapa);
            mapa.invalidateSize();
            mapa.fitBounds(lineaRuta.getBounds(), { padding: [40, 40] });

            const distanciaKm = (routeoDatos.distance / 1000).toFixed(1);
            const tiempoMin = Math.round(routeoDatos.time / 60);
            estadoMapa.className = 'mapa-estado';
            estadoMapa.textContent = 'Distancia: ' + distanciaKm + ' km — Tiempo estimado: ' + tiempoMin + ' min';
        } catch (error) {
            estadoMapa.className = 'mapa-estado mapa-error';
            estadoMapa.textContent = 'No se pudo conectar con el servicio de mapas.';
        }
    }

    function reiniciarMapa() {
        numeroTrazado++;
        limpiarMapa();
        mapa.stop(); // corta una animacion de fitBounds en curso, si no pisa el setView
        mapa.setView([-34.9011, -56.1645], 12, { animate: false });
        estadoMapa.className = 'mapa-estado';
        estadoMapa.textContent = 'Seleccioná una ruta en el formulario de despacho para verla en el mapa.';
    }

    selectRuta.addEventListener('change', function () {
        const ruta = rutasCache.find(function (r) { return String(r.id_ruta) === selectRuta.value; });

        if (!ruta) {
            limpiarMapa();
            estadoMapa.className = 'mapa-estado';
            estadoMapa.textContent = 'Seleccioná una ruta en el formulario de despacho para verla en el mapa.';
            return;
        }

        trazarRuta(ruta.origen, ruta.destino);
    });

    cargarDatos();

});
