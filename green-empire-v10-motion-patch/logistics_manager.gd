extends Node

signal shipments_changed
signal shipment_created(shipment_id: String)
signal shipment_updated(shipment_id: String)
signal shipment_positions_updated
signal shipment_event(shipment_id: String, event_type: String, title: String, detail: String)
signal shipment_arrived(shipment_id: String)
signal shipment_completed(shipment: Dictionary)
signal cargo_delivered(destination_id: String, cargo_kg: float, quality: int, shipment_id: String)

const HUBS_PATH := "res://data/hubs.json"
const TUNING_PATH := "res://data/logistics_tuning.json"
const ROAD_EVENT_CHECKPOINTS := [0.16, 0.34, 0.54, 0.73, 0.89]
const ROAD_CONTROL_CHANCE := 0.24
const ROAD_DELAY_MINUTES_MIN := 35.0
const ROAD_DELAY_MINUTES_MAX := 150.0

var hubs: Dictionary = {}
var tuning: Dictionary = {}
var shipments: Dictionary = {}
var completed_shipments: Array[Dictionary] = []
var stock_by_hub: Dictionary = {}
var last_error: String = ""
var travel_time_multiplier: float = 1.0
var cost_multiplier: float = 1.0
var _next_id: int = 1

func _ready() -> void:
    _load_data()
    GameClock.time_changed.connect(_on_game_time_changed)

func _load_data() -> void:
    hubs.clear()
    var hubs_file := FileAccess.open(HUBS_PATH, FileAccess.READ)
    if hubs_file:
        var parsed = JSON.parse_string(hubs_file.get_as_text())
        if parsed is Array:
            for hub in parsed:
                if hub is Dictionary and hub.has("id"):
                    hubs[String(hub["id"])] = hub
    tuning.clear()
    var tuning_file := FileAccess.open(TUNING_PATH, FileAccess.READ)
    if tuning_file:
        var parsed_tuning = JSON.parse_string(tuning_file.get_as_text())
        if parsed_tuning is Dictionary:
            tuning = parsed_tuning

func set_modifiers(new_travel_time_multiplier: float, new_cost_multiplier: float) -> void:
    travel_time_multiplier = clampf(new_travel_time_multiplier, 0.55, 1.50)
    cost_multiplier = clampf(new_cost_multiplier, 0.60, 1.60)

func estimate_shipment(origin_id: String, destination_id: String, cargo_kg: float, mode: String = "road") -> Dictionary:
    last_error = ""
    if origin_id == destination_id:
        last_error = "Origine et destination identiques."
        return {}
    if not hubs.has(origin_id) or not hubs.has(destination_id):
        last_error = "Hub inconnu."
        return {}
    if not tuning.has(mode):
        last_error = "Mode de transport inconnu."
        return {}
    if cargo_kg <= 0.0:
        last_error = "Quantité invalide."
        return {}
    var profile: Dictionary = tuning[mode]
    var capacity := float(profile.get("capacity_kg", 0.0))
    if capacity > 0.0 and cargo_kg > capacity:
        last_error = "Capacité dépassée pour ce mode de transport."
        return {}
    var origin: Dictionary = hubs[origin_id]
    var destination: Dictionary = hubs[destination_id]
    var distance_km := _haversine_km(float(origin["lat"]), float(origin["lon"]), float(destination["lat"]), float(destination["lon"]))
    var network_factor := 1.0
    if mode == "road":
        network_factor = 1.18
    elif mode == "sea":
        network_factor = 1.08
    var routed_distance := distance_km * network_factor
    var speed_kmh := maxf(1.0, float(profile.get("speed_kmh", 50.0)))
    var handling_hours := maxf(0.0, float(profile.get("handling_hours", 0.0)))
    var travel_hours := (routed_distance / speed_kmh + handling_hours) * travel_time_multiplier
    var travel_minutes := maxf(60.0, travel_hours * 60.0)
    var base_cost := float(profile.get("base_cost", 0.0))
    var variable_cost := routed_distance * cargo_kg * float(profile.get("cost_per_km_kg", 0.0))
    var transport_cost := maxf(0.0, (base_cost + variable_cost) * cost_multiplier)
    return {
        "distance_km": routed_distance,
        "travel_minutes": travel_minutes,
        "travel_hours": travel_minutes / 60.0,
        "transport_cost": transport_cost,
        "capacity_kg": capacity,
        "reliability": float(profile.get("reliability", 1.0))
    }

