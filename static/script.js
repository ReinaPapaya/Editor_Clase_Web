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
let editingIndex = null; // Para saber si estamos editando (-1) o añadiendo (null)

// --- Elementos del DOM ---
const datosForm = document.getElementById('datos-generales-form');
const saveButton = document.getElementById('save-button');
const saveAsButton = document.getElementById('save-as-button'); // Nuevo
const selectFileButton = document.getElementById('select-file-button'); // Nuevo
const fileInput = document.getElementById('file-input'); // Nuevo

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
        currentData = data; // Guarda los datos cargados globalmente
        populateGeneralData(); // Llena el formulario de datos generales
        loadStudents(); // Llena la tabla de alumnos
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
                input.value = datosGenerales[field];
            }
        }
    }
}

// Actualiza el objeto currentData con los valores del formulario de Datos Generales
function updateGeneralDataFromForm() {
    const formData = new FormData(datosForm);
    for (const [key, value] of formData.entries()) {
        // Asegúrate de que la clave exista en la estructura esperada y no sea el input file
        if (key !== 'file-input' && currentData['DatosGenerales'].hasOwnProperty(key.toUpperCase())) {
             currentData['DatosGenerales'][key.toUpperCase()] = value;
        }
    }
}

// Carga y muestra la lista de alumnos en la tabla
function loadStudents() {
    alumnosTableBody.innerHTML = ''; // Limpia la tabla

    currentData['alumnos'].forEach((student, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-index', index); // Almacena el índice en el atributo data

        // Crear celdas para cada propiedad del alumno
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

        // Celda para acciones
        const actionsCell = document.createElement('td');
        
        const editButton = document.createElement('button');
        editButton.textContent = 'Editar';
        editButton.classList.add('action-button');
        editButton.onclick = () => openEditStudentModal(index);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Eliminar';
        deleteButton.classList.add('action-button');
        deleteButton.onclick = () => deleteStudent(index);
        
        const duplicateButton = document.createElement('button');
        duplicateButton.textContent = 'Duplicar';
        duplicateButton.classList.add('action-button');
        duplicateButton.onclick = () => duplicateStudent(index);

        actionsCell.appendChild(editButton);
        actionsCell.appendChild(deleteButton);
        actionsCell.appendChild(duplicateButton);
        
        row.appendChild(actionsCell);

        // Añadir evento para seleccionar fila (opcional, para futuras mejoras)
        row.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') { // Evita seleccionar al hacer clic en botones
                document.querySelectorAll('#alumnos-table tbody tr').forEach(r => r.classList.remove('selected'));
                row.classList.add('selected');
                enableActionButtons(index);
            }
        });

        alumnosTableBody.appendChild(row);
    });
}

// --- Funciones de Interacción con la API ---

// Guarda todos los datos (DatosGenerales + Alumnos)
async function saveAllData() {
    updateGeneralDataFromForm(); // Asegúrate de que los datos del form estén actualizados
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
        // Actualiza los datos generales del formulario antes de descargar
        updateGeneralDataFromForm();
        
        // Realiza la solicitud GET para descargar
        const response = await fetch('/api/descargar_datos');
        
        if (!response.ok) {
             // Intenta leer el error JSON si la respuesta no es exitosa
            let errorMsg = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                // Si no se puede parsear como JSON, usa el mensaje de estado
            }
            throw new Error(errorMsg);
        }

        // Obtener el nombre del archivo del encabezado Content-Disposition
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'datos_clase.json'; // Nombre por defecto
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch.length === 2) {
                filename = filenameMatch[1];
            }
        }

        // Crear un blob a partir del stream de la respuesta
        const blob = await response.blob();

        // Crear un enlace temporal para la descarga
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename; // Nombre del archivo
        document.body.appendChild(a);
        a.click();

        // Limpiar
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        alert('Datos descargados correctamente.');
        
    } catch (error) {
        console.error('Error al descargar los datos:', error);
        alert(`Error al descargar: ${error.message}`);
    }
}

// Carga datos desde un archivo JSON seleccionado por el usuario
function handleFileSelect() {
    fileInput.click(); // Simula un clic en el input file oculto
}

// Maneja el evento cuando se selecciona un archivo
fileInput.addEventListener('change', async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Verificar tipo de archivo (opcional, ya se hace en el backend)
    if (!file.name.endsWith('.json')) {
        alert('Por favor, selecciona un archivo con extensión .json');
        fileInput.value = ''; // Limpiar la selección
        return;
    }

    // Crear un objeto FormData para enviar el archivo
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/cargar_archivo', {
            method: 'POST',
            body: formData
            // No establecer Content-Type, deja que el navegador lo haga con el boundary correcto
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const loadedData = await response.json();
        currentData = loadedData; // Actualiza los datos locales con los cargados
        populateGeneralData(); // Actualiza el formulario
        loadStudents(); // Actualiza la tabla
        fileInput.value = ''; // Limpiar la selección
        alert('Archivo cargado y datos actualizados correctamente.');
        
    } catch (error) {
        console.error('Error al cargar el archivo:', error);
        alert(`Error al cargar el archivo: ${error.message}`);
        fileInput.value = ''; // Limpiar la selección en caso de error
    }
});

