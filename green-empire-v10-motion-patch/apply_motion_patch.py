from pathlib import Path
import re, shutil

repo = Path.cwd()
p = repo / 'green-empire-v10-safe/buildsrc/Green_Empire_Europe_v1.0_Complete'
patch = repo / 'green-empire-v10-motion-patch'

if not p.is_dir():
    raise SystemExit(f'Project directory missing: {p}')


def one(path: Path, old: str, new: str) -> None:
    t = path.read_text(encoding='utf-8')
    c = t.count(old)
    if c != 1:
        raise SystemExit(f'{path}: expected 1 match for {old!r}, got {c}')
    path.write_text(t.replace(old, new, 1), encoding='utf-8')

shutil.copyfile(patch / 'logistics_manager.gd', p / 'scripts/logistics/logistics_manager.gd')
shutil.copyfile(patch / 'dynamic_logistics_map.gd', p / 'scripts/map/dynamic_logistics_map.gd')

gs = p / 'scripts/game_state.gd'
fixes = [
('    var quality_factor := [0.0, 1.0, 1.28, 1.62, 2.05, 2.55][clampi(quality, 1, 5)]','    var quality_factor: float = float([0.0, 1.0, 1.28, 1.62, 2.05, 2.55][clampi(quality, 1, 5)])'),
('    var event_discount := temporary_supplier_discount if GameClock.total_game_minutes < temporary_supplier_discount_until else 0.0','    var event_discount: float = temporary_supplier_discount if GameClock.total_game_minutes < temporary_supplier_discount_until else 0.0'),
('    var buyer_discount := _effect_value("buyer") + _research_effect("supplier_discount") + event_discount','    var buyer_discount: float = _effect_value("buyer") + _research_effect("supplier_discount") + event_discount'),
('    var unit_price := float(product.get("base_buy_per_kg", 1500.0)) * float(supplier.get("price_factor", 1.0)) * quality_factor * (1.0 - clampf(buyer_discount, 0.0, 0.25))','    var unit_price: float = float(product.get("base_buy_per_kg", 1500.0)) * float(supplier.get("price_factor", 1.0)) * quality_factor * (1.0 - clampf(buyer_discount, 0.0, 0.25))'),
('    var purchase_cost := unit_price * kg','    var purchase_cost: float = unit_price * kg'),
('    var transport_cost := float(logistics["transport_cost"])','    var transport_cost: float = float(logistics["transport_cost"])'),
('    var total := purchase_cost + transport_cost','    var total: float = purchase_cost + transport_cost'),
('    var q_factor := [0.0, 0.82, 1.0, 1.23, 1.52, 1.88][clampi(quality, 1, 5)]','    var q_factor: float = float([0.0, 0.82, 1.0, 1.23, 1.52, 1.88][clampi(quality, 1, 5)])'),
('    var saturation_penalty := 1.0 - clampf(float(market.get("saturation", 0.0)), 0.0, 0.45)','    var saturation_penalty: float = 1.0 - clampf(float(market.get("saturation", 0.0)), 0.0, 0.45)'),
('    var sales_bonus := _effect_value("sales") + _equipment_effect("sales") + _research_effect("market_bonus") + _effect_value("analyst") * 0.30','    var sales_bonus: float = _effect_value("sales") + _equipment_effect("sales") + _research_effect("market_bonus") + _effect_value("analyst") * 0.30'),
('    var quality_management := _effect_value("quality") + _equipment_effect("quality") + _research_effect("quality_bonus")','    var quality_management: float = _effect_value("quality") + _equipment_effect("quality") + _research_effect("quality_bonus")'),
('    var brand_bonus := clampf(brand_score / 500.0, 0.0, 0.12)','    var brand_bonus: float = clampf(brand_score / 500.0, 0.0, 0.12)'),
('    var management_bonus := clampf(quality_management * 0.35, 0.0, 0.10)','    var management_bonus: float = clampf(quality_management * 0.35, 0.0, 0.10)'),
('    var unit_price := float(product.get("base_sell_per_kg", 2200.0)) * q_factor * float(hub.get("market_demand", 1.0)) * float(market.get("demand_mod", 1.0)) * saturation_penalty * (1.0 + sales_bonus + brand_bonus + management_bonus)','    var unit_price: float = float(product.get("base_sell_per_kg", 2200.0)) * q_factor * float(hub.get("market_demand", 1.0)) * float(market.get("demand_mod", 1.0)) * saturation_penalty * (1.0 + sales_bonus + brand_bonus + management_bonus)')]
for a, b in fixes:
    one(gs, a, b)