func create_shipment(origin_id: String, destination_id: String, cargo_kg: float, mode: String = "road", quality: int = 1, metadata: Dictionary = {}) -> String:
    var estimate := estimate_shipment(origin_id, destination_id, cargo_kg, mode)
    if estimate.is_empty():
        return ""
    var origin: Dictionary = hubs[origin_id]
    var destination: Dictionary = hubs[destination_id]
    var shipment_id := "EXP-%05d" % _next_id
    _next_id += 1
    var now := GameClock.total_game_minutes
    var travel_minutes := float(estimate["travel_minutes"])
    var route := _build_dynamic_route(origin, destination, shipment_id, mode)
    shipments[shipment_id] = {
        "id": shipment_id,
        "origin_id": origin_id,
        "destination_id": destination_id,
        "origin_name": String(origin["name"]),
        "destination_name": String(destination["name"]),
        "mode": mode,
        "cargo_kg": maxf(0.01, cargo_kg),
        "quality": clampi(quality, 1, 5),
        "status": "in_transit",
        "created_game_minutes": now,
        "departure_game_minutes": now,
        "arrival_game_minutes": now + travel_minutes,
        "travel_minutes": travel_minutes,
        "base_travel_minutes": travel_minutes,
        "movement_game_minutes": 0.0,
        "last_update_game_minutes": now,
        "total_delay_minutes": 0.0,
        "event_until_game_minutes": 0.0,
        "event_type": "",
        "event_title": "",
        "event_detail": "",
        "event_log": [],
        "event_checkpoint_index": 0,
        "progress": 0.0,
        "route": route,
        "current_lat": float(origin["lat"]),
        "current_lon": float(origin["lon"]),
        "metadata": metadata.duplicate(true)
    }
    shipment_created.emit(shipment_id)
    shipments_changed.emit()
    return shipment_id

func delay_shipment(shipment_id: String, delay_fraction: float) -> void:
    if not shipments.has(shipment_id):
        return
    var shipment: Dictionary = shipments[shipment_id]
    var extra := maxf(15.0, float(shipment.get("base_travel_minutes", shipment.get("travel_minutes", 60.0))) * maxf(0.0, delay_fraction))
    _start_stop_event(shipment_id, shipment, "logistics_delay", "Retard logistique", "Le transport est momentanément immobilisé.", extra)

func _on_game_time_changed(now: float) -> void:
    var arrived: Array[String] = []
    var any_position_change := false
    for shipment_id in shipments.keys():
        var shipment: Dictionary = shipments[shipment_id]
        var status := String(shipment.get("status", "in_transit"))
        var last_update := float(shipment.get("last_update_game_minutes", now))
        var delta_game := maxf(0.0, now - last_update)
        shipment["last_update_game_minutes"] = now

        if status == "road_check" or status == "logistics_delay":
            var event_until := float(shipment.get("event_until_game_minutes", now))
            if now >= event_until:
                shipment["status"] = "in_transit"
                shipment["event_type"] = ""
                shipment["event_title"] = ""
                shipment["event_detail"] = ""
                shipment_updated.emit(String(shipment_id))
                shipments_changed.emit()
                var movable_after_pause := maxf(0.0, now - maxf(last_update, event_until))
                _advance_shipment_motion(shipment, movable_after_pause)
                any_position_change = any_position_change or movable_after_pause > 0.0
            else:
                _refresh_eta(shipment, now)
        else:
            _advance_shipment_motion(shipment, delta_game)
            any_position_change = any_position_change or delta_game > 0.0

        _maybe_trigger_route_event(String(shipment_id), shipment, now)
        _refresh_eta(shipment, now)
        shipments[shipment_id] = shipment
        if float(shipment.get("progress", 0.0)) >= 1.0:
            arrived.append(String(shipment_id))

    for shipment_id in arrived:
        _complete_shipment(shipment_id)
    if any_position_change:
        shipment_positions_updated.emit()