// Añade o edita un alumno
async function saveStudent() {
    const studentData = {
        nombre: studentNombreInput.value.trim(),
        fechaNacimiento: studentFechaNacInput.value.trim(),
        necesidadesEspeciales: studentNecesidadesInput.value.trim(),
        notas: studentNotasInput.value.trim()
    };

    if (!studentData.nombre || !studentData.fechaNacimiento) {
        alert('Nombre y Fecha de Nacimiento son obligatorios.');
        return;
    }

    try {
        let response;
        if (editingIndex !== null) {
            // Editar alumno existente
            response = await fetch(`/api/alumnos/${editingIndex}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(studentData)
            });
        } else {
            // Añadir nuevo alumno
            response = await fetch('/api/alumnos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(studentData)
            });
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const updatedData = await response.json();
        currentData = updatedData; // Actualiza los datos locales con los devueltos por la API
        loadStudents(); // Recarga la tabla
        closeModal(); // Cierra el modal
        alert(editingIndex !== null ? 'Alumno actualizado correctamente' : 'Alumno añadido correctamente');

    } catch (error) {
        console.error('Error al guardar el alumno:', error);
        alert(`Error al guardar el alumno: ${error.message}`);
    }
}

// Elimina un alumno
async function deleteStudent(index) {
    if (!confirm('¿Estás seguro de que quieres eliminar este alumno?')) {
        return;
    }

    try {
        const response = await fetch(`/api/alumnos/${index}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const updatedData = await response.json();
        currentData = updatedData; // Actualiza los datos locales
        loadStudents(); // Recarga la tabla
        alert('Alumno eliminado correctamente.');

    } catch (error) {
        console.error('Error al eliminar el alumno:', error);
        alert(`Error al eliminar el alumno: ${error.message}`);
    }
}

// Duplica un alumno
async function duplicateStudent(index) {
    try {
        const response = await fetch(`/api/alumnos/${index}/duplicate`, {
            method: 'POST'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const updatedData = await response.json();
        currentData = updatedData; // Actualiza los datos locales
        loadStudents(); // Recarga la tabla
        alert('Alumno duplicado correctamente.');

    } catch (error) {
        console.error('Error al duplicar el alumno:', error);
        alert(`Error al duplicar el alumno: ${error.message}`);
    }
}

// Abre el modal para añadir un nuevo alumno
function openAddStudentModal() {
    editingIndex = null;
    modalTitle.textContent = 'Añadir Alumno';
    studentForm.reset(); // Limpia el formulario del modal
    studentIndexInput.value = ''; // Limpia el campo oculto
    modal.style.display = 'block';
}

// Abre el modal para editar un alumno existente
function openEditStudentModal(index) {
    const student = currentData['alumnos'][index];
    if (!student) return;

    editingIndex = index;
    modalTitle.textContent = 'Editar Alumno';
    studentIndexInput.value = index;
    studentNombreInput.value = student.nombre || '';
    studentFechaNacInput.value = student.fechaNacimiento || '';
    studentNecesidadesInput.value = student.necesidadesEspeciales || '';
    studentNotasInput.value = student.notas || '';
    modal.style.display = 'block';
}

// Cierra el modal
function closeModal() {
    modal.style.display = 'none';
    editingIndex = null; // Resetea el índice de edición
}

// Habilita/deshabilita los botones de acciones según la selección
function enableActionButtons(index) {
    if (index !== undefined && index >= 0) {
        editAlumnoButton.disabled = false;
        deleteAlumnoButton.disabled = false;
        duplicateAlumnoButton.disabled = false;
    } else {
        editAlumnoButton.disabled = true;
        deleteAlumnoButton.disabled = true;
        duplicateAlumnoButton.disabled = true;
    }
}

// --- Event Listeners ---

// Guardar todos los datos
saveButton.addEventListener('click', saveAllData);

// Guardar Como (Descargar)
saveAsButton.addEventListener('click', downloadData);

// Seleccionar Archivo (Cargar)
selectFileButton.addEventListener('click', handleFileSelect);

// Añadir alumno
addAlumnoButton.addEventListener('click', openAddStudentModal);

// Enviar formulario del modal (guardar alumno)
studentForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Evita el envío normal del formulario
    saveStudent();
});

// Cerrar modal con la X
closeModalButton.addEventListener('click', closeModal);

// Cerrar modal con el botón Cancelar
cancelStudentButton.addEventListener('click', closeModal);

// Cerrar modal haciendo clic fuera del contenido
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

// --- Inicialización ---
// Carga los datos cuando la página se haya cargado completamente
document.addEventListener('DOMContentLoaded', loadInitialData);
