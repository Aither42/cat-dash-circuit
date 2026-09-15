"""Cat Dash Circuit blockout asset generator.
Run: blender --background --python tools/blender/build_assets.py -- --output exported
Creates original proxy meshes, a rigid-weight armature, named animation actions,
a .blend source and six GLBs. This is a STARTING ASSET KIT, not final fur/retopology.
Test with Blender 4.2 LTS before replacing runtime procedural cats.
"""
import bpy, math, argparse, sys
from pathlib import Path
argv=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
parser=argparse.ArgumentParser();parser.add_argument("--output",default="exported")
out=Path(parser.parse_args(argv).output).resolve();out.mkdir(parents=True,exist_ok=True)
CAST=[
("Ember",(0.09,.04,.025,1),(0.85,.6,.12,1),1.22),
("Mochi",(.74,.42,.21,1),(.8,.63,.19,1),1.2),
("Bolt",(.63,.35,.13,1),(.32,.68,.24,1),.9),
("Pip",(.025,.024,.035,1),(.82,.69,.21,1),1),
("Nimbus",(.32,.4,.52,1),(.91,.58,.16,1),1.24),
("Suki",(.84,.69,.51,1),(.23,.62,.87,1),.87)]
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=color;m.use_nodes=True
 p=m.node_tree.nodes.get("Principled BSDF");p.inputs["Base Color"].default_value=color;p.inputs["Roughness"].default_value=.72
 return m
def sphere(name,loc,scale,mat,bone,rig):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,location=loc)
 obj=bpy.context.object;obj.name=name;obj.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 obj.data.materials.append(mat)
 for polygon in obj.data.polygons:polygon.use_smooth=True
 group=obj.vertex_groups.new(name=bone);group.add(list(range(len(obj.data.vertices))),1,"REPLACE")
 mod=obj.modifiers.new("CatRig","ARMATURE");mod.object=rig;obj.parent=rig
 return obj
