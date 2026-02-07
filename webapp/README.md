# WebApp de Administración - OneMachine ControlBox

## Descripción

Panel de administración web para gestionar la plataforma IoT de control de acceso eléctrico.

## Características

- **Dashboard**: Métricas en tiempo real, gráficos de uso, eventos recientes
- **Logs**: Historial de accesos con filtros por fecha, dispositivo y tipo
- **Usuarios**: CRUD completo, gestión de tokens
- **Dispositivos**: Alta, edición, activación/desactivación
- **Configuración**: URL del backend

## Uso

### Opción 1: Abrir directamente
1. Abrir `index.html` en un navegador moderno
2. Ir a **Configuración**
3. Ingresar la URL del Google Apps Script
4. Guardar

### Opción 2: Servidor local
```bash
# Con Python 3
python -m http.server 8080

# O con Node.js
npx serve .
```

Luego abrir http://localhost:8080

## Configuración del Backend

1. Ir a la pestaña **Configuración**
2. Pegar la URL del Google Apps Script desplegado:
   ```
   https://script.google.com/macros/s/XXXXXX/exec
   ```
3. Hacer clic en **Guardar Configuración**

## Diseño UI

La interfaz está inspirada en diseño moderno con:
- Paleta amarillo/negro/blanco
- Cards con bordes redondeados
- Animaciones suaves
- Diseño responsivo
