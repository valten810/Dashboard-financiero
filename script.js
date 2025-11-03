// Estado de la aplicación
let gastos = JSON.parse(localStorage.getItem('gastos')) || [];
let chart;

// Elementos del DOM
const form = document.getElementById('form');
const lista = document.getElementById('lista-gastos');
const filtroCategoria = document.getElementById('filtro-categoria');
const buscadorNombre = document.getElementById('buscador-nombre');
const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros');
const mensajeVacio = document.getElementById('mensaje-vacio');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Establecer fecha actual por defecto
    const fechaInput = document.getElementById('fecha');
    if (fechaInput && !fechaInput.value) {
        fechaInput.value = new Date().toISOString().split('T')[0];
    }
    
    actualizarFiltroCategorias();
    actualizarSugerenciasCategorias();
    mostrarGastos();
    actualizarGrafico();
});

// Event Listeners
form.addEventListener('submit', (e) => {
    e.preventDefault();
    addGasto();
});

if (filtroCategoria) {
    filtroCategoria.addEventListener('change', mostrarGastos);
}

if (buscadorNombre) {
    buscadorNombre.addEventListener('input', mostrarGastos);
}

if (btnLimpiarFiltros) {
    btnLimpiarFiltros.addEventListener('click', limpiarFiltros);
}

// Funciones principales
function addGasto() {
    const nombre = document.getElementById('nombre').value.trim();
    const monto = document.getElementById('monto').value.trim();
    const categoria = document.getElementById('categoria').value.trim();
    const fecha = document.getElementById('fecha').value;

    if (!nombre || !monto || !categoria || !fecha) {
        mostrarNotificacion('Por favor, completa todos los campos', 'error');
        return;
    }

    if (isNaN(monto) || parseFloat(monto) <= 0) {
        mostrarNotificacion('El monto debe ser un número positivo', 'error');
        return;
    }

    const gasto = {
        id: Date.now(),
        nombre: nombre,
        monto: parseFloat(monto),
        categoria: categoria,
        fecha: fecha
    };

    gastos.push(gasto);
    guardarGastos();
    
    actualizarFiltroCategorias();
    actualizarSugerenciasCategorias();
    mostrarGastos();
    actualizarGrafico();
    
    // Limpiar formulario
    form.reset();
    document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('nombre').focus();
    
    mostrarNotificacion('Gasto agregado correctamente', 'success');
}

function mostrarGastos() {
    lista.innerHTML = '';

    // Aplicar filtros
    const filtro = filtroCategoria ? filtroCategoria.value : 'Todas';
    let gastosAMostrar = filtro && filtro !== 'Todas' 
        ? gastos.filter(g => g.categoria === filtro) 
        : [...gastos];

    const termino = buscadorNombre ? buscadorNombre.value.trim().toLowerCase() : '';
    if (termino) {
        gastosAMostrar = gastosAMostrar.filter(g => 
            (g.nombre || '').toLowerCase().includes(termino) ||
            (g.categoria || '').toLowerCase().includes(termino)
        );
    }

    // Ordenar por fecha (más recientes primero)
    gastosAMostrar.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Mostrar mensaje si está vacío
    if (gastosAMostrar.length === 0) {
        mensajeVacio.classList.add('visible');
    } else {
        mensajeVacio.classList.remove('visible');
    }

    // Renderizar lista
    gastosAMostrar.forEach((gasto) => {
        const li = document.createElement('li');
        
        const fechaFormateada = formatearFecha(gasto.fecha);
        
        li.innerHTML = `
            <div class="gasto-info">
                <span class="gasto-nombre">${escaparHTML(gasto.nombre)}</span>
                <span class="gasto-monto">$${gasto.monto.toFixed(2)}</span>
                <span class="gasto-categoria">${escaparHTML(gasto.categoria)}</span>
                <span class="gasto-detalles">${fechaFormateada}</span>
            </div>
            <button class="delete-btn" onclick="borrarGasto(${gasto.id})" aria-label="Eliminar gasto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
        `;
        
        lista.appendChild(li);
    });

    calcularTotal();
    calcularPorCategoria();
}

function borrarGasto(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este gasto?')) {
        return;
    }

    gastos = gastos.filter(g => g.id !== id);
    guardarGastos();
    
    actualizarFiltroCategorias();
    actualizarSugerenciasCategorias();
    mostrarGastos();
    actualizarGrafico();
    
    mostrarNotificacion('Gasto eliminado', 'success');
}

