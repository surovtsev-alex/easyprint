# Extrude Plugin

Create 3D bodies by extruding sketch profiles.

## Tools

### extrude_create
Extrude a sketch profile into a 3D body.
- `sketchId` (string, required): ID of the sketch containing the profile
- `profileId` (string, required): ID of the profile to extrude
- `distance` (number, required): Extrusion distance in mm (positive = forward, negative = backward)
- `name` (string, optional): Name for the created body
