# app.py
from flask import Flask, render_template, request, jsonify, send_from_directory, send_file
import os
import json
import io
import logging
from datetime import datetime
import uuid

# --- Manejo condicional de psutil ---
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    psutil = None
    PSUTIL_AVAILABLE = False
    # El logging básico aún no está configurado aquí, así que usamos print para esta advertencia inicial
    print("ADVERTENCIA: La librería 'psutil' no está disponible. La información detallada del proceso no se mostrará.")
# --- Fin manejo condicional de psutil ---

# --- Importaciones del data_manager ---
from data_manager import load_data, save_data, add_student, edit_student, delete_student, duplicate_student

# --- Configuración de Logging ---
app_logger = logging.getLogger('editor_clase_web')
app_logger.setLevel(logging.INFO)

LOG_DIR = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

log_formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

log_file_path = os.path.join(LOG_DIR, 'app.log')
file_handler = logging.FileHandler(log_file_path, encoding='utf-8')
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(log_formatter)

console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(log_formatter)

if not app_logger.handlers:
    app_logger.addHandler(file_handler)
    app_logger.addHandler(console_handler)

app_logger.info("Iniciando aplicación Editor Clase Web")
# --- Fin Configuración de Logging ---


app = Flask(__name__)

# --- Configuración existente ---
PORT = int(os.environ.get('PORT', 5000))
DATA_FILENAME = "datos_clase.json"
# --- Fin Configuración existente ---

# --- Función auxiliar para obtener información del proceso ---
def get_process_info():
    """Obtiene información relevante del proceso."""
    import sys

    info = {
        "PID": "No disponible (psutil no instalado)" if not PSUTIL_AVAILABLE else "Error al obtener",
        "Nombre": "No disponible (psutil no instalado)" if not PSUTIL_AVAILABLE else "Error al obtener",
        "Estado": "No disponible (psutil no instalado)" if not PSUTIL_AVAILABLE else "Error al obtener",
        "Hora de inicio": "No disponible (psutil no instalado)" if not PSUTIL_AVAILABLE else "Error al obtener",
        "CPU (%)": "No disponible (psutil no instalado)" if not PSUTIL_AVAILABLE else "Error al obtener",
        "Memoria (MB)": "No disponible (psutil no instalado)" if not PSUTIL_AVAILABLE else "Error al obtener",
        "Número de hilos": "No disponible (psutil no instalado)" if not PSUTIL_AVAILABLE else "Error al obtener",
        "Versión de Python": sys.version,
        "Directorio de trabajo": os.getcwd(),
        "Ruta del script": os.path.abspath(__file__),
        "Variables de entorno relevantes": {
            "PORT": os.environ.get("PORT", "No definida"),
            "PYTHON_VERSION": os.environ.get("PYTHON_VERSION", "No definida"),
            "DATA_DIR": os.environ.get("DATA_DIR", "No definida")
        }
    }

    # Si psutil está disponible, obtener información detallada
    if PSUTIL_AVAILABLE and psutil:
        try:
            process = psutil.Process(os.getpid())
            info["PID"] = process.pid
            info["Nombre"] = process.name()
            info["Estado"] = process.status()
            info["Hora de inicio"] = datetime.fromtimestamp(process.create_time()).strftime('%Y-%m-%d %H:%M:%S')
            info["CPU (%)"] = process.cpu_percent()
            info["Memoria (MB)"] = round(process.memory_info().rss / 1024 / 1024, 2)
            info["Número de hilos"] = process.num_threads()
        except Exception as e:
            app_logger.error(f"Error al obtener información detallada del proceso con psutil: {e}")
            # La información básica ya está establecida con valores de error

    return info
# --- Fin Función auxiliar ---

# --- Rutas de la Aplicación Web ---

@app.route('/')
def index():
    app_logger.info("Página principal solicitada.")
    return render_template('index.html')

# --- Endpoint de Debug ---
@app.route('/debug')
def debug_page():
    """Página de depuración."""
    app_logger.info("Página de depuración solicitada.")
    return render_template('debug.html')

