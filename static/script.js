// static/script.js

// --- Variables Globales ---
let currentData = {
    'DatosGenerales': {
        'IEI': '', 'DREL': '', 'UGEL': '',
        'Directora': '', 'Maestra': '', 'CoMaestra': '',
        'Edad': '', 'Aula': '', 'Turno': ''
    },
    'alumnos': []
};
let editingIndex = null; // Para saber si estamos editando o añadiendo
let selectedRowIndex = null; // Para rastrear la fila seleccionada
let isDuplicating = false; // Bandera para saber si venimos de duplicar

// --- Elementos del DOM ---
const datosForm = document.getElementById('datos-generales-form');
const saveButton = document.getElementById('save-button');
const saveAsButton = document.getElementById('save-as-button');
const selectFileButton = document.getElementById('select-file-button');
const fileInput = document.getElementById('file-input'); // Input file oculto

const alumnosTableBody = document.querySelector('#alumnos-table tbody');
const addAlumnoButton = document.getElementById('add-alumno-button');
const editAlumnoButton = document.getElementById('edit-alumno-button');
const deleteAlumnoButton = document.getElementById('delete-alumno-button');
const duplicateAlumnoButton = document.getElementById('duplicate-alumno-button');

const modal = document.getElementById('student-modal');
const modalTitle = document.getElementById('modal-title');
const studentForm = document.getElementById('student-form');
const closeModalButton = document.querySelector('.close');
const cancelStudentButton = document.getElementById('cancel-student-button');
const saveStudentButton = document.getElementById('save-student-button');

const studentIndexInput = document.getElementById('student-index');
const studentNombreInput = document.getElementById('student-nombre');
const studentFechaNacInput = document.getElementById('student-fechaNacimiento');
const studentNecesidadesInput = document.getElementById('student-necesidadesEspeciales');
const studentNotasInput = document.getElementById('student-notas');

// --- Funciones de Carga y Actualización de UI ---

// Carga los datos iniciales al cargar la página
async function loadInitialData() {
    try {
        const response = await fetch('/api/datos');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        currentData = data;
        populateGeneralData();
        loadStudents();
        // Establecer restricciones de fecha después de cargar los datos generales
        setFechaNacimientoConstraints();
    } catch (error) {
        console.error('Error al cargar los datos iniciales:', error);
        alert('Error al cargar los datos. Por favor, recarga la página.');
    }
}

// Llena los campos del formulario de Datos Generales con los datos actuales
function populateGeneralData() {
    const datosGenerales = currentData['DatosGenerales'];
    for (const field in datosGenerales) {
        if (datosGenerales.hasOwnProperty(field)) {
            const input = document.getElementById(field.toLowerCase());
            if (input) {
                 // Para el campo 'Edad', simplemente mostramos el valor como texto
                if (field === 'Edad') {
                    // Si el valor es un número, lo convertimos a texto con "años"
                    // Esto es para compatibilidad si en algún momento se guardó como número
                    let edadValue = datosGenerales[field];
                    if (typeof edadValue === 'number') {
                        edadValue = edadValue + " años";
                    }
                    input.value = edadValue;
                } else {
                     input.value = datosGenerales[field];
                }
            }
        }
    }
}

// Actualiza el objeto currentData con los valores del formulario de Datos Generales
function updateGeneralDataFromForm() {
    const formData = new FormData(datosForm);
    for (const [key, value] of formData.entries()) {
        if (currentData['DatosGenerales'].hasOwnProperty(key.toUpperCase())) {
            // Para el campo 'Edad', guardamos el valor tal como se ingresa (texto)
            if (key.toUpperCase() === 'EDAD') {
                currentData['DatosGenerales']['Edad'] = value; // value ya es un string
            } else {
                currentData['DatosGenerales'][key.toUpperCase()] = value;
            }
        }
    }
}