app = p / 'scripts/ui/app_controller.gd'
t = app.read_text(encoding='utf-8')
pattern = re.compile(r'(?m)^(\s*)([A-Za-z_][A-Za-z0-9_]*)\.theme_override_constants\.separation\s*=\s*(.+)$')
count = 0
def fix_sep(m):
    global count
    count += 1
    return f'{m.group(1)}{m.group(2)}.add_theme_constant_override("separation", {m.group(3)})'
t = pattern.sub(fix_sep, t)
if count != 21:
    raise SystemExit(f'Expected 21 UI separation fixes, got {count}')

needle = '    LogisticsManager.shipments_changed.connect(_refresh_map_panel)\n    LogisticsManager.shipment_arrived.connect(_on_shipment_arrived)\n'
replacement = '    LogisticsManager.shipments_changed.connect(_refresh_map_panel)\n    LogisticsManager.shipment_event.connect(_on_shipment_event)\n    LogisticsManager.shipment_arrived.connect(_on_shipment_arrived)\n'
if needle not in t:
    raise SystemExit('shipment signal connection block not found')
t = t.replace(needle, replacement, 1)

old_btn = '            var btn := _button("%s  %s → %s\\n%d%% · ETA %dh%02d" % [String(row["id"]), String(row["origin_name"]), String(row["destination_name"]), pct, int(eta)/60, int(eta)%60], 56, true)'
new_btn = '            var status_text := _shipment_status_text(row)\n            var btn := _button("%s  %s → %s\\n%s · %d%% · ETA %dh%02d" % [String(row["id"]), String(row["origin_name"]), String(row["destination_name"]), status_text, pct, int(eta)/60, int(eta)%60], 62, true)'
if old_btn not in t:
    raise SystemExit('shipment active button block not found')
t = t.replace(old_btn, new_btn, 1)

start = t.index('func _shipment_detail_text() -> String:')
end = t.index('\nfunc _render_suppliers()', start)
status_block = '''func _shipment_status_text(shipment: Dictionary) -> String:\n    var status := String(shipment.get("status", "in_transit"))\n    if status == "road_check":\n        return "CONTRÔLE ROUTIER"\n    if status == "logistics_delay":\n        return "ARRÊT LOGISTIQUE"\n    if status == "arrived":\n        return "ARRIVÉE"\n    return "EN ROUTE"\n\nfunc _shipment_detail_text() -> String:\n    if selected_shipment_id == "":\n        return "Touchez un véhicule ou une expédition pour afficher ses informations."\n    var s := LogisticsManager.get_shipment(selected_shipment_id)\n    if s.is_empty():\n        return "Expédition terminée."\n    var eta := LogisticsManager.get_eta_minutes(selected_shipment_id)\n    var metadata: Dictionary = s.get("metadata", {})\n    var product_id := String(metadata.get("product_id", ""))\n    var product_name := String(GameState.products.get(product_id, {}).get("name", "Cargaison")) if product_id != "" else "Cargaison"\n    var event_detail := String(s.get("event_detail", ""))\n    var event_line := ""\n    if event_detail != "":\n        var remaining := maxf(0.0, float(s.get("event_until_game_minutes", GameClock.total_game_minutes)) - GameClock.total_game_minutes)\n        event_line = "\\nÉVÉNEMENT · %s\\n%s · reste %dh %02d" % [String(s.get("event_title", "")), event_detail, int(remaining)/60, int(remaining)%60]\n    var total_delay := float(s.get("total_delay_minutes", 0.0))\n    var delay_line := "" if total_delay < 1.0 else "\\nRetards cumulés · %dh %02d" % [int(total_delay)/60, int(total_delay)%60]\n    return "%s\\n%s → %s\\n%s · %.1f kg · Q%d\\n%s · %.0f km\\nSTATUT · %s\\nProgression %d%%\\nETA %dh %02d%s%s" % [\n        String(s.get("id", "")), String(s.get("origin_name", "")), String(s.get("destination_name", "")), product_name,\n        float(s.get("cargo_kg", 0.0)), int(s.get("quality", 1)), _mode_name(String(s.get("mode", "road"))), float(s.get("distance_km", 0.0)),\n        _shipment_status_text(s), int(round(float(s.get("progress", 0.0))*100.0)), int(eta)/60, int(eta)%60, event_line, delay_line]\n'''
t = t[:start] + status_block + t[end:]

