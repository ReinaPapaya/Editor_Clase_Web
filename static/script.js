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
let editingIndex = null; // Para saber si estamos editando (-1) o a\u00f1adiendo (null)

// --- Elementos del DOM ---
const datosForm = document.getElementById('datos-generales-form');
const saveButton = document.getElementById('save-button');
// const saveAsButton = document.getElementById('save-as-button'); // No implementado a\u00fan

const alumnosTableBody = document.querySelector('#alumnos-table tbody');
const addAlumnoButton = document.getElementById('add-alumno-button');

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

// --- Funciones de Carga y Actualizaci\u00f3n de UI ---

// Carga los datos iniciales al cargar la p\u00e1gina
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
        alert('Error al cargar los datos. Por favor, recarga la p\u00e1gina.');
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
        // Aseg\u00farese de que la clave exista en la estructura esperada
        if (currentData['DatosGenerales'].hasOwnProperty(key.toUpperCase())) {
             currentData['DatosGenerales'][key.toUpperCase()] = value;
        }
    }
}

// Carga y muestra la lista de alumnos en la tabla
function loadStudents() {
    alumnosTableBody.innerHTML = ''; // Limpia la tabla

    currentData['alumnos'].forEach((student, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-index', index); // Almacena el \u00edndice en el atributo data

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

        // A\u00f1adir evento para seleccionar fila (opcional, para futuras mejoras)
        row.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') { // Evita seleccionar al hacer clic en botones
                document.querySelectorAll('#alumnos-table tbody tr').forEach(r => r.classList.remove('selected'));
                row.classList.add('selected');
            }
        });

        alumnosTableBody.appendChild(row);
    });
}

// --- Funciones de Interacci\u00f3n con la API ---

// Guarda todos los datos (DatosGenerales + Alumnos)
async function saveAllData() {
    updateGeneralDataFromForm(); // Aseg\u00farese de que los datos del form est\u00e9n actualizados
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

// A\u00f1ade o edita un alumno
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
            // A\u00f1adir nuevo alumno
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
        alert(editingIndex !== null ? 'Alumno actualizado correctamente' : 'Alumno a\u00f1adido correctamente');

    } catch (error) {
        console.error('Error al guardar el alumno:', error);
        alert(`Error al guardar el alumno: ${error.message}`);
    }
}

// Elimina un alumno
async function deleteStudent(index) {
    if (!confirm('¿Est\u00e1s seguro de que quieres eliminar este alumno?')) {
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


// --- Funciones de Interacci\u00f3n con el Modal ---

// Abre el modal para a\u00f1adir un nuevo alumno
function openAddStudentModal() {
    editingIndex = null;
    modalTitle.textContent = 'A\u00f1adir Alumno';
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
    editingIndex = null; // Resetea el \u00edndice de edici\u00f3n
}

// --- Event Listeners ---

// Guardar todos los datos
saveButton.addEventListener('click', saveAllData);

// A\u00f1adir alumno
addAlumnoButton.addEventListener('click', openAddStudentModal);

// Enviar formulario del modal (guardar alumno)
studentForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Evita el env\u00edo normal del formulario
    saveStudent();
});

// Cerrar modal con la X
closeModalButton.addEventListener('click', closeModal);

// Cerrar modal con el bot\u00f3n Cancelar
cancelStudentButton.addEventListener('click', closeModal);

// Cerrar modal haciendo clic fuera del contenido
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

// --- Inicializaci\u00f3n ---
// Carga los datos cuando la p\u00e1gina se haya cargado completamente
document.addEventListener('DOMContentLoaded', loadInitialData);

