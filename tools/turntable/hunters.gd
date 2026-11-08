extends Node
## Local website tooling (not part of the game): a Hunter's in-game model on a display stand, as a turntable.
const ART := {"gunslinger": "vex", "juggernaut": "kael", "archer": "lisette", "bulwark": "breaker", "mage": "ryzz",
	"ashwick": "cinder", "dredge": "grimble", "tender": "pip", "rimewright": "claire", "dolm": "tarek",
	"ostra": "motley", "thief": "sable"}
var vp: SubViewport
var cam: Camera3D
var turn: Node3D
var out_dir := "/home/claude/shots/h3d_new"
var ids: Array = []
var frames := 24
var zoom := {}  # id -> camera distance factor, for models whose bounds frame them badly (--zoom=tender:0.3,bulwark:1.25)
var size := Vector2i(720, 900)
var pose := true  # also render the front pose: the emote once, then an idle loop (dir/<id>/pose/NN.png + pose.txt)
const PDT := 0.08  # seconds per pose frame (the site plays them at 80 ms)

func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--ids="): ids = Array(a.substr(6).split(","))
		if a.begins_with("--frames="): frames = int(a.substr(9))
		if a == "--no-pose": pose = false
		if a.begins_with("--out="): out_dir = a.substr(6)
		if a.begins_with("--zoom="):
			for kv in a.substr(7).split(","): zoom[kv.get_slice(":", 0)] = float(kv.get_slice(":", 1))
	DirAccess.make_dir_recursive_absolute(out_dir)
	vp = SubViewport.new(); vp.size = size; vp.own_world_3d = true; vp.transparent_bg = true
	vp.msaa_3d = Viewport.MSAA_8X; vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	add_child(vp)
	var env := WorldEnvironment.new(); var e := Environment.new()
	e.background_mode = Environment.BG_CLEAR_COLOR
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR; e.ambient_light_color = Color("dfe4f6"); e.ambient_light_energy = 0.7
	e.tonemap_mode = Environment.TONE_MAPPER_FILMIC; e.tonemap_exposure = 1.05; e.tonemap_white = 6.0
	e.adjustment_enabled = true; e.adjustment_saturation = 1.08
	env.environment = e; vp.add_child(env)
	var key := DirectionalLight3D.new(); key.rotation = Vector3(-0.7, -0.55, 0); key.light_energy = 1.3; key.light_color = Color("fff1e0"); vp.add_child(key)
	var fill := DirectionalLight3D.new(); fill.rotation = Vector3(-0.25, 0.95, 0); fill.light_energy = 0.4; fill.light_color = Color("cfe0ff"); vp.add_child(fill)
	var rim := DirectionalLight3D.new(); rim.rotation = Vector3(-0.35, PI, 0); rim.light_energy = 0.9; rim.light_color = Color("ffd9a8"); vp.add_child(rim)
	cam = Camera3D.new(); cam.fov = 24.0; vp.add_child(cam)
	_run()

func _stand() -> Node3D:
	var s := Node3D.new()
	var dark := StandardMaterial3D.new(); dark.albedo_color = Color("1a2030"); dark.roughness = 1.0; dark.metallic_specular = 0.1
	var face := StandardMaterial3D.new(); face.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED; face.albedo_color = Color("1c2335")
	var glow := StandardMaterial3D.new(); glow.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED; glow.albedo_color = Color("ffb02e")
	var base := MeshInstance3D.new(); var m := CylinderMesh.new(); m.top_radius = 0.8; m.bottom_radius = 0.86; m.height = 0.2; m.radial_segments = 72
	base.mesh = m; base.material_override = dark; base.position.y = -0.1; s.add_child(base)
	var top := MeshInstance3D.new(); var t := CylinderMesh.new(); t.top_radius = 0.74; t.bottom_radius = 0.74; t.height = 0.02; t.radial_segments = 72
	top.mesh = t; top.material_override = face; top.position.y = 0.005; s.add_child(top)
	var ring := MeshInstance3D.new(); var r := TorusMesh.new(); r.inner_radius = 0.75; r.outer_radius = 0.785; r.rings = 96; r.ring_segments = 8
	ring.mesh = r; ring.material_override = glow; s.add_child(ring)
	return s

