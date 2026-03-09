# STL Export Plugin

Export selected 3D body as an STL file for 3D printing.

## Tools

### stl-export_export
Export a body as an STL file (triggers download).
- `bodyId` (string, required): ID of the body to export
- `filename` (string, optional): Name for the STL file (default: body name)
- `binary` (boolean, optional): Use binary STL format (default: true)