arrival_marker = 'func _on_shipment_arrived(shipment_id: String) -> void:\n'
event_handler = '''func _on_shipment_event(shipment_id: String, _event_type: String, title: String, detail: String) -> void:\n    selected_shipment_id = shipment_id\n    if current_screen == "map":\n        _refresh_map_panel()\n    _show_toast(title, "%s · %s" % [shipment_id, detail], "warning")\n\n'''
if arrival_marker not in t:
    raise SystemExit('shipment arrival handler not found')
t = t.replace(arrival_marker, event_handler + arrival_marker, 1)
if 'theme_override_constants.' in t:
    raise SystemExit('Invalid direct theme override access remains')
app.write_text(t, encoding='utf-8')

proj = p / 'project.godot'
t = proj.read_text(encoding='utf-8')
if 'window/stretch/aspect=' in t:
    t = re.sub(r'(?m)^window/stretch/aspect=.*$', 'window/stretch/aspect="expand"', t)
else:
    t = t.replace('window/stretch/mode="canvas_items"\n', 'window/stretch/mode="canvas_items"\nwindow/stretch/aspect="expand"\n', 1)
if 'textures/vram_compression/import_etc2_astc=true' not in t:
    t = t.replace('[rendering]\n', '[rendering]\ntextures/vram_compression/import_etc2_astc=true\n', 1)
proj.write_text(t, encoding='utf-8')

scene = p / 'scenes/main.tscn'
t = scene.read_text(encoding='utf-8')
old = '''[node name="Background" type="ColorRect" parent="."]\noffset_right = 1280.0\noffset_bottom = 720.0\ncolor = Color(0.027, 0.075, 0.067, 1)\nmouse_filter = 2\n'''
new = '''[node name="Background" type="ColorRect" parent="."]\nlayout_mode = 1\nanchors_preset = 15\nanchor_right = 1.0\nanchor_bottom = 1.0\ngrow_horizontal = 2\ngrow_vertical = 2\ncolor = Color(0.027, 0.075, 0.067, 1)\nmouse_filter = 2\n'''
if old not in t:
    raise SystemExit('fixed Background block not found')
scene.write_text(t.replace(old, new, 1), encoding='utf-8')

ep = p / 'export_presets.cfg'
t = ep.read_text(encoding='utf-8')
t = t.replace('gradle_build/min_sdk="24"', 'gradle_build/min_sdk=""')
t = t.replace('launcher_icons/adaptive_foreground_432x432="res://assets/ui/icon.png"', 'launcher_icons/adaptive_foreground_432x432=""')
t = t.replace('launcher_icons/adaptive_background_432x432="res://assets/ui/icon.png"', 'launcher_icons/adaptive_background_432x432=""')
t = t.replace('package/signed=true', 'package/signed=false')
ep.write_text(t, encoding='utf-8')

