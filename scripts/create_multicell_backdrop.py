"""
Create a visual-only multicell vascular backdrop GLB.

Run from the project root with:

Windows / Blender 5.1 example:
"C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe" --background --python .\\scripts\\create_multicell_backdrop.py

Output:
public/assets/multicell_backdrop.glb

Scientific note:
This asset is decorative and schematic only. It is not a reconstructed islet,
not anatomically calibrated, and not a secretion model. The Three.js application
continues to drive polarity calculations, vascular contact overlays, selected-cell
highlighting, and release particles.
"""

from __future__ import annotations

import math
import random
from pathlib import Path

import bpy
from mathutils import Vector


RANDOM_SEED = 20260509
CELL_COUNT = 54
OUTPUT_RELATIVE_PATH = Path("public") / "assets" / "multicell_backdrop.glb"


def project_root() -> Path:
    return Path(__file__).resolve().parents[1]


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()

    for datablock_collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for item in list(datablock_collection):
            datablock_collection.remove(item)


def set_principled_input(material: bpy.types.Material, input_name: str, value) -> None:
    if not material.use_nodes:
        return

    node = material.node_tree.nodes.get("Principled BSDF")
    if node is None:
        return

    if input_name in node.inputs:
        node.inputs[input_name].default_value = value


def create_material(
    name: str,
    color: tuple[float, float, float],
    alpha: float,
    roughness: float = 0.75,
    metallic: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = (color[0], color[1], color[2], alpha)
    material.use_nodes = True

    set_principled_input(material, "Base Color", (color[0], color[1], color[2], alpha))
    set_principled_input(material, "Alpha", alpha)
    set_principled_input(material, "Roughness", roughness)
    set_principled_input(material, "Metallic", metallic)

    if hasattr(material, "blend_method"):
        material.blend_method = "BLEND"
    if hasattr(material, "use_screen_refraction"):
        material.use_screen_refraction = False
    if hasattr(material, "show_transparent_back"):
        material.show_transparent_back = True

    return material


def link_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for existing_collection in obj.users_collection:
        existing_collection.objects.unlink(obj)

    collection.objects.link(obj)


def create_collection(name: str) -> bpy.types.Collection:
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def convert_active_to_mesh(obj: bpy.types.Object) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    return bpy.context.view_layer.objects.active


def apply_transform(obj: bpy.types.Object, location: bool = False) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=location, rotation=True, scale=True)


def create_bezier_tube(
    name: str,
    points: list[Vector],
    radius: float,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 18
    curve.bevel_depth = radius
    curve.bevel_resolution = 6

    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)

    for bezier_point, point in zip(spline.bezier_points, points):
        bezier_point.co = point
        bezier_point.handle_left_type = "AUTO"
        bezier_point.handle_right_type = "AUTO"

    obj = bpy.data.objects.new(name, curve)
    collection.objects.link(obj)
    obj.data.materials.append(material)

    mesh_obj = convert_active_to_mesh(obj)
    mesh_obj.name = name
    mesh_obj.data.name = f"{name}_mesh"
    return mesh_obj


def make_capillary_paths() -> list[list[Vector]]:
    return [
        [
            Vector((-8.5, -2.8, -1.6)),
            Vector((-5.2, -1.0, 0.4)),
            Vector((-1.8, 0.8, 1.1)),
            Vector((2.2, 0.3, -0.4)),
            Vector((6.8, 1.8, 0.8)),
            Vector((9.2, 3.2, -0.7)),
        ],
        [
            Vector((-6.4, 2.7, 1.7)),
            Vector((-3.6, 1.5, 0.2)),
            Vector((-0.5, 0.7, -1.2)),
            Vector((2.6, 1.0, -0.8)),
            Vector((5.8, 2.7, 1.1)),
        ],
        [
            Vector((-2.4, -5.1, 0.7)),
            Vector((-1.3, -2.3, 0.4)),
            Vector((0.4, -0.2, -0.6)),
            Vector((1.9, 2.0, 0.2)),
            Vector((3.0, 4.8, 0.9)),
        ],
        [
            Vector((4.7, -3.9, -1.5)),
            Vector((2.6, -2.1, -0.2)),
            Vector((1.0, -0.5, 0.9)),
            Vector((-1.0, 1.3, 1.0)),
            Vector((-3.4, 3.7, -0.4)),
        ],
    ]


def sample_polyline(points: list[Vector], t: float) -> Vector:
    if t <= 0:
        return points[0].copy()
    if t >= 1:
        return points[-1].copy()

    segment_count = len(points) - 1
    scaled = t * segment_count
    index = min(int(math.floor(scaled)), segment_count - 1)
    local_t = scaled - index

    return points[index].lerp(points[index + 1], local_t)