func _box(n: Node) -> AABB:
	var acc := AABB(); var first := true
	for vi in n.find_children("*", "VisualInstance3D", true, false):
		var v := vi as VisualInstance3D
		if not v.is_visible_in_tree() or v is GPUParticles3D or v is CPUParticles3D: continue
		var bb := v.global_transform * v.get_aabb()
		if first: acc = bb; first = false
		else: acc = acc.merge(bb)
	return acc

func _run() -> void:
	for id in ids: WardenGlb.set_model(String(id), true)
	for id in ids: await _hero(String(id))
	print("HUNTERS3D DONE"); get_tree().quit()

var _cur_id := ""

func _hero(id: String) -> void:
	_cur_id = id
	turn = Node3D.new(); vp.add_child(turn)
	var h := Models.hunter(Arch.weight(id), Data.TEAM_COLORS[0], Arch.signature(id), "", PlayerLook.neutral(), id)
	turn.add_child(h)
	for nm in ["TeamRing", "Glider", "Halo", "Focus"]:
		var n := h.find_child(nm, true, false)
		if n and n is Node3D: (n as Node3D).visible = false
	var anim := HunterAnim.new(h)
	for k in 50:
		anim.update(1.0 / 60.0, {"fired": 99.0, "face": h.rotation.y, "grounded": true})
		await get_tree().process_frame
	var lo := Vector3(INF, INF, INF); var hi := -lo
	for k in 4:
		turn.rotation.y = k * PI * 0.5
		await get_tree().process_frame
		var bb := _box(h); lo = lo.min(bb.position); hi = hi.max(bb.end)
	var foot := clampf(maxf(hi.x - lo.x, hi.z - lo.z) / 1.6, 0.22, 1.15)
	var st := _stand(); st.scale = Vector3.ONE * foot; turn.add_child(st)
	lo.y = minf(lo.y, -0.2 * foot)
	var tall := hi.y - lo.y
	var wide := maxf(maxf(hi.x - lo.x, hi.z - lo.z), 1.75 * foot)
	var c := Vector3(0, (lo.y + hi.y) * 0.5, 0)
	var half_v := deg_to_rad(cam.fov * 0.5); var aspect := float(size.x) / size.y
	var dist := maxf((tall * 0.5) / tan(half_v), (wide * 0.5) / (tan(half_v) * aspect)) * 1.14 + 0.3
	dist *= float(zoom.get(id, 1.0))
	print("FIT ", id, " ", dist, " ", tall)   # camera distance and model height: pack.py scales every Hunter to one shared distance
	var fa := FileAccess.open(out_dir.path_join(ART.get(id, id)) + ".fit", FileAccess.WRITE)
	if fa: fa.store_string("%f %f" % [dist, tall]); fa.close()
	var pitch := deg_to_rad(13.0)
	cam.position = c + Vector3(0, sin(pitch), cos(pitch)) * dist; cam.look_at(c)
	var dir := out_dir.path_join(ART.get(id, id)); DirAccess.make_dir_recursive_absolute(dir)
	for f in frames:
		turn.rotation.y = PI + 0.5 - TAU * f / frames
		for k in 8: anim.update(0.14 / 8.0, {"fired": 99.0, "face": h.rotation.y, "grounded": true})  # the site steps a frame every 140 ms, so idle plays at real speed
		for k in 3: await get_tree().process_frame
		vp.get_texture().get_image().save_png(dir.path_join("%02d.png" % f))
	if pose: await _pose(h, anim, dir)
	print("HUNTER3D ", id)
	turn.queue_free(); await get_tree().process_frame

