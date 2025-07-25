# app.py
from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import uuid # Para generar nombres de archivos \u00fanicos si es necesario
from data_manager import load_data, save_data, add_student, edit_student, delete_student, duplicate_student

app = Flask(__name__)

# --- Configuraci\u00f3n ---
# En Render, la variable de entorno PORT se usa para definir el puerto
PORT = int(os.environ.get('PORT', 5000))
# Puedes definir un nombre de archivo fijo o permitir que el usuario lo seleccione/gestione.
# Para simplificar, usaremos un nombre fijo por ahora.
DATA_FILENAME = "datos_clase.json"

# Ruta para servir archivos est\u00e1ticos desde la carpeta 'static'
# Esto es opcional si usas la carpeta 'static' est\u00e1ndar de Flask, pero es bueno saberlo.
@app.route('/static/<path:filename>')
def custom_static(filename):
    return send_from_directory('static', filename)

# --- Rutas de la Aplicaci\u00f3n Web ---

# Ruta principal: Sirve la p\u00e1gina HTML
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

# Endpoint para a\u00f1adir un alumno
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

# Endpoint para editar un alumno (se env\u00eda el \u00edndice y los nuevos datos)
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

# Endpoint para eliminar un alumno (se env\u00eda el \u00edndice)
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

# Endpoint para duplicar un alumno (se env\u00eda el \u00edndice)
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