function actualizarFiltroCategorias() {
    if (!filtroCategoria) return;

    const categorias = [...new Set(gastos.map(g => g.categoria))].filter(Boolean).sort();
    const seleccionAnterior = filtroCategoria.value || 'Todas';
    
    filtroCategoria.innerHTML = '<option value="Todas">Todas</option>';
    
    categorias.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        filtroCategoria.appendChild(opt);
    });

    // Restaurar selección
    const opciones = Array.from(filtroCategoria.options);
    if (opciones.some(o => o.value === seleccionAnterior)) {
        filtroCategoria.value = seleccionAnterior;
    } else {
        filtroCategoria.value = 'Todas';
    }
}

function actualizarSugerenciasCategorias() {
    const datalist = document.getElementById('categorias-sugeridas');
    if (!datalist) return;

    const categorias = [...new Set(gastos.map(g => g.categoria))].filter(Boolean).sort();
    datalist.innerHTML = '';
    
    categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        datalist.appendChild(option);
    });
}

function limpiarFiltros() {
    if (filtroCategoria) filtroCategoria.value = 'Todas';
    if (buscadorNombre) buscadorNombre.value = '';
    mostrarGastos();
}

function calcularTotal() {
    const total = gastos.reduce((acc, gasto) => acc + gasto.monto, 0);
    const cantidad = gastos.length;

    const totalElement = document.getElementById('total-gastado');
    const cantidadElement = document.getElementById('cantidad-gastos');
    
    if (totalElement) {
        totalElement.textContent = `$${total.toFixed(2)}`;
    }
    
    if (cantidadElement) {
        cantidadElement.textContent = cantidad;
    }
}

function calcularPorCategoria() {
    const resumen = {};

    gastos.forEach(gasto => {
        resumen[gasto.categoria] = (resumen[gasto.categoria] || 0) + gasto.monto;
    });

    const contenedor = document.getElementById('resumen-categorias');
    if (!contenedor) return;

    contenedor.innerHTML = '';
    
    // Ordenar por monto (mayor a menor)
    const categoriasOrdenadas = Object.entries(resumen)
        .sort(([, a], [, b]) => b - a);
    
    categoriasOrdenadas.forEach(([categoria, monto]) => {
        const p = document.createElement('p');
        p.textContent = `${categoria}: $${monto.toFixed(2)}`;
        contenedor.appendChild(p);
    });
}

function actualizarGrafico() {
    const resumen = {};
    
    gastos.forEach(gasto => {
        resumen[gasto.categoria] = (resumen[gasto.categoria] || 0) + gasto.monto;
    });

    let labels = Object.keys(resumen);
    let data = Object.values(resumen);
    let backgroundColor;
    let borderColor;

    if (data.length === 0) {
        labels = ['Sin datos'];
        data = [1];
        backgroundColor = ['rgba(44, 44, 44, 0.5)'];
        borderColor = ['#2C2C2C'];
    } else {
        backgroundColor = [
            'rgba(10, 61, 98, 0.8)',
            'rgba(22, 163, 74, 0.8)',
            'rgba(79, 70, 229, 0.8)',
            'rgba(255, 68, 68, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(236, 72, 153, 0.8)'
        ];
        borderColor = [
            '#0A3D62',
            '#16A34A',
            '#4F46E5',
            '#FF4444',
            '#F59E0B',
            '#8B5CF6',
            '#EC4899'
        ];
    }

    const ctx = document.getElementById('grafico');
    if (!ctx) return;

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Gasto',
                data: data,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#A1A1A1',
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                title: {
                    display: true,
                    text: data.length === 1 && labels[0] === 'Sin datos' 
                        ? 'Sin gastos para mostrar' 
                        : 'Distribución de Gastos por Categoría',
                    color: '#A1A1A1',
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(44, 44, 44, 0.95)',
                    titleColor: '#E5E5E5',
                    bodyColor: '#A1A1A1',
                    borderColor: '#0A3D62',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 800,
                easing: 'easeInOutQuart'
            }
        }
    });
}

// Funciones auxiliares
function guardarGastos() {
    localStorage.setItem('gastos', JSON.stringify(gastos));
}

function formatearFecha(fecha) {
    const date = new Date(fecha + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const diff = Math.floor((hoy - date) / (1000 * 60 * 60 * 24));
    
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    if (diff < 7) return `Hace ${diff} días`;
    
    const opciones = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('es-ES', opciones);
}

function escaparHTML(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.textContent = mensaje;
    
    // Estilos inline
    Object.assign(notificacion.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '12px',
        backgroundColor: tipo === 'error' ? '#FF4444' : '#16A34A',
        color: 'white',
        fontWeight: '600',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: '1000',
        animation: 'slideIn 0.3s ease',
        maxWidth: '300px'
    });
    
    document.body.appendChild(notificacion);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
        notificacion.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notificacion.remove(), 300);
    }, 3000);
}