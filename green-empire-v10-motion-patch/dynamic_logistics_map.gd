extends Node2D

signal shipment_selected(shipment_id: String)
signal hub_selected(hub_id: String)

const MAP_WIDTH := 2400.0
const MAP_HEIGHT := 1600.0
const MIN_LON := -15.0
const MAX_LON := 35.0
const MIN_LAT := 26.0
const MAX_LAT := 62.0

@onready var camera: Camera2D = $Camera2D
@onready var map_sprite: Sprite2D = $Map

var zoom_level: float = 0.72
var min_zoom: float = 0.55
var max_zoom: float = 3.8
var _touches: Dictionary = {}
var _previous_pinch_distance: float = 0.0
var _single_touch_dragged: bool = false
var selected_hub_id: String = ""

func _ready() -> void:
    _fit_map_texture_to_world()
    camera.position = Vector2(MAP_WIDTH * 0.5, MAP_HEIGHT * 0.5)
    _apply_zoom(zoom_level)
    LogisticsManager.shipments_changed.connect(_on_shipments_changed)
    LogisticsManager.shipment_positions_updated.connect(_on_shipment_positions_updated)
    queue_redraw()

func _fit_map_texture_to_world() -> void:
    if not is_instance_valid(map_sprite) or map_sprite.texture == null:
        return
    var texture_size: Vector2 = map_sprite.texture.get_size()
    if texture_size.x <= 0.0 or texture_size.y <= 0.0:
        return
    map_sprite.scale = Vector2(MAP_WIDTH / texture_size.x, MAP_HEIGHT / texture_size.y)

func _process(_delta: float) -> void:
    if not LogisticsManager.shipments.is_empty():
        queue_redraw()

func _draw() -> void:
    _draw_hubs()
    for shipment in LogisticsManager.get_active_shipments():
        _draw_shipment(shipment)

func _draw_hubs() -> void:
    var label_zoom_threshold := 0.95
    var supplier_hubs: Dictionary = {}
    if is_instance_valid(GameState):
        for supplier in GameState.suppliers.values():
            supplier_hubs[String((supplier as Dictionary).get("hub_id", ""))] = true
    for hub in LogisticsManager.hubs.values():
        var h: Dictionary = hub
        var hub_id := String(h["id"])
        var p := geo_to_map(float(h["lat"]), float(h["lon"]))
        var unlocked := not is_instance_valid(GameState) or GameState.level >= int(h.get("unlock_level", 1))
        var owned := is_instance_valid(GameState) and GameState.warehouses.has(hub_id)
        var supplier_here := supplier_hubs.has(hub_id)
        var outer := Color("53645e")
        if owned:
            outer = Color("72c995")
        elif supplier_here and unlocked:
            outer = Color("e4c553")
        elif unlocked:
            outer = Color("a2b2ac")
        else:
            outer = Color("4e5b56")
        var radius := 8.0 if owned else (6.5 if supplier_here else 5.5)
        draw_circle(p, radius, outer)
        draw_circle(p, 2.3, Color("08120f"))
        if hub_id == selected_hub_id:
            draw_arc(p, radius + 5.0, 0.0, TAU, 24, Color("f5dc75"), 2.0, true)
        if zoom_level >= label_zoom_threshold:
            var label_color := Color("e7ece9") if unlocked else Color("73817c")
            draw_string(ThemeDB.fallback_font, p + Vector2(10.0, -8.0), String(h["name"]), HORIZONTAL_ALIGNMENT_LEFT, -1, 16, label_color)

func _draw_shipment(shipment: Dictionary) -> void:
    var route: Array = shipment.get("route", [])
    var progress := float(shipment.get("progress", 0.0))
    if route.size() >= 2:
        var route_points := PackedVector2Array()
        for geo in route:
            var point: Vector2 = geo
            route_points.append(geo_to_map(point.x, point.y))
        draw_polyline(route_points, Color("60726c"), 3.0 / zoom_level, true)
        var active_count := clampi(int(round(float(route_points.size()) * progress)), 2, route_points.size())
        var active_points := PackedVector2Array()
        for i in range(active_count):
            active_points.append(route_points[i])
        if active_points.size() >= 2:
            draw_polyline(active_points, Color("f0d45a"), 5.5 / zoom_level, true)
        _draw_route_motion_markers(route_points, progress)

    var pos := geo_to_map(float(shipment["current_lat"]), float(shipment["current_lon"]))
    var heading := _route_heading(route, progress)
    var status := String(shipment.get("status", "in_transit"))
    _draw_vehicle(pos, String(shipment["mode"]), heading, status)
    _draw_shipment_badge(pos, shipment)