func _advance_shipment_motion(shipment: Dictionary, delta_game: float) -> void:
    if delta_game <= 0.0:
        return
    var base_minutes := maxf(1.0, float(shipment.get("base_travel_minutes", shipment.get("travel_minutes", 60.0))))
    var moved := minf(base_minutes, float(shipment.get("movement_game_minutes", 0.0)) + delta_game)
    shipment["movement_game_minutes"] = moved
    var progress := clampf(moved / base_minutes, 0.0, 1.0)
    shipment["progress"] = progress
    var geo := _position_on_route(shipment.get("route", []), progress)
    shipment["current_lat"] = geo.x
    shipment["current_lon"] = geo.y

func _refresh_eta(shipment: Dictionary, now: float) -> void:
    var base_minutes := maxf(1.0, float(shipment.get("base_travel_minutes", shipment.get("travel_minutes", 60.0))))
    var movement_done := clampf(float(shipment.get("movement_game_minutes", 0.0)), 0.0, base_minutes)
    var remaining := maxf(0.0, base_minutes - movement_done)
    var status := String(shipment.get("status", "in_transit"))
    if status == "road_check" or status == "logistics_delay":
        remaining += maxf(0.0, float(shipment.get("event_until_game_minutes", now)) - now)
    shipment["arrival_game_minutes"] = now + remaining

func _maybe_trigger_route_event(shipment_id: String, shipment: Dictionary, now: float) -> void:
    if String(shipment.get("status", "")) != "in_transit":
        return
    if String(shipment.get("mode", "road")) != "road":
        return
    var checkpoint_index := int(shipment.get("event_checkpoint_index", 0))
    if checkpoint_index >= ROAD_EVENT_CHECKPOINTS.size():
        return
    var progress := float(shipment.get("progress", 0.0))
    if progress >= 0.995:
        return
    var threshold := float(ROAD_EVENT_CHECKPOINTS[checkpoint_index])
    if progress < threshold:
        return

    shipment["event_checkpoint_index"] = checkpoint_index + 1
    var rng := RandomNumberGenerator.new()
    rng.seed = absi((shipment_id + ":road-event:" + str(checkpoint_index)).hash())
    if rng.randf() > ROAD_CONTROL_CHANCE:
        return

    var delay_minutes := rng.randf_range(ROAD_DELAY_MINUTES_MIN, ROAD_DELAY_MINUTES_MAX)
    var title := "Contrôle routier"
    var detail := "Inspection aléatoire : véhicule immobilisé pendant %d min de jeu." % int(round(delay_minutes))
    _start_stop_event(shipment_id, shipment, "road_check", title, detail, delay_minutes, now)

func _start_stop_event(shipment_id: String, shipment: Dictionary, event_type: String, title: String, detail: String, delay_minutes: float, now_override: float = -1.0) -> void:
    var now := GameClock.total_game_minutes if now_override < 0.0 else now_override
    var duration := maxf(5.0, delay_minutes)
    shipment["status"] = event_type
    shipment["event_type"] = event_type
    shipment["event_title"] = title
    shipment["event_detail"] = detail
    shipment["event_until_game_minutes"] = now + duration
    shipment["total_delay_minutes"] = float(shipment.get("total_delay_minutes", 0.0)) + duration
    var log: Array = shipment.get("event_log", [])
    log.append({"time": now, "type": event_type, "title": title, "detail": detail, "duration": duration, "progress": float(shipment.get("progress", 0.0))})
    if log.size() > 16:
        log.pop_front()
    shipment["event_log"] = log
    _refresh_eta(shipment, now)
    shipments[shipment_id] = shipment
    shipment_event.emit(shipment_id, event_type, title, detail)
    shipment_updated.emit(shipment_id)
    shipments_changed.emit()