def random_unit_vector() -> Vector:
    z = random.uniform(-1.0, 1.0)
    theta = random.uniform(0.0, math.tau)
    r = math.sqrt(max(0.0, 1.0 - z * z))
    return Vector((r * math.cos(theta), r * math.sin(theta), z))


def create_irregular_cell(
    name: str,
    location: Vector,
    radii: Vector,
    material: bpy.types.Material,
    collection: bpy.types.Collection,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=20,
        ring_count=10,
        radius=1.0,
        location=location,
        rotation=(
            random.uniform(-0.35, 0.35),
            random.uniform(-0.35, 0.35),
            random.uniform(-math.pi, math.pi),
        ),
    )

    obj = bpy.context.object
    obj.name = name
    obj.data.name = f"{name}_mesh"
    obj.scale = radii

    for vertex in obj.data.vertices:
        jitter = 1.0 + random.uniform(-0.045, 0.045)
        vertex.co *= jitter

    obj.data.materials.append(material)
    apply_transform(obj, location=False)
    link_to_collection(obj, collection)

    return obj


def create_tissue_boundary(
    collection: bpy.types.Collection,
    material: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=32,
        ring_count=16,
        radius=1.0,
        location=(0.4, 0.2, 0.0),
    )

    obj = bpy.context.object
    obj.name = "soft_tissue_boundary"
    obj.data.name = "soft_tissue_boundary_mesh"
    obj.scale = (11.4, 7.7, 4.7)
    obj.data.materials.append(material)

    apply_transform(obj, location=False)
    link_to_collection(obj, collection)
    return obj


def create_empty(name: str, location: tuple[float, float, float], collection: bpy.types.Collection) -> None:
    obj = bpy.data.objects.new(name, None)
    obj.empty_display_type = "SPHERE"
    obj.empty_display_size = 0.45
    obj.location = location
    collection.objects.link(obj)


def add_lighting_and_camera() -> None:
    bpy.ops.object.light_add(type="AREA", location=(0.0, -8.0, 8.0))
    key = bpy.context.object
    key.name = "preview_area_light"
    key.data.energy = 400
    key.data.size = 6

    bpy.ops.object.camera_add(location=(0.0, -17.5, 8.5), rotation=(math.radians(63), 0.0, 0.0))
    camera = bpy.context.object
    camera.name = "preview_camera"
    bpy.context.scene.camera = camera


def export_glb(output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format="GLB",
        use_selection=False,
        export_apply=True,
    )


def main() -> None:
    random.seed(RANDOM_SEED)
    clear_scene()

    collection = create_collection("multicell_backdrop")

    cell_material = create_material(
        "schematic_translucent_beta_cell_backdrop",
        (0.50, 0.74, 1.00),
        0.18,
        roughness=0.88,
    )
    vessel_material = create_material(
        "schematic_capillary_backdrop",
        (0.85, 0.12, 0.10),
        0.44,
        roughness=0.62,
    )
    tissue_material = create_material(
        "subtle_tissue_boundary_backdrop",
        (0.72, 0.80, 1.00),
        0.055,
        roughness=0.95,
    )

    capillary_paths = make_capillary_paths()
    for index, path in enumerate(capillary_paths):
        create_bezier_tube(
            name=f"capillary_backdrop_{index + 1:02d}",
            points=path,
            radius=0.23 if index == 0 else 0.18,
            material=vessel_material,
            collection=collection,
        )

    for index in range(CELL_COUNT):
        path = random.choice(capillary_paths)
        base = sample_polyline(path, random.random())

        offset_direction = random_unit_vector()
        offset_direction.z *= 0.55
        if offset_direction.length < 0.001:
            offset_direction = Vector((1.0, 0.0, 0.0))
        offset_direction.normalize()

        offset_distance = random.uniform(1.2, 4.8)
        location = base + offset_direction * offset_distance
        location.z += random.uniform(-1.7, 1.7)

        radii = Vector((
            random.uniform(0.95, 1.45),
            random.uniform(0.85, 1.32),
            random.uniform(0.78, 1.22),
        ))

        create_irregular_cell(
            name=f"beta_cell_backdrop_{index + 1:02d}",
            location=location,
            radii=radii,
            material=cell_material,
            collection=collection,
        )

    create_tissue_boundary(collection, tissue_material)

    create_empty("cluster_center", (0.0, 0.0, 0.0), collection)
    create_empty("capillary_reference", (0.0, 0.2, 0.0), collection)
    create_empty("vascular_region_marker", (2.8, 1.1, 0.2), collection)

    add_lighting_and_camera()

    output_path = project_root() / OUTPUT_RELATIVE_PATH
    export_glb(output_path)

    print(f"Exported visual-only multicell backdrop to: {output_path}")


if __name__ == "__main__":
    main()
