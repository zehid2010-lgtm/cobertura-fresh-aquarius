# Cobertura Fresh & Aquarius

Aplicación independiente para seguimiento de cobertura en Tucumán, rutas 40 a 45.

## Productos
- Cepita Fresh 1,5 L PET
- Cepita Fresh 3 L PET
- Aquarius 1,5 L PET
- Aquarius 2,25 L PET
- Aquarius 2,5 L Ret PET
- Aquarius 375 ml PET
- Aquarius 500 ml NR PET
- Aquarius 500 ml Ret

## Arquitectura
1. Power Automate recibe el Excel corporativo.
2. Office Script lee la hoja `CLIENTE` y devuelve los compradores por presentación.
3. Power Automate envía `repository_dispatch` con `event_type: update_fresh_aquarius`.
4. GitHub Actions actualiza `fresh-aquarius.json`.
5. GitHub Pages publica la aplicación.

La aplicación lee el JSON desde el mismo sitio de GitHub Pages y no cachea el archivo de datos.

## Estado inicial
El archivo actual contiene únicamente datos DEMO anónimos.

> Importante: este repositorio es público. No conectar datos reales de clientes hasta definir expresamente cómo se protegerán o si se acepta que esos datos queden públicamente accesibles.
