# data_manager.py
import json
import os

# --- Configuraci\u00f3n ---
# En Render, puedes usar una variable de entorno para definir el directorio de datos persistente.
# Para simplificar este ejemplo, los datos se guardar\u00e1n en el mismo directorio que `app.py`.
# En producci\u00f3n, considera usar un volumen persistente o una base de datos.
DATA_DIR = os.environ.get('DATA_DIR', '.') # Por defecto, el directorio actual
DEFAULT_FILENAME = "datos_clase.json"

def get_file_path(filename=DEFAULT_FILENAME):
    """Obtiene la ruta completa del archivo de datos."""
    return os.path.join(DATA_DIR, filename)

def load_data(filename=DEFAULT_FILENAME):
    """Carga los datos desde un archivo JSON."""
    file_path = get_file_path(filename)
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as file:
                return json.load(file)
        else:
             # Si el archivo no existe, devuelve la estructura vac\u00eda
            return {
                'DatosGenerales': {
                    'IEI': '', 'DREL': '', 'UGEL': '',
                    'Directora': '', 'Maestra': '', 'CoMaestra': '',
                    'Edad': '', 'Aula': '', 'Turno': ''
                },
                'alumnos': []
            }
    except Exception as e:
        print(f"Error al cargar datos: {e}")
        # Devuelve estructura vac\u00eda en caso de error
        return {
            'DatosGenerales': {
                'IEI': '', 'DREL': '', 'UGEL': '',
                'Directora': '', 'Maestra': '', 'CoMaestra': '',
                'Edad': '', 'Aula': '', 'Turno': ''
            },
            'alumnos': []
        }

def save_data(data, filename=DEFAULT_FILENAME):
    """Guarda los datos en un archivo JSON."""
    file_path = get_file_path(filename)
    try:
        # Aseg\u00farese de que el directorio DATA_DIR exista
        os.makedirs(DATA_DIR, exist_ok=True)
        
        with open(file_path, 'w', encoding='utf-8') as file:
            json.dump(data, file, indent=4, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error al guardar datos: {e}")
        return False

# Funciones auxiliares para manipular alumnos (similares a las de tu App original)
def add_student(data, student_data):
    """A\u00f1ade un alumno a la lista."""
    data['alumnos'].append(student_data)

def edit_student(data, index, updated_student_data):
    """Edita un alumno en la lista."""
    if 0 <= index < len(data['alumnos']):
        data['alumnos'][index] = updated_student_data

def delete_student(data, index):
    """Elimina un alumno de la lista."""
    if 0 <= index < len(data['alumnos']):
        del data['alumnos'][index]

def duplicate_student(data, index):
    """Duplica un alumno en la lista."""
    if 0 <= index < len(data['alumnos']):
        original = data['alumnos'][index]
        nuevo = original.copy()
        nuevo["nombre"] = original["nombre"] + " (Copia)"
        data['alumnos'].append(nuevo)