func _draw_route_motion_markers(route_points: PackedVector2Array, progress: float) -> void:
    if route_points.size() < 3 or progress <= 0.0:
        return
    var pulse := fmod(float(Time.get_ticks_msec()) / 700.0, 1.0)
    var max_index := clampi(int(floor(progress * float(route_points.size() - 1))), 1, route_points.size() - 1)
    for offset in range(3):
        var sample_progress := clampf(progress - 0.018 * float(offset + 1) - pulse * 0.006, 0.0, progress)
        var idx := clampi(int(round(sample_progress * float(route_points.size() - 1))), 0, max_index)
        draw_circle(route_points[idx], (4.5 - float(offset)) / zoom_level, Color(0.94, 0.83, 0.35, 0.55 - float(offset) * 0.12))

func _route_heading(route: Array, progress: float) -> float:
    if route.size() < 2:
        return 0.0
    var scaled := clampf(progress, 0.0, 0.9999) * float(route.size() - 1)
    var i := clampi(int(floor(scaled)), 0, route.size() - 2)
    var a: Vector2 = route[i]
    var b: Vector2 = route[i + 1]
    var pa := geo_to_map(a.x, a.y)
    var pb := geo_to_map(b.x, b.y)
    return (pb - pa).angle()

func _draw_vehicle(pos: Vector2, mode: String, heading: float, status: String) -> void:
    var scale_factor := clampf(1.0 / zoom_level, 0.72, 1.6)
    var stopped := status == "road_check" or status == "logistics_delay"
    var body_color := Color("ee785f") if stopped else Color("f0d45a")
    var transform := Transform2D(heading, pos)
    if mode == "air":
        var s := 18.0 * scale_factor
        var tri_local := PackedVector2Array([Vector2(s, 0), Vector2(-s * 0.65, -s * 0.65), Vector2(-s * 0.25, 0), Vector2(-s * 0.65, s * 0.65)])
        var tri := PackedVector2Array()
        for point in tri_local:
            tri.append(transform * point)
        draw_colored_polygon(tri, body_color)
        draw_polyline(PackedVector2Array([tri[0], tri[1], tri[2], tri[3], tri[0]]), Color("18211e"), 2.4 / zoom_level)
    elif mode == "sea":
        var s := 17.0 * scale_factor
        var boat_local := PackedVector2Array([Vector2(s, 0), Vector2(-s * 0.65, -s * 0.7), Vector2(-s, 0), Vector2(-s * 0.65, s * 0.7)])
        var boat := PackedVector2Array()
        for point in boat_local:
            boat.append(transform * point)
        draw_colored_polygon(boat, body_color)
        draw_polyline(PackedVector2Array([boat[0], boat[1], boat[2], boat[3], boat[0]]), Color("18211e"), 2.4 / zoom_level)
    else:
        var s := 16.0 * scale_factor
        var body_center := transform * Vector2.ZERO
        var nose := transform * Vector2(s * 1.55, 0.0)
        var rear_top := transform * Vector2(-s * 1.15, -s * 0.7)
        var rear_bottom := transform * Vector2(-s * 1.15, s * 0.7)
        var front_top := transform * Vector2(s * 0.85, -s * 0.7)
        var front_bottom := transform * Vector2(s * 0.85, s * 0.7)
        var truck := PackedVector2Array([rear_top, front_top, nose, front_bottom, rear_bottom])
        draw_colored_polygon(truck, body_color)
        draw_polyline(PackedVector2Array([rear_top, front_top, nose, front_bottom, rear_bottom, rear_top]), Color("18211e"), 2.4 / zoom_level)
        var wheel_offset := s * 0.78
        var wheel_radius := 4.8 * scale_factor
        draw_circle(transform * Vector2(-wheel_offset, -s * 0.7), wheel_radius, Color("17201d"))
        draw_circle(transform * Vector2(wheel_offset * 0.72, -s * 0.7), wheel_radius, Color("17201d"))
        draw_circle(body_center, 2.5 * scale_factor, Color("fff3a8"))

    if stopped:
        var pulse := 1.0 + 0.18 * sin(float(Time.get_ticks_msec()) / 150.0)
        draw_arc(pos, 28.0 * scale_factor * pulse, 0.0, TAU, 32, Color("f08b72"), 4.0 / zoom_level, true)
        draw_line(pos + Vector2(-20, -20) / zoom_level, pos + Vector2(20, 20) / zoom_level, Color("f08b72"), 3.0 / zoom_level, true)
        draw_line(pos + Vector2(20, -20) / zoom_level, pos + Vector2(-20, 20) / zoom_level, Color("f08b72"), 3.0 / zoom_level, true)