func _clip_len(h: Node, nm: String, dflt: float) -> float:
	for p in h.find_children("*", "AnimationPlayer", true, false):
		var ap := p as AnimationPlayer
		for a in ap.get_animation_list():
			if String(a) == nm or String(a).ends_with("/" + nm): return ap.get_animation(a).length
	return dflt

func _calm(h: Node) -> void:  # keep the idle from drifting into the long-still stance
	for n in h.find_children("*", "", true, false):
		if "still_t" in n and "stance_w" in n: n.set("still_t", 0.0)

# candidate emotes per Hunter: the emote first, then flourish clips from the kit that read well on their own.
# Every candidate is rendered; tools/turntable/pack.py --pick chooses which ones the site uses.
const CANDS := {"gunslinger": ["emote", "e", "x", "knock"], "juggernaut": ["emote", "roar", "wave", "riposte", "spin"],
	"archer": ["emote", "deadeye", "perfect", "spirit", "ult_final"], "bulwark": ["emote", "e_mend", "guard_armed", "x_wind"],
	"mage": ["emote", "gum", "sky", "ult"], "ashwick": ["emote", "stoke", "cloak", "hop"], "dredge": ["emote", "flex", "anchor", "quake"],
	"tender": ["emote", "hearth", "call", "kindled", "toss"], "rimewright": ["emote", "clench", "rime", "freeze"],
	"dolm": ["emote_toss", "sense", "e_row"], "ostra": ["emote", "empower", "flurry", "arrive"],
	"thief": ["emote", "flourish", "encore_dance", "primed", "arrive"]}

func _pose(h: Node, anim, dir: String) -> void:
	var pd := dir.path_join("pose"); DirAccess.make_dir_recursive_absolute(pd)
	turn.rotation.y = PI + 0.5
	var sync := h.find_child("Sync", true, false)
	var clips = sync.get("clips") if sync else null
	var base := {"fired": 99.0, "face": h.rotation.y, "grounded": true}
	var lines := PackedStringArray()
	var cands: Array = CANDS.get(_cur_id, ["emote"])
	for c in cands:
		var cn := String(c)
		if clips == null or not clips.lib.has_animation(cn): print("NO CLIP ", cn); continue
		for k in 60: _calm(h); anim.update(1.0 / 60.0, base); await get_tree().process_frame   # settle into idle between clips
		var el := clampf(clips.lib.get_animation(cn).length, 0.6, 4.5)
		var n := int(ceil((el + 0.4) / PDT))
		var sd := pd.path_join(cn); DirAccess.make_dir_recursive_absolute(sd)
		var t := 0.0
		for i in n:
			for k in 4:
				var s := base.duplicate()
				if t < el:
					clips.force = {"clip": cn, "t": t}
					if cn.begins_with("emote"): s["emote"] = "site"; s["emote_t"] = t   # the emote also brings the happy face
				else:
					clips.force = {}
				_calm(h); anim.update(PDT / 4.0, s); t += PDT / 4.0
			for k in 3: await get_tree().process_frame
			vp.get_texture().get_image().save_png(sd.path_join("%02d.png" % i))
		clips.force = {}
		lines.append("%s %d" % [cn, n])
	for k in 60: _calm(h); anim.update(1.0 / 60.0, base); await get_tree().process_frame
	var il := clampf(_clip_len(h, "idle", 2.4), 1.2, 3.6)
	var ni := int(round(il / PDT))
	var idd := pd.path_join("idle"); DirAccess.make_dir_recursive_absolute(idd)
	for i in ni:
		for k in 4: _calm(h); anim.update(PDT / 4.0, base)
		for k in 3: await get_tree().process_frame
		vp.get_texture().get_image().save_png(idd.path_join("%02d.png" % i))
	lines.append("idle %d" % ni)
	var fa := FileAccess.open(dir.path_join("pose.txt"), FileAccess.WRITE); fa.store_string("\n".join(lines)); fa.close()
	print("POSE ", " | ".join(lines))
