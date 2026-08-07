extends SceneTree

func _initialize() -> void:
    var clock: Node = root.get_node("GameClock")
    var logistics: Node = root.get_node("LogisticsManager")
    assert(clock != null)
    assert(logistics != null)
    clock.call("set_paused", true)

    var packed := load("res://scenes/main.tscn") as PackedScene
    assert(packed != null)
    var main: Node = packed.instantiate()
    root.add_child(main)
    await process_frame
    await process_frame

    assert(main.get("map_side_panel") != null)
    assert(main.get("nav_panel") != null)
    var map_world: Node = main.get_node("MapWorld")
    var map_sprite = map_world.get("map_sprite")
    assert(map_sprite != null)
    var rendered: Vector2 = map_sprite.texture.get_size() * map_sprite.scale
    assert(absf(rendered.x - 2400.0) < 1.0)
    assert(absf(rendered.y - 1600.0) < 1.0)

    logistics.call("import_state", {"next_id": 1, "shipments": [], "completed": [], "stock_by_hub": {}})
    var hubs: Dictionary = logistics.get("hubs")
    var ids := hubs.keys()
    ids.sort()
    assert(ids.size() >= 2)
    var origin_id := String(ids[0])
    var destination_id := String(ids[1])

    var shipment_id := String(logistics.call("create_shipment", origin_id, destination_id, 5.0, "road", 1, {"kind":"runtime_smoke"}))
    assert(shipment_id != "")
    var start: Dictionary = logistics.call("get_shipment", shipment_id)
    var start_pos := Vector2(float(start["current_lat"]), float(start["current_lon"]))
    var base_minutes := float(start["base_travel_minutes"])

    clock.call("advance_minutes", base_minutes * 0.10)
    var moving: Dictionary = logistics.call("get_shipment", shipment_id)
    assert(float(moving["progress"]) > 0.09)
    var moved_pos := Vector2(float(moving["current_lat"]), float(moving["current_lon"]))
    assert(moved_pos.distance_to(start_pos) > 0.001)

    logistics.call("delay_shipment", shipment_id, 0.05)
    var stopped: Dictionary = logistics.call("get_shipment", shipment_id)
    assert(String(stopped["status"]) == "logistics_delay")
    var stopped_progress := float(stopped["progress"])
    clock.call("advance_minutes", 5.0)
    var still_stopped: Dictionary = logistics.call("get_shipment", shipment_id)
    assert(absf(float(still_stopped["progress"]) - stopped_progress) < 0.00001)

    var shipment_table: Dictionary = logistics.get("shipments")
    var live: Dictionary = shipment_table[shipment_id]
    logistics.call("_start_stop_event", shipment_id, live, "road_check", "Contrôle routier", "Événement de simulation", 20.0, float(clock.get("total_game_minutes")))
    var checked: Dictionary = logistics.call("get_shipment", shipment_id)
    assert(String(checked["status"]) == "road_check")
    var check_progress := float(checked["progress"])

    clock.call("advance_minutes", 10.0)
    var check_still: Dictionary = logistics.call("get_shipment", shipment_id)
    assert(absf(float(check_still["progress"]) - check_progress) < 0.00001)

    clock.call("advance_minutes", 12.0)
    var resumed: Dictionary = logistics.call("get_shipment", shipment_id)
    assert(String(resumed["status"]) == "in_transit")
    assert(float(resumed["progress"]) >= check_progress)

    print("SMOKE_LIVE_LOGISTICS_OK progress=", resumed["progress"], " delays=", resumed["total_delay_minutes"])
    quit(0)