smoke = p / 'tools/runtime_logistics_motion_smoke.gd'
smoke.write_text(r'''extends SceneTree

func _initialize() -> void:
    GameClock.set_paused(true)
    var packed := load("res://scenes/main.tscn") as PackedScene
    assert(packed != null)
    var main := packed.instantiate()
    root.add_child(main)
    await process_frame
    await process_frame
    assert(main.map_side_panel != null)
    assert(main.nav_panel != null)
    var map_world = main.get_node("MapWorld")
    assert(map_world != null)
    var tex_size: Vector2 = map_world.map_sprite.texture.get_size()
    var rendered: Vector2 = tex_size * map_world.map_sprite.scale
    assert(absf(rendered.x - 2400.0) < 1.0)
    assert(absf(rendered.y - 1600.0) < 1.0)

    LogisticsManager.import_state({"next_id": 1, "shipments": [], "completed": [], "stock_by_hub": {}})
    var shipment_id := LogisticsManager.create_shipment("tangier", "nantes", 5.0, "road", 1, {"kind":"smoke"})
    assert(shipment_id != "")
    var start: Dictionary = LogisticsManager.get_shipment(shipment_id)
    var start_pos := Vector2(float(start["current_lat"]), float(start["current_lon"]))
    var base_minutes := float(start["base_travel_minutes"])
    GameClock.advance_minutes(base_minutes * 0.10)
    var moving: Dictionary = LogisticsManager.get_shipment(shipment_id)
    assert(float(moving["progress"]) > 0.09)
    var moved_pos := Vector2(float(moving["current_lat"]), float(moving["current_lon"]))
    assert(moved_pos.distance_to(start_pos) > 0.01)

    LogisticsManager.delay_shipment(shipment_id, 0.05)
    var stopped: Dictionary = LogisticsManager.get_shipment(shipment_id)
    assert(String(stopped["status"]) == "logistics_delay")
    var stopped_progress := float(stopped["progress"])
    GameClock.advance_minutes(5.0)
    assert(absf(float(LogisticsManager.get_shipment(shipment_id)["progress"]) - stopped_progress) < 0.00001)

    var live: Dictionary = LogisticsManager.shipments[shipment_id]
    LogisticsManager.call("_start_stop_event", shipment_id, live, "road_check", "Contrôle routier", "Test runtime", 20.0, GameClock.total_game_minutes)
    var checked: Dictionary = LogisticsManager.get_shipment(shipment_id)
    assert(String(checked["status"]) == "road_check")
    assert(String(checked["event_title"]) == "Contrôle routier")
    var check_progress := float(checked["progress"])
    GameClock.advance_minutes(10.0)
    assert(absf(float(LogisticsManager.get_shipment(shipment_id)["progress"]) - check_progress) < 0.00001)
    GameClock.advance_minutes(12.0)
    var resumed: Dictionary = LogisticsManager.get_shipment(shipment_id)
    assert(String(resumed["status"]) == "in_transit")
    assert(float(resumed["progress"]) >= check_progress)
    assert(LogisticsManager.ROAD_CONTROL_CHANCE > 0.0)
    assert(LogisticsManager.ROAD_EVENT_CHECKPOINTS.size() >= 4)
    print("SMOKE_LIVE_LOGISTICS_OK progress=", resumed["progress"], " delays=", resumed["total_delay_minutes"])
    quit(0)
''', encoding='utf-8')

assert 'shipment_event.connect(_on_shipment_event)' in app.read_text(encoding='utf-8')
assert 'CONTRÔLE ROUTIER' in app.read_text(encoding='utf-8')
assert 'ROAD_CONTROL_CHANCE' in (p/'scripts/logistics/logistics_manager.gd').read_text(encoding='utf-8')
assert '_draw_route_motion_markers' in (p/'scripts/map/dynamic_logistics_map.gd').read_text(encoding='utf-8')
assert 'window/stretch/aspect="expand"' in proj.read_text(encoding='utf-8')
print('Applied live logistics movement, abstract road checks, responsive map/UI and Android compatibility patches.')