func _draw_shipment_badge(pos: Vector2, shipment: Dictionary) -> void:
    var status := String(shipment.get("status", "in_transit"))
    var pct := int(round(float(shipment.get("progress", 0.0)) * 100.0))
    var label := "%s · %d%%" % [String(shipment.get("id", "")), pct]
    var color := Color("f08b72") if status == "road_check" or status == "logistics_delay" else Color("f5e6a0")
    if status == "road_check":
        label = "CONTRÔLE · " + label
    elif status == "logistics_delay":
        label = "ARRÊT · " + label
    draw_string(ThemeDB.fallback_font, pos + Vector2(24.0, -22.0) / zoom_level, label, HORIZONTAL_ALIGNMENT_LEFT, -1, int(round(15.0 / zoom_level)), color)

func geo_to_map(lat: float, lon: float) -> Vector2:
    var x := inverse_lerp(MIN_LON, MAX_LON, lon) * MAP_WIDTH
    var y := (1.0 - inverse_lerp(MIN_LAT, MAX_LAT, lat)) * MAP_HEIGHT
    return Vector2(x, y)

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventMouseButton:
        _handle_mouse_button(event)
    elif event is InputEventMouseMotion and event.button_mask & MOUSE_BUTTON_MASK_LEFT:
        _pan_by_screen_delta(event.relative)
    elif event is InputEventScreenTouch:
        _handle_screen_touch(event)
    elif event is InputEventScreenDrag:
        _handle_screen_drag(event)

func _handle_mouse_button(event: InputEventMouseButton) -> void:
    if event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
        _zoom_at_screen_point(zoom_level * 1.14, event.position)
        get_viewport().set_input_as_handled()
    elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
        _zoom_at_screen_point(zoom_level / 1.14, event.position)
        get_viewport().set_input_as_handled()
    elif event.button_index == MOUSE_BUTTON_LEFT and not event.pressed:
        _select_entity_near(get_global_mouse_position())

func _handle_screen_touch(event: InputEventScreenTouch) -> void:
    if event.pressed:
        _touches[event.index] = event.position
        if _touches.size() == 1:
            _single_touch_dragged = false
        elif _touches.size() == 2:
            _previous_pinch_distance = _current_pinch_distance()
    else:
        if _touches.has(event.index):
            _touches.erase(event.index)
        if _touches.is_empty() and not _single_touch_dragged:
            var map_pos := _screen_to_map(event.position)
            _select_entity_near(map_pos)
        _previous_pinch_distance = 0.0

func _handle_screen_drag(event: InputEventScreenDrag) -> void:
    _touches[event.index] = event.position
    if _touches.size() == 1:
        _single_touch_dragged = true
        _pan_by_screen_delta(event.relative)
    elif _touches.size() >= 2:
        _single_touch_dragged = true
        var distance := _current_pinch_distance()
        if _previous_pinch_distance > 1.0 and distance > 1.0:
            var ratio := distance / _previous_pinch_distance
            _zoom_at_screen_point(zoom_level * ratio, _pinch_center())
        _previous_pinch_distance = distance
    get_viewport().set_input_as_handled()