// Carga y muestra la lista de alumnos en la tabla
function loadStudents() {
    alumnosTableBody.innerHTML = ''; // Limpia la tabla
    selectedRowIndex = null; // Resetear selección
    updateActionButtons(); // Deshabilitar botones de acción

    currentData['alumnos'].forEach((student, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-index', index);

        const nombreCell = document.createElement('td');
        nombreCell.textContent = student.nombre;
        row.appendChild(nombreCell);

        const fechaNacCell = document.createElement('td');
        fechaNacCell.textContent = student.fechaNacimiento;
        row.appendChild(fechaNacCell);

        const necesidadesCell = document.createElement('td');
        necesidadesCell.textContent = student.necesidadesEspeciales;
        row.appendChild(necesidadesCell);

        const notasCell = document.createElement('td');
        notasCell.textContent = student.notas;
        row.appendChild(notasCell);

        // Evento para seleccionar fila
        row.addEventListener('click', () => selectRow(index, row));

        alumnosTableBody.appendChild(row);
    });
}

// Función para seleccionar una fila
function selectRow(index, rowElement) {
    // Deseleccionar fila anterior
    if (selectedRowIndex !== null) {
        const previousRow = document.querySelector(`#alumnos-table tbody tr[data-index="${selectedRowIndex}"]`);
        if (previousRow) {
            previousRow.classList.remove('selected');
        }
    }

    // Seleccionar nueva fila
    selectedRowIndex = index;
    rowElement.classList.add('selected');
    updateActionButtons(); // Habilitar botones de acción
}

// Actualiza el estado de los botones de acción según si hay una fila seleccionada
function updateActionButtons() {
    const isDisabled = selectedRowIndex === null;
    editAlumnoButton.disabled = isDisabled;
    deleteAlumnoButton.disabled = isDisabled;
    duplicateAlumnoButton.disabled = isDisabled;
}

// --- Funciones de Interacción con la API ---

// Guarda todos los datos (DatosGenerales + Alumnos)
async function saveAllData() {
    updateGeneralDataFromForm();
    try {
        const response = await fetch('/api/datos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log(result.message);
        alert('Datos guardados correctamente');
    } catch (error) {
        console.error('Error al guardar los datos:', error);
        alert(`Error al guardar: ${error.message}`);
    }
}

// Descarga los datos actuales como un archivo JSON
async function downloadData() {
    try {
        updateGeneralDataFromForm(); // Asegurarse de guardar datos del form primero

        const response = await fetch('/api/descargar_datos');

        if (!response.ok) {
            let errorMsg = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                // Si no se puede parsear como JSON, usa el mensaje de estado
            }
            throw new Error(errorMsg);
        }

        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'datos_clase.json';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        alert('Datos descargados correctamente.');

    } catch (error) {
        console.error('Error al descargar los datos:', error);
        alert(`Error al descargar: ${error.message}`);
    }
}

// --- Funcionalidad de Carga de Archivo ---
function handleFileSelect() {
    fileInput.click(); // Simula un clic en el input file oculto
}

fileInput.addEventListener('change', async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
        alert('Por favor, selecciona un archivo con extensión .json');
        fileInput.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/cargar_archivo', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const loadedData = await response.json();
        currentData = loadedData;
        populateGeneralData();
        loadStudents();
        fileInput.value = ''; // Limpiar la selección
        alert('Archivo cargado y datos actualizados correctamente.');
        setFechaNacimientoConstraints(); // Reestablecer restricciones de fecha

    } catch (error) {
        console.error('Error al cargar el archivo:', error);
        alert(`Error al cargar el archivo: ${error.message}`);
        fileInput.value = '';
    }
});
// --- Fin Funcionalidad de Carga de Archivo ---

// --- Funciones para Alumnos ---
async function addStudent() {
    editingIndex = null;
    modalTitle.textContent = 'Añadir Alumno';
    studentForm.reset();
    studentIndexInput.value = '';
    setStudentModalDate(); // Establecer fecha por defecto
    modal.style.display = 'block';
}

