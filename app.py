# app.py
from flask import Flask, render_template, request, jsonify, send_from_directory, send_file
import os
import json
import io
import uuid # Para generar nombres de archivos únicos si es necesario
from data_manager import load_data, save_data, add_student, edit_student, delete_student, duplicate_student

app = Flask(__name__)

# --- Configuración ---
# En Render, la variable de entorno PORT se usa para definir el puerto
PORT = int(os.environ.get('PORT', 5000))
# Puedes definir un nombre de archivo fijo o permitir que el usuario lo seleccione/gestione.
# Para simplificar, usaremos un nombre fijo por ahora.
DATA_FILENAME = "datos_clase.json"

# Ruta para servir archivos estáticos desde la carpeta 'static'
# Esto es opcional si usas la carpeta 'static' estándar de Flask, pero es bueno saberlo.
@app.route('/static/<path:filename>')
def custom_static(filename):
    return send_from_directory('static', filename)

# --- Rutas de la Aplicación Web ---

# Ruta principal: Sirve la página HTML
@app.route('/')
def index():
    return render_template('index.html')

# --- API Endpoints ---

# Endpoint para cargar todos los datos
@app.route('/api/datos', methods=['GET'])
def get_datos():
    data = load_data(DATA_FILENAME)
    return jsonify(data)

# Endpoint para guardar todos los datos (DatosGenerales + Alumnos)
@app.route('/api/datos', methods=['POST'])
def save_datos():
    try:
        data = request.get_json()
        if save_data(data, DATA_FILENAME):
            return jsonify({"message": "Datos guardados correctamente"}), 200
        else:
            return jsonify({"error": "Error al guardar los datos"}), 500
    except Exception as e:
        return jsonify({"error": f"Error en la solicitud: {str(e)}"}), 400

# --- Nuevos Endpoints para Cargar y Descargar Archivos ---

# Endpoint para cargar datos desde un archivo JSON subido
@app.route('/api/cargar_archivo', methods=['POST'])
def upload_file():
    try:
        # Verifica si el request contiene un archivo
        if 'file' not in request.files:
            return jsonify({"error": "No se encontró archivo en la solicitud"}), 400
        
        file = request.files['file']
        
        # Si el usuario no selecciona un archivo, el navegador envía un archivo vacío
        if file.filename == '':
            return jsonify({"error": "No se seleccionó ningún archivo"}), 400

        if file and file.filename.endswith('.json'):
            # Lee el contenido del archivo
            file_content = file.read().decode('utf-8')
            # Parsea el JSON
            uploaded_data = json.loads(file_content)
            
            # Valida la estructura básica (opcional pero recomendable)
            if 'DatosGenerales' in uploaded_data and 'alumnos' in uploaded_data:
                # Guarda los datos cargados en el archivo persistente del servidor
                if save_data(uploaded_data, DATA_FILENAME):
                    # Devuelve los datos cargados para que el frontend los actualice
                    return jsonify(uploaded_data), 200
                else:
                    return jsonify({"error": "Error al guardar los datos cargados en el servidor"}), 500
            else:
                return jsonify({"error": "El archivo JSON no tiene la estructura esperada"}), 400
        else:
            return jsonify({"error": "El archivo debe ser de tipo JSON"}), 400
    except json.JSONDecodeError:
        return jsonify({"error": "El archivo no es un JSON válido"}), 400
    except Exception as e:
        return jsonify({"error": f"Error al procesar el archivo: {str(e)}"}), 500

# Endpoint para descargar los datos actuales como un archivo JSON
@app.route('/api/descargar_datos', methods=['GET'])
def download_file():
    try:
        data = load_data(DATA_FILENAME)
        # Crea un objeto BytesIO para contener los datos JSON
        json_data = json.dumps(data, indent=4, ensure_ascii=False)
        json_bytes = io.BytesIO(json_data.encode('utf-8'))
        json_bytes.seek(0) # Mueve el cursor al inicio del stream

        # Usa send_file para devolver el contenido como un archivo descargable
        # as_attachment=True fuerza la descarga
        # download_name establece el nombre del archivo descargado
        return send_file(
            json_bytes,
            mimetype='application/json',
            as_attachment=True,
            download_name=DATA_FILENAME # O puedes usar un nombre dinámico
        )
    except Exception as e:
        # En caso de error, devuelve un JSON con el mensaje de error
        return jsonify({"error": f"Error al preparar la descarga: {str(e)}"}), 500


# --- Endpoints existentes para alumnos (sin cambios) ---
# (Mantén los endpoints /api/alumnos/... tal como estaban)

# Endpoint para añadir un alumno
@app.route('/api/alumnos', methods=['POST'])
def add_alumno():
    try:
        student_data = request.get_json()
        if not student_data or 'nombre' not in student_data or 'fechaNacimiento' not in student_data:
             return jsonify({"error": "Nombre y Fecha de Nacimiento son obligatorios"}), 400
        
        data = load_data(DATA_FILENAME)
        add_student(data, student_data)
        if save_data(data, DATA_FILENAME):
            # Devuelve los datos actualizados
            return jsonify(data), 200 
        else:
            return jsonify({"error": "Error al guardar el alumno"}), 500
    except Exception as e:
        return jsonify({"error": f"Error en la solicitud: {str(e)}"}), 400

# Endpoint para editar un alumno (se envía el índice y los nuevos datos)
@app.route('/api/alumnos/<int:index>', methods=['PUT'])
def edit_alumno(index):
    try:
        updated_student_data = request.get_json()
        if not updated_student_data or 'nombre' not in updated_student_data or 'fechaNacimiento' not in updated_student_data:
             return jsonify({"error": "Nombre y Fecha de Nacimiento son obligatorios"}), 400
            
        data = load_data(DATA_FILENAME)
        edit_student(data, index, updated_student_data)
        if save_data(data, DATA_FILENAME):
            # Devuelve los datos actualizados
            return jsonify(data), 200
        else:
            return jsonify({"error": "Error al editar el alumno"}), 500
    except Exception as e:
        return jsonify({"error": f"Error en la solicitud: {str(e)}"}), 400

# Endpoint para eliminar un alumno (se envía el índice)
@app.route('/api/alumnos/<int:index>', methods=['DELETE'])
def delete_alumno(index):
    try:
        data = load_data(DATA_FILENAME)
        if 0 <= index < len(data['alumnos']):
            delete_student(data, index)
            if save_data(data, DATA_FILENAME):
                # Devuelve los datos actualizados
                return jsonify(data), 200
            else:
                return jsonify({"error": "Error al eliminar el alumno"}), 500
        else:
           return jsonify({"error": "Índice de alumno no válido"}), 400
    except Exception as e:
        return jsonify({"error": f"Error en la solicitud: {str(e)}"}), 400

# Endpoint para duplicar un alumno (se envía el índice)
@app.route('/api/alumnos/<int:index>/duplicate', methods=['POST'])
def duplicate_alumno(index):
    try:
        data = load_data(DATA_FILENAME)
        if 0 <= index < len(data['alumnos']):
            duplicate_student(data, index)
            if save_data(data, DATA_FILENAME):
                 # Devuelve los datos actualizados
                return jsonify(data), 200
            else:
                return jsonify({"error": "Error al duplicar el alumno"}), 500
        else:
           return jsonify({"error": "Índice de alumno no válido"}), 400
    except Exception as e:
        return jsonify({"error": f"Error en la solicitud: {str(e)}"}), 400


if __name__ == '__main__':
    # En Render, no se ejecuta el servidor de desarrollo de Flask.
    # Este bloque solo se ejecuta localmente.
    app.run(host='0.0.0.0', port=PORT, debug=True)