func _current_pinch_distance() -> float:
    if _touches.size() < 2:
        return 0.0
    var keys := _touches.keys()
    return (_touches[keys[0]] as Vector2).distance_to(_touches[keys[1]] as Vector2)

func _pinch_center() -> Vector2:
    var keys := _touches.keys()
    if keys.size() < 2:
        return get_viewport_rect().size * 0.5
    return ((_touches[keys[0]] as Vector2) + (_touches[keys[1]] as Vector2)) * 0.5

func _pan_by_screen_delta(delta: Vector2) -> void:
    camera.position -= delta / zoom_level
    _clamp_camera()

func _zoom_at_screen_point(target_zoom: float, screen_point: Vector2) -> void:
    var before := _screen_to_map(screen_point)
    _apply_zoom(target_zoom)
    var after := _screen_to_map(screen_point)
    camera.position += before - after
    _clamp_camera()

func _apply_zoom(value: float) -> void:
    zoom_level = clampf(value, min_zoom, max_zoom)
    camera.zoom = Vector2.ONE * zoom_level
    _clamp_camera()
    queue_redraw()

func _screen_to_map(screen_point: Vector2) -> Vector2:
    var viewport_size := get_viewport_rect().size
    return camera.position + (screen_point - viewport_size * 0.5) / zoom_level

func _clamp_camera() -> void:
    var viewport_size := get_viewport_rect().size
    var half := viewport_size * 0.5 / zoom_level
    if half.x * 2.0 >= MAP_WIDTH:
        camera.position.x = MAP_WIDTH * 0.5
    else:
        camera.position.x = clampf(camera.position.x, half.x, MAP_WIDTH - half.x)
    if half.y * 2.0 >= MAP_HEIGHT:
        camera.position.y = MAP_HEIGHT * 0.5
    else:
        camera.position.y = clampf(camera.position.y, half.y, MAP_HEIGHT - half.y)

func _select_entity_near(map_position: Vector2) -> void:
    var shipment_hit_radius := 34.0 / zoom_level
    var nearest_id := ""
    var nearest_distance := INF
    for shipment in LogisticsManager.get_active_shipments():
        var p := geo_to_map(float(shipment["current_lat"]), float(shipment["current_lon"]))
        var distance := p.distance_to(map_position)
        if distance < shipment_hit_radius and distance < nearest_distance:
            nearest_distance = distance
            nearest_id = String(shipment["id"])
    if nearest_id != "":
        shipment_selected.emit(nearest_id)
        return

    var hub_hit_radius := 24.0 / zoom_level
    var nearest_hub := ""
    nearest_distance = INF
    for hub in LogisticsManager.hubs.values():
        var row: Dictionary = hub
        var p := geo_to_map(float(row["lat"]), float(row["lon"]))
        var distance := p.distance_to(map_position)
        if distance < hub_hit_radius and distance < nearest_distance:
            nearest_distance = distance
            nearest_hub = String(row["id"])
    if nearest_hub != "":
        selected_hub_id = nearest_hub
        hub_selected.emit(nearest_hub)
        queue_redraw()

func zoom_in() -> void:
    _zoom_at_screen_point(zoom_level * 1.22, get_viewport_rect().size * 0.5)

func zoom_out() -> void:
    _zoom_at_screen_point(zoom_level / 1.22, get_viewport_rect().size * 0.5)

func reset_view() -> void:
    _apply_zoom(0.72)
    camera.position = Vector2(MAP_WIDTH * 0.5, MAP_HEIGHT * 0.5)
    _clamp_camera()

func focus_hub(hub_id: String, target_zoom: float = 1.35) -> void:
    if not LogisticsManager.hubs.has(hub_id):
        return
    var hub: Dictionary = LogisticsManager.hubs[hub_id]
    selected_hub_id = hub_id
    _apply_zoom(target_zoom)
    camera.position = geo_to_map(float(hub["lat"]), float(hub["lon"]))
    _clamp_camera()
    queue_redraw()

func _on_shipments_changed() -> void:
    queue_redraw()

func _on_shipment_positions_updated() -> void:
    queue_redraw()
