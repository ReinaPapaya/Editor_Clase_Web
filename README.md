# Editor de Alumnos - Versi\u00f3n Web

Esta es una aplicaci\u00f3n web para gestionar la informaci\u00f3n de alumnos y datos generales de una clase, basada en la aplicaci\u00f3n de escritorio original `Editor_clase.py`.

## Tecnolog\u00edas

*   **Backend:** Python, Flask
*   **Frontend:** HTML, CSS, JavaScript
*   **Despliegue:** Dise\u00f1ada para desplegarse en Render.

## Estructura del Proyecto

*   `app.py`: Aplicaci\u00f3n principal de Flask. Define las rutas y la API.
*   `data_manager.py`: L\u00f3gica para cargar y guardar datos en formato JSON.
*   `requirements.txt`: Dependencias de Python.
*   `templates/`: Contiene el archivo HTML principal (`index.html`).
*   `static/`: Contiene los archivos CSS (`styles.css`) y JavaScript (`script.js`).
*   `README.md`: Este archivo.

## Desarrollo Local

1.  Clona el repositorio.
2.  Crea un entorno virtual de Python: `python -m venv venv`
3.  Activa el entorno virtual:
    *   En Windows: `venv\Scripts\activate`
    *   En macOS/Linux: `source venv/bin/activate`
4.  Instala las dependencias: `pip install -r requirements.txt`
5.  Ejecuta la aplicaci\u00f3n: `python app.py`
6.  Abre tu navegador en `http://localhost:5000`.

## Despliegue en Render

1.  Crea un repositorio en GitHub y sube este c\u00f3digo.
2.  En Render, crea un nuevo servicio web.
3.  Conecta tu repositorio de GitHub.
4.  Configura las opciones:
    *   **Build Command:** `pip install -r requirements.txt`
    *   **Start Command:** `gunicorn --bind 0.0.0.0:$PORT app:app`
    *   **Runtime:** Python 3
5.  Render desplegar\u00e1 autom\u00e1ticamente la aplicaci\u00f3n y te proporcionar\u00e1 una URL p\u00fablica.