async function editSelectedStudent() {
    if (selectedRowIndex === null) return;

    const student = currentData['alumnos'][selectedRowIndex];
    if (!student) return;

    editingIndex = selectedRowIndex;
    modalTitle.textContent = 'Editar Alumno';
    studentIndexInput.value = editingIndex;
    studentNombreInput.value = student.nombre || '';
    // Formato de fecha para input type="date" es YYYY-MM-DD
    const parts = student.fechaNacimiento.split('/');
    if (parts.length === 3) {
        const formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        studentFechaNacInput.value = formattedDate;
    } else {
        studentFechaNacInput.value = ''; // O manejar error
    }
    studentNecesidadesInput.value = student.necesidadesEspeciales || '';
    studentNotasInput.value = student.notas || '';
    modal.style.display = 'block';
    
    // Si venimos de duplicar, desactivar la bandera
    if (isDuplicating) {
        isDuplicating = false;
    }
}

async function deleteSelectedStudent() {
    if (selectedRowIndex === null) return;

    if (!confirm('¿Estás seguro de que quieres eliminar este alumno?')) {
        return;
    }

    try {
        const response = await fetch(`/api/alumnos/${selectedRowIndex}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const updatedData = await response.json();
        currentData = updatedData;
        loadStudents(); // Esto también reseteará selectedRowIndex
        alert('Alumno eliminado correctamente.');

    } catch (error) {
        console.error('Error al eliminar el alumno:', error);
        alert(`Error al eliminar el alumno: ${error.message}`);
    }
}

async function duplicateSelectedStudent() {
    if (selectedRowIndex === null) return;

    try {
        const response = await fetch(`/api/alumnos/${selectedRowIndex}/duplicate`, {
            method: 'POST'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const updatedData = await response.json();
        currentData = updatedData;
        loadStudents();
        
        // --- Nueva lógica: Encontrar y seleccionar el alumno duplicado ---
        // Suponemos que el duplicado es el último elemento añadido
        const newIndex = currentData.alumnos.length - 1;
        if (newIndex >= 0) {
            // Usar setTimeout para asegurar que el DOM se haya actualizado
            setTimeout(() => {
                const newRow = document.querySelector(`#alumnos-table tbody tr[data-index="${newIndex}"]`);
                if (newRow) {
                    isDuplicating = true; // Activar bandera
                    selectRow(newIndex, newRow); // Seleccionar la nueva fila
                    editSelectedStudent(); // Abrir el modal de edición
                }
            }, 100); // 100ms debería ser suficiente
        }
        // --- Fin nueva lógica ---
        
        // alert('Alumno duplicado correctamente.'); // Opcional: eliminar el alert si se edita directamente

    } catch (error) {
        console.error('Error al duplicar el alumno:', error);
        alert(`Error al duplicar el alumno: ${error.message}`);
    }
}

// --- Funciones del Modal ---
function setStudentModalDate() {
    // Obtener el valor del campo Edad del formulario (no del currentData necesariamente)
    const edadInputValue = document.getElementById('edad').value;
    let edadAnios = 3; // Valor numérico por defecto

    if (typeof edadInputValue === 'string' && edadInputValue.includes('año')) {
        // Intentar extraer el número si el formato es "X años"
        const match = edadInputValue.match(/^(\d+)/);
        if (match) {
            edadAnios = parseInt(match[1], 10);
        }
    } else if (!isNaN(parseInt(edadInputValue, 10))) {
        // Si es un número válido, úsalo
        edadAnios = parseInt(edadInputValue, 10);
    }
    // Si no es ninguno de los casos anteriores, se mantiene el valor por defecto (3)

    if (isNaN(edadAnios) || edadAnios < 1 || edadAnios > 20) {
         edadAnios = 3; // Valor por defecto si la edad no es válida
    }

    const today = new Date();
    const defaultDate = new Date(today.getFullYear() - edadAnios, today.getMonth(), today.getDate());

    const minDate = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
    const finalDate = defaultDate > today ? today : (defaultDate < minDate ? minDate : defaultDate);

    const year = finalDate.getFullYear();
    const month = String(finalDate.getMonth() + 1).padStart(2, '0');
    const day = String(finalDate.getDate()).padStart(2, '0');
    studentFechaNacInput.value = `${year}-${month}-${day}`;
    
    setFechaNacimientoConstraints();
}