func _complete_shipment(shipment_id: String) -> void:
    if not shipments.has(shipment_id):
        return
    var shipment: Dictionary = shipments[shipment_id]
    shipment["status"] = "arrived"
    shipment["progress"] = 1.0
    var destination_id := String(shipment["destination_id"])
    var delivered_kg := float(shipment["cargo_kg"])
    stock_by_hub[destination_id] = float(stock_by_hub.get(destination_id, 0.0)) + delivered_kg
    completed_shipments.append(shipment.duplicate(true))
    if completed_shipments.size() > 250:
        completed_shipments.pop_front()
    shipments.erase(shipment_id)
    shipment_completed.emit(shipment.duplicate(true))
    cargo_delivered.emit(destination_id, delivered_kg, int(shipment["quality"]), shipment_id)
    shipment_arrived.emit(shipment_id)
    shipments_changed.emit()

func get_active_shipments() -> Array[Dictionary]:
    var result: Array[Dictionary] = []
    for shipment in shipments.values():
        result.append((shipment as Dictionary).duplicate(true))
    result.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
        return String(a["id"]) < String(b["id"])
    )
    return result

func get_shipment(shipment_id: String) -> Dictionary:
    if shipments.has(shipment_id):
        return (shipments[shipment_id] as Dictionary).duplicate(true)
    for item in completed_shipments:
        if String(item.get("id", "")) == shipment_id:
            return item.duplicate(true)
    return {}

func get_eta_minutes(shipment_id: String) -> float:
    if not shipments.has(shipment_id):
        return 0.0
    var shipment: Dictionary = shipments[shipment_id]
    return maxf(0.0, float(shipment.get("arrival_game_minutes", GameClock.total_game_minutes)) - GameClock.total_game_minutes)

func export_state() -> Dictionary:
    var shipment_rows: Array = []
    for shipment in shipments.values():
        shipment_rows.append(_serialize_shipment(shipment))
    var completed_rows: Array = []
    for shipment in completed_shipments:
        completed_rows.append(_serialize_shipment(shipment))
    return {
        "next_id": _next_id,
        "shipments": shipment_rows,
        "completed": completed_rows,
        "stock_by_hub": stock_by_hub.duplicate(true),
        "travel_time_multiplier": travel_time_multiplier,
        "cost_multiplier": cost_multiplier
    }

func import_state(data: Dictionary) -> void:
    shipments.clear()
    completed_shipments.clear()
    stock_by_hub = (data.get("stock_by_hub", {}) as Dictionary).duplicate(true)
    _next_id = maxi(1, int(data.get("next_id", 1)))
    travel_time_multiplier = float(data.get("travel_time_multiplier", 1.0))
    cost_multiplier = float(data.get("cost_multiplier", 1.0))
    for row in data.get("shipments", []):
        if row is Dictionary:
            var shipment := _deserialize_shipment(row)
            shipments[String(shipment.get("id", ""))] = shipment
    for row in data.get("completed", []):
        if row is Dictionary:
            completed_shipments.append(_deserialize_shipment(row))
    shipments_changed.emit()
    shipment_positions_updated.emit()

func _serialize_shipment(source: Dictionary) -> Dictionary:
    var row := source.duplicate(true)
    var encoded_route: Array = []
    for point in source.get("route", []):
        var p: Vector2 = point
        encoded_route.append([p.x, p.y])
    row["route"] = encoded_route
    return row

