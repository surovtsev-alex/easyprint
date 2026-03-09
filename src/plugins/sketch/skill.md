# Sketch Plugin

Create 2D sketches on XY, XZ, or YZ planes.

## Tools

### sketch_start
Start a new sketch on a specified plane.
- `plane` (string, required): "XY", "XZ", or "YZ"

### sketch_add_line
Add a line to the current sketch.
- `x1` (number): Start X coordinate in mm
- `y1` (number): Start Y coordinate in mm
- `x2` (number): End X coordinate in mm
- `y2` (number): End Y coordinate in mm

### sketch_add_rectangle
Add a rectangle to the current sketch.
- `x` (number): Origin X in mm
- `y` (number): Origin Y in mm
- `width` (number): Width in mm
- `height` (number): Height in mm

### sketch_add_circle
Add a circle to the current sketch.
- `cx` (number): Center X in mm
- `cy` (number): Center Y in mm
- `radius` (number): Radius in mm

### sketch_finish
Finish and close the current sketch. Detects closed profiles automatically.
