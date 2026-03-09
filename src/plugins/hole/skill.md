# Hole Plugin

Create holes (cylindrical cutouts) in existing bodies using CSG subtraction.

## Tools

### hole_create
Create a cylindrical hole in a body.
- `bodyId` (string, required): ID of the body to create hole in
- `x` (number, required): X position in mm
- `y` (number, required): Y position in mm
- `z` (number, required): Z position in mm
- `radius` (number, required): Hole radius in mm
- `depth` (number, required): Hole depth in mm
- `direction` (string, optional): "x", "y", or "z" (default: "y")
