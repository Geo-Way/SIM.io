# 🛠️ SIMio — Sistema de Mantenimiento e Inventario de Máquinas

**Desarrollado por:** [GeoWay](https://geo-way.github.io)  
**Repositorio:** https://github.com/Geo-Way/SIM.io  
**Deploy:** [https://sim-io.onrender.com](https://sim-io.onrender.com)  
**Licencia:** MIT

SIMio es un sistema web desarrollado para gestionar de forma eficiente el mantenimiento y el inventario de maquinaria en entornos industriales. Su primera implementación se realizó en una fábrica de colchones, permitiendo digitalizar procesos técnicos clave, mejorar el seguimiento de mantenimientos y optimizar el control de piezas e inspecciones.

## 🚀 Funcionalidades principales

- 📍 Visor interactivo de planta con ubicación exacta de cada máquina.
- 🧾 Registro y consulta de mantenimientos por máquina, fecha, línea, técnico, síntomas y estado.
- 🧩 Inventario técnico de piezas con información sobre proveedor, vida útil, estado y ubicación.
- 📸 Carga de imágenes y documentación técnica (manuales en PDF, fotos de inspección).
- 🔒 Control de acceso por roles: administrador, técnico y visualizador (viewer).
- 📊 Filtros, exportaciones e informes para análisis operativo.

## 🖥️ Tecnologías utilizadas

| Categoría       | Herramientas                        |
|----------------|-------------------------------------|
| Frontend       | HTML5, Tailwind CSS, JavaScript     |
| Backend        | Node.js + Express                   |
| Base de datos  | PostgreSQL (Render)                 |
| Visualización  | Leaflet.js (CRS.Simple)             |
| Autenticación  | LocalStorage + express-session      |
| Hosting        | Render (backend), GitHub Pages (frontend) |

## 📂 Estructura del repositorio

```bash
public/
├── index.html             # Página de inicio / login
├── inventario.html        # Módulo de piezas e inventario
├── mantenimiento.html     # Módulo de registro de mantenimientos
├── maquinas.html          # Visor de layout de máquinas
├── info.html              # Página de documentación
├── img/                   # Layout y otros recursos visuales
server/
├── index.js               # Backend (Express.js)
├── db/                    # Scripts de base de datos y conexión
...
```

## 📘 Guía de uso y edición

Para agregar nuevas máquinas al visor y vincular sus manuales PDF:

👉 Consulta el siguiente [tutorial paso a paso en PDF](./tutorial_edicion_maquinas_html_actualizado.pdf)

## 🤝 Contribuciones y contacto

Este proyecto es mantenido por **GeoWay**, una iniciativa tecnológica basada en geoinformación y soluciones abiertas.  
Si deseas colaborar, mejorar el sistema o replicarlo en otro entorno industrial, ¡no dudes en contactarnos!

🌐 [Sitio web de GeoWay](https://geo-way.github.io/GeoWay.io/index.html)  
📧 [Contáctanos](mailto:geoway.info@gmail.com)

## 📝 Licencia

Este software se distribuye bajo la [Licencia MIT](LICENSE).