for index,(name,color,eye,width) in enumerate(CAST):
 bpy.ops.object.select_all(action="SELECT");bpy.ops.object.delete(use_global=False)
 bpy.ops.object.armature_add(enter_editmode=True,location=(0,0,0));rig=bpy.context.object;rig.name=name+"_Rig";bones=rig.data.edit_bones
 root=bones[0];root.name="root";root.head=(0,0,0);root.tail=(0,0,.5)
 specs={"body":((0,0,.6),(0,0,1.3)),"head":((0,.7,1.4),(0,.7,2)),
 "tail":((0,-.85,1),(0,-1.6,1.5)),
 "front_L":((-.45,.65,.8),(-.45,.65,.2)),"front_R":((.45,.65,.8),(.45,.65,.2)),
 "hind_L":((-.45,-.65,.8),(-.45,-.65,.2)),"hind_R":((.45,-.65,.8),(.45,-.65,.2))}
 for key,(a,b) in specs.items():
  bone=bones.new(key);bone.head=a;bone.tail=b;bone.parent=root
 bpy.ops.object.mode_set(mode="OBJECT")
 fur=material(name+"_fur",color);eyes=material(name+"_eyes",eye);black=material(name+"_pupil",(.006,.005,.01,1));pink=material(name+"_nose",(.65,.3,.32,1));white=material(name+"_white",(.94,.88,.76,1))
 sphere("Torso",(0,0,1.05),(.66*width,1.05,.69),fur,"body",rig)
 sphere("Head",(0,.8,1.65),(.79*width,.66,.72),fur,"head",rig)
 for side in [-1,1]:
  sphere("Ear",(side*.57,.75,2.25),(.25,.2,.43 if index==2 else .33),fur,"head",rig)
  sphere("Iris",(side*.32,1.38,1.67),(.24,.12,.28),eyes,"head",rig)
  sphere("Pupil",(side*.32,1.48,1.67),(.10,.04,.22),black,"head",rig)
  sphere("Highlight",(side*.32-.06,1.515,1.76),(.046,.022,.047),white,"head",rig)
  sphere("Muzzle",(side*.18,1.41,1.36),(.22,.16,.16),white if index!=0 else fur,"head",rig)
 sphere("Nose",(0,1.57,1.42),(.1,.06,.07),pink,"head",rig)
 for bone in ["front_L","front_R","hind_L","hind_R"]:
  x,y,z=specs[bone][0]
  sphere(bone,(x,y,.5),(.22,.27,.45),fur,bone,rig)
  sphere(bone+"_paw",(x,y+.12,.17),(.28,.34,.17),white if index in [1,3] else fur,bone,rig)
 for i in range(5):
  scale=.27*(1.5 if index==0 else 1)
  sphere("Tail_"+str(i),(math.sin(i*.5)*.17,-.9-i*.22,1.05+i*.24),(scale,scale*1.3,scale),fur,"tail",rig)
 if index==3:sphere("Bib",(0,.83,1.18),(.45,.36,.48),white,"body",rig)
 if index==2:
  spot=material("Spots",(.1,.045,.02,1))
  for i in range(20):sphere("Spot_"+str(i),((1 if i%2 else -1)*.58,math.cos(i*2.3)*.7,1.05+math.sin(i*5)*.32),(.055,.12,.1),spot,"body",rig)
 rig.animation_data_create()
 clip_names=["idle","walk","run","sprint","turn","jump","landing","drift","slip","collision","item_use","victory","defeat","celebration"]
 for clip in clip_names:
  action=bpy.data.actions.new(name+"_"+clip);rig.animation_data.action=action
  for f in range(1,25):
   phase=(f-1)/23*math.tau
   for pb in rig.pose.bones:
    pb.rotation_mode="XYZ";pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
   body=rig.pose.bones["body"];head=rig.pose.bones["head"];tail=rig.pose.bones["tail"]
   body.location.z=math.sin(phase)*.025;head.rotation_euler.y=math.sin(phase+index)*.07;tail.rotation_euler.y=math.sin(phase)*.2
   if clip in ["walk","run","sprint"]:
    amp={"walk":.25,"run":.65,"sprint":.85}[clip]
    for k,b in enumerate(["front_L","front_R","hind_L","hind_R"]):rig.pose.bones[b].rotation_euler.x=math.sin(phase+(0 if k in [0,3] else math.pi))*amp
    body.location.z=abs(math.sin(phase))*.08
   if clip=="drift":body.location.z=-.2;body.rotation_euler.y=.16;tail.rotation_euler.y=.7
   if clip=="jump":body.location.z=math.sin(phase/2)*.7
   if clip=="landing":body.location.z=-math.sin(phase/2)*.2
   if clip in ["slip","collision"]:body.rotation_euler.z=math.sin(phase)*.65
   if clip=="turn":body.rotation_euler.z=math.sin(phase)*.25
   if clip=="item_use":head.rotation_euler.x=math.sin(phase)*.3
   if clip in ["victory","celebration"]:body.location.z=abs(math.sin(phase))*(.25+index*.03);tail.rotation_euler.y=.45
   if clip=="defeat":head.rotation_euler.x=-.3-index*.025;tail.rotation_euler.x=-.4;body.location.z=-.1
   for pb in rig.pose.bones:
    pb.keyframe_insert(data_path="rotation_euler",frame=f);pb.keyframe_insert(data_path="location",frame=f)
  action.use_fake_user=True
  track=rig.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,action);track.mute=True
 rig.animation_data.action=None
 for tr in rig.animation_data.nla_tracks:tr.mute=False
 target=out/("reference-based" if index<4 else "original")/name.lower();target.mkdir(parents=True,exist_ok=True)
 bpy.context.scene.render.fps=24;bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=24
 bpy.ops.wm.save_as_mainfile(filepath=str(target/(name+".blend")))
 bpy.ops.export_scene.gltf(filepath=str(target/(name+".glb")),export_format="GLB",export_animations=True,export_nla_strips=True)
print("Created six blockout rigs. Inspect weights, clip export and silhouettes before production use.")