function setFechaNacimientoConstraints() {
     const today = new Date();
     const maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
     const minDate = new Date(today.getFullYear() - 20, today.getMonth(), today.getDate());
     
     // Formato para input type="date" es YYYY-MM-DD
     const maxDateString = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, '0')}-${String(maxDate.getDate()).padStart(2, '0')}`;
     const minDateString = `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, '0')}-${String(minDate.getDate()).padStart(2, '0')}`;
     
     studentFechaNacInput.max = maxDateString;
     studentFechaNacInput.min = minDateString;
}

async function saveStudent() {
    // Validaciones básicas
    if (!studentNombreInput.value.trim()) {
        alert('El nombre del alumno es obligatorio.');
        return;
    }
    if (!studentFechaNacInput.value) {
        alert('La Fecha de Nacimiento es obligatoria.');
        return;
    }

    const studentData = {
        nombre: studentNombreInput.value.trim(),
        // Convertir fecha de YYYY-MM-DD a DD/MM/AAAA
        fechaNacimiento: studentFechaNacInput.value.split('-').reverse().join('/'),
        necesidadesEspeciales: studentNecesidadesInput.value.trim(),
        notas: studentNotasInput.value.trim()
    };

    // --- Eliminar o modificar la validación de nombre único ---
    // La validación de nombre único NO debe estar en el frontend para operaciones normales
    // Solo se hacía en la app de escritorio por diseño.
    // Si se desea evitar duplicados, debe ser una validación del backend opcional.
    // Por ahora, se elimina esta restricción del frontend.
    /*
    if (editingIndex === null) { // Solo al añadir
        const nombreExists = currentData.alumnos.some(alumno => alumno.nombre === studentData.nombre);
        if (nombreExists) {
            alert('Ya existe un alumno con ese nombre. Por favor, elige otro.');
            return;
        }
    }
    */
    // --- Fin eliminación validación nombre único ---

    try {
        let response;
        if (editingIndex !== null) {
            response = await fetch(`/api/alumnos/${editingIndex}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(studentData)
            });
        } else {
            response = await fetch('/api/alumnos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(studentData)
            });
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const updatedData = await response.json();
        currentData = updatedData;
        loadStudents();
        closeModal();
        alert(editingIndex !== null ? 'Alumno actualizado correctamente' : 'Alumno añadido correctamente');

    } catch (error) {
        console.error('Error al guardar el alumno:', error);
        alert(`Error al guardar el alumno: ${error.message}`);
    }
}

function closeModal() {
    modal.style.display = 'none';
    editingIndex = null;
}

// --- Event Listeners ---
saveButton.addEventListener('click', saveAllData);
saveAsButton.addEventListener('click', downloadData);
selectFileButton.addEventListener('click', handleFileSelect);

addAlumnoButton.addEventListener('click', addStudent);
editAlumnoButton.addEventListener('click', editSelectedStudent);
deleteAlumnoButton.addEventListener('click', deleteSelectedStudent);
duplicateAlumnoButton.addEventListener('click', duplicateSelectedStudent);

studentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveStudent();
});

closeModalButton.addEventListener('click', closeModal);
cancelStudentButton.addEventListener('click', closeModal);

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', loadInitialData);

// --- Escuchar cambios en el campo Edad para actualizar la fecha por defecto ---
document.getElementById('edad').addEventListener('change', setStudentModalDate);