func _deserialize_shipment(source: Dictionary) -> Dictionary:
    var row := source.duplicate(true)
    var route: Array[Vector2] = []
    for point in source.get("route", []):
        if point is Array and point.size() >= 2:
            route.append(Vector2(float(point[0]), float(point[1])))
    row["route"] = route
    if not row.has("base_travel_minutes"):
        row["base_travel_minutes"] = float(row.get("travel_minutes", 60.0))
    if not row.has("movement_game_minutes"):
        row["movement_game_minutes"] = float(row.get("progress", 0.0)) * float(row["base_travel_minutes"])
    if not row.has("last_update_game_minutes"):
        row["last_update_game_minutes"] = GameClock.total_game_minutes
    if not row.has("event_checkpoint_index"):
        row["event_checkpoint_index"] = int(floor(float(row.get("progress", 0.0)) * float(ROAD_EVENT_CHECKPOINTS.size())))
    if not row.has("event_log"):
        row["event_log"] = []
    return row

func _build_dynamic_route(origin: Dictionary, destination: Dictionary, shipment_id: String, mode: String) -> Array[Vector2]:
    var a := Vector2(float(origin["lat"]), float(origin["lon"]))
    var b := Vector2(float(destination["lat"]), float(destination["lon"]))
    var anchors: Array[Vector2] = [a]
    var origin_africa := float(origin["lat"]) < 38.0
    var destination_africa := float(destination["lat"]) < 38.0
    if origin_africa != destination_africa and mode == "road":
        if origin_africa:
            anchors.append(Vector2(35.95, -5.62))
            anchors.append(Vector2(36.12, -5.35))
        else:
            anchors.append(Vector2(36.12, -5.35))
            anchors.append(Vector2(35.95, -5.62))
    anchors.append(b)
    var route: Array[Vector2] = []
    for segment_index in range(anchors.size() - 1):
        var segment := _bezier_segment(anchors[segment_index], anchors[segment_index + 1], shipment_id + str(segment_index), mode, 36)
        if segment_index > 0 and not segment.is_empty():
            segment.pop_front()
        route.append_array(segment)
    return route

func _bezier_segment(a: Vector2, b: Vector2, seed_text: String, mode: String, steps: int) -> Array[Vector2]:
    var points: Array[Vector2] = []
    var midpoint := (a + b) * 0.5
    var direction := b - a
    var perpendicular := Vector2(-direction.y, direction.x).normalized()
    var seed_value: int = absi(seed_text.hash() + mode.hash())
    var signed_amount := -1.0 if seed_value % 2 == 0 else 1.0
    var curvature := minf(1.4, direction.length() * 0.04) * signed_amount
    if mode == "air":
        curvature *= 1.8
    elif mode == "sea":
        curvature *= 1.25
    var control := midpoint + perpendicular * curvature
    for i in range(steps + 1):
        var t := float(i) / float(steps)
        var omt := 1.0 - t
        points.append(omt * omt * a + 2.0 * omt * t * control + t * t * b)
    return points

func _position_on_route(route: Array, progress: float) -> Vector2:
    if route.is_empty():
        return Vector2.ZERO
    if route.size() == 1:
        return route[0]
    var scaled := clampf(progress, 0.0, 1.0) * float(route.size() - 1)
    var i := mini(int(floor(scaled)), route.size() - 2)
    var local_t := scaled - float(i)
    var from_point: Vector2 = route[i]
    var to_point: Vector2 = route[i + 1]
    return from_point.lerp(to_point, local_t)

func _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    var earth_radius_km := 6371.0088
    var phi1 := deg_to_rad(lat1)
    var phi2 := deg_to_rad(lat2)
    var dphi := deg_to_rad(lat2 - lat1)
    var dlambda := deg_to_rad(lon2 - lon1)
    var value := sin(dphi * 0.5) * sin(dphi * 0.5) + cos(phi1) * cos(phi2) * sin(dlambda * 0.5) * sin(dlambda * 0.5)
    var c := 2.0 * atan2(sqrt(value), sqrt(maxf(0.0, 1.0 - value)))
    return earth_radius_km * c