@app.route('/api/debug/info')
def get_debug_info():
    """API para obtener información de depuración."""
    try:
        process_info = get_process_info()
        # Leer las últimas 100 líneas del log
        log_lines = []
        if os.path.exists(log_file_path):
            with open(log_file_path, 'r', encoding='utf-8') as f:
                # Ir al final del archivo y leer hacia atrás
                f.seek(0, os.SEEK_END)
                file_size = f.tell()
                lines_found = 0
                buffer = bytearray()
                pointer = file_size - 1

                while pointer >= 0 and lines_found < 100:
                    f.seek(pointer)
                    byte = f.read(1)
                    if byte == b'\n' and buffer:
                        # Se encontró una línea completa
                        line = buffer.decode('utf-8')[::-1] # Invertir el buffer
                        log_lines.append(line)
                        buffer = bytearray()
                        lines_found += 1
                    else:
                        buffer.extend(byte)
                    pointer -= 1

                # Añadir la última línea si no termina con \n
                if buffer and lines_found < 100:
                    line = buffer.decode('utf-8')[::-1]
                    log_lines.append(line)

            log_lines.reverse() # Invertir para tener el orden correcto (más reciente al final)

        app_logger.info("Información de depuración obtenida correctamente.")
        return jsonify({
            "process_info": process_info,
            "logs": log_lines
        })
    except Exception as e:
        app_logger.error(f"Error al obtener información de depuración: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/debug/download_log')
def download_log():
    """API para descargar el archivo de log."""
    try:
        if not os.path.exists(log_file_path):
            app_logger.warning("Intento de descargar log, pero el archivo no existe.")
            return jsonify({"error": "Archivo de log no encontrado."}), 404

        # Enviar el archivo para descarga
        return send_file(
            log_file_path,
            mimetype='text/plain',
            as_attachment=True,
            download_name=f"app_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        )
    except Exception as e:
        app_logger.error(f"Error al descargar el log: {e}")
        return jsonify({"error": str(e)}), 500
# --- Fin Endpoint de Debug ---

# --- Rutas estáticas existentes ---
@app.route('/static/<path:filename>')
def custom_static(filename):
    return send_from_directory('static', filename)
# --- Fin Rutas estáticas existentes ---

# --- API Endpoints ---

@app.route('/api/datos', methods=['GET'])
def get_datos():
    try:
        data = load_data(DATA_FILENAME)
        app_logger.info("Datos cargados correctamente desde /api/datos")
        return jsonify(data)
    except Exception as e:
        app_logger.error(f"Error en /api/datos GET: {e}")
        return jsonify({"error": f"Error al cargar datos: {str(e)}"}), 500

@app.route('/api/datos', methods=['POST'])
def save_datos():
    try:
        data = request.get_json()
        if save_data(data, DATA_FILENAME):
            app_logger.info("Datos guardados correctamente desde /api/datos")
            # Ya no enviamos un mensaje de éxito al frontend
            return jsonify({"message": "Datos guardados correctamente"}), 200
        else:
            app_logger.error("Error al guardar datos en save_data")
            return jsonify({"error": "Error al guardar los datos"}), 500
    except Exception as e:
        app_logger.error(f"Error en /api/datos POST: {e}")
        return jsonify({"error": f"Error en la solicitud: {str(e)}"}), 400

@app.route('/api/cargar_archivo', methods=['POST'])
def upload_file():
    try:
        app_logger.info("Solicitud POST recibida en /api/cargar_archivo")
        if 'file' not in request.files:
            app_logger.error("No se encontró 'file' en request.files")
            return jsonify({"error": "No se encontró archivo en la solicitud"}), 400

        file = request.files['file']
        app_logger.info(f"Archivo recibido: {file.filename}")

        if file.filename == '':
            app_logger.error("Nombre de archivo vacío")
            return jsonify({"error": "No se seleccionó ningún archivo"}), 400

        if file and file.filename.endswith('.json'):
            file_content = file.read().decode('utf-8')
            app_logger.info(f"Contenido del archivo leído ({len(file_content)} chars)")
            uploaded_data = json.loads(file_content)
            app_logger.info("JSON parseado correctamente.")

            if 'DatosGenerales' in uploaded_data and 'alumnos' in uploaded_data:
                app_logger.info("Estructura básica validada.")
                if save_data(uploaded_data, DATA_FILENAME):
                    app_logger.info("Datos cargados y guardados en el servidor.")
                    return jsonify(uploaded_data), 200
                else:
                    app_logger.error("Error al guardar los datos cargados en el servidor.")
                    return jsonify({"error": "Error al guardar los datos cargados en el servidor"}), 500
            else:
                app_logger.error("El archivo JSON no tiene la estructura esperada.")
                return jsonify({"error": "El archivo JSON no tiene la estructura esperada"}), 400
        else:
            app_logger.error("El archivo no es .json")
            return jsonify({"error": "El archivo debe ser de tipo JSON"}), 400
    except json.JSONDecodeError as jde:
        app_logger.error(f"Error de JSON al decodificar el archivo: {jde}")
        return jsonify({"error": f"El archivo no es un JSON válido: {str(jde)}"}), 400
    except Exception as e:
        app_logger.error(f"Error interno al procesar el archivo: {e}")
        return jsonify({"error": f"Error al procesar el archivo: {str(e)}"}), 500

@app.route('/api/descargar_datos', methods=['GET'])
def download_file():
    try:
        data = load_data(DATA_FILENAME)
        json_data = json.dumps(data, indent=4, ensure_ascii=False)
        json_bytes = io.BytesIO(json_data.encode('utf-8'))
        json_bytes.seek(0)

        return send_file(
            json_bytes,
            mimetype='application/json',
            as_attachment=True,
            download_name=DATA_FILENAME
        )
    except Exception as e:
        app_logger.error(f"Error al preparar la descarga: {e}")
        return jsonify({"error": f"Error al preparar la descarga: {str(e)}"}), 500

# --- Endpoints para alumnos ---

@app.route('/api/alumnos', methods=['POST'])
def add_alumno():
    try:
        student_data = request.get_json()
        if not student_data or 'nombre' not in student_data or 'fechaNacimiento' not in student_
            app_logger.warning("Nombre o Fecha de Nacimiento no proporcionados en /api/alumnos POST")
            return jsonify({"error": "Nombre y Fecha de Nacimiento son obligatorios"}), 400

        data = load_data(DATA_FILENAME)
        add_student(data, student_data)
        if save_data(data, DATA_FILENAME):
            app_logger.info(f"Alumno añadido: {student_data['nombre']}")
            # Ya no enviamos un mensaje de éxito al frontend
            return jsonify(data), 200
        else:
            app_logger.error("Error al guardar el alumno añadido")
            return jsonify({"error": "Error al guardar el alumno"}), 500
    except Exception as e:
        app_logger.error(f"Error en /api/alumnos POST: {e}")
        return jsonify({"error": f"Error en la solicitud: {str(e)}"}), 400

@app.route('/api/alumnos/<int:index>', methods=['PUT'])
def edit_alumno(index):
    try:
        updated_student_data = request.get_json()
        if not updated_student_data or 'nombre' not in updated_student_data or 'fechaNacimiento' not in updated_student_
            app_logger.warning("Nombre o Fecha de Nacimiento no proporcionados en /api/alumnos/<index> PUT")
            return jsonify({"error": "Nombre y Fecha de Nacimiento son obligatorios"}), 400

        data = load_data(DATA_FILENAME)
        edit_student(data, index, updated_student_data)
        if save_data(data, DATA_FILENAME):
            app_logger.info(f"Alumno editado en índice {index}")
            # Ya no enviamos un mensaje de éxito al frontend
            return jsonify(data), 200
        else:
            app_logger.error(f"Error al guardar el alumno editado en índice {index}")
            return jsonify({"error": "Error al editar el alumno"}), 500
    except Exception as e:
        app_logger.error(f"Error en /api/alumnos/<index> PUT: {e}")
        return jsonify({"error": f"Error en la solicitud: {str(e)}"}), 400

@app.route('/api/alumnos/<int:index>', methods=['DELETE'])
def delete_alumno(index):
    try:
        data = load_data(DATA_FILENAME)
        if 0 <= index < len(data['alumnos']):
            deleted_name = data['alumnos'][index].get('nombre', 'Desconocido')
            delete_student(data, index)
            if save_data(data, DATA_FILENAME):
                app_logger.info(f"Alumno eliminado en índice {index}: {deleted_name}")
                # Ya no enviamos un mensaje de éxito al frontend
                return jsonify(data), 200
            else:
                app_logger.error(f"Error al guardar después de eliminar alumno en índice {index}")
                return jsonify({"error": "Error al eliminar el alumno"}), 500
        else:
           app_logger.warning(f"Índice de alumno no válido para eliminación: {index}")
           return jsonify({"error": "Índice de alumno no válido"}), 400
    except Exception as e:
        app_logger.error(f"Error en /api/alumnos/<index> DELETE: {e}")
        return jsonify({"error": f"Error en la solicitud: {str(e)}"}), 400

@app.route('/api/alumnos/<int:index>/duplicate', methods=['POST'])
def duplicate_alumno(index):
    try:
        data = load_data(DATA_FILENAME)
        if 0 <= index < len(data['alumnos']):
            original_name = data['alumnos'][index].get('nombre', 'Desconocido')
            duplicate_student(data, index)
            if save_data(data, DATA_FILENAME):
                app_logger.info(f"Alumno duplicado desde índice {index}: {original_name}")
                # Ya no enviamos un mensaje de éxito al frontend
                return jsonify(data), 200
            else:
                app_logger.error(f"Error al guardar después de duplicar alumno desde índice {index}")
                return jsonify({"error": "Error al duplicar el alumno"}), 500
        else:
           app_logger.warning(f"Índice de alumno no válido para duplicación: {index}")
           return jsonify({"error": "Índice de alumno no válido"}), 400
    except Exception as e:
        app_logger.error(f"Error en /api/alumnos/<index>/duplicate POST: {e}")
        return jsonify({"error": f"Error en la solicitud: {str(e)}"}), 400

# --- Fin API Endpoints ---

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT, debug=True)
