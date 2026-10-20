"""Author precise SVG diagrams. Screenshots come from the real browser smoke tests."""
from pathlib import Path
from html import escape
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'docs/images';out.mkdir(exist_ok=True)
C={'bg':'#111c29','panel':'#1d2d3d','line':'#52657a','gold':'#e4c487','teal':'#8bd6d4','text':'#e9edf1','muted':'#aab9c8'}
def t(x,y,v,size=18,color='text',weight=400):return f'<text x="{x}" y="{y}" fill="{C.get(color,color)}" font-size="{size}" font-weight="{weight}" font-family="Arial,sans-serif">{escape(v)}</text>'
def box(x,y,w,h,title,lines,accent='teal'):
 s=f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{C["panel"]}" stroke="{C[accent]}"/>'+t(x+18,y+31,title,17,accent,700)
 for i,line in enumerate(lines):s+=t(x+18,y+61+i*24,line,14)
 return s
def arr(x,y,x2,y2):return f'<path d="M{x} {y} L{x2} {y2}" stroke="{C["muted"]}" stroke-width="2" fill="none" marker-end="url(#arr)"/>'
def save(name,title,subtitle,b,h=500):
 s=f'<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="{h}" viewBox="0 0 1000 {h}" role="img"><title>{escape(title)}</title><desc>{escape(subtitle)}</desc><defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="{C["muted"]}"/></marker></defs><rect width="1000" height="{h}" fill="{C["bg"]}"/>'+t(34,43,title,26,'gold',700)+t(34,72,subtitle,15,'muted')+b+'</svg>'
 (out/name).write_text(s)
b=box(34,108,282,145,'01 · Character setup',['HSR Settings → grouped menus','Energy, abilities, alternate orbs','Enhanced form and artwork'])+box(359,108,282,145,'02 · Encounter controls',['GM Panel → live resources','DM Combat → encounter tabs','Memosprite → companion tools'])+box(684,108,282,145,'03 · Learn in context',['Hover a field or focus it','? Help → the relevant guide','Rocket → Help Documentation'])+arr(322,182,349,182)+arr(647,182,674,182)+box(34,291,932,158,'Find an answer',['Search guides, fields and controls: alt ult · HP cost · pet range · art','Contents: setup → abilities → combat → equipment → campaign tools.','A–Z Index and search results jump directly to each field’s explanation.'],'gold')
save('manual-map.svg','Find the right control, then the right guide','The manual and hover help share one field reference.',b,520)
b=box(34,115,442,157,'Standard Ultimate',['Attacks / being hit / configured gains','→ Energy pool reaches Maximum Energy','→ Ultimate becomes available','→ Casting consumes charge'])+box(524,115,442,157,'Alternate Ultimate',['GM checks icons OR raises circular count','→ All components are active','→ Ultimate becomes available','→ Casting resets alternate progress'])+box(34,312,932,111,'The active form chooses the system',['Regular and enhanced forms can have independent alternate designs and progress.','Positive standard Energy gains are blocked while the active form uses alternate charge.'],'gold')
save('energy-and-charge.svg','Two ways to charge an Ultimate','Readiness follows the active form’s configured charge system.',b,470)
b=box(34,115,280,122,'Request Ultimate',['Check owner and readiness','Plan creatures, when enabled'])+arr(326,176,360,176)+box(374,115,280,122,'Insert / interrupt turn',['Show splash and ability text','Run the saved Ultimate code'])+arr(666,176,700,176)+box(714,115,252,122,'Finish Ultimate turn',['Use the completion flow','Resume the interrupted turn'])+box(34,292,932,124,'If a queued creature placement is blocked',['The scene is revalidated when the Ultimate turn begins; reposition when needed.','A blocked or cancelled queued summon restores reserved charge and continues initiative.'],'gold')
save('ultimate-turns.svg','Ultimate turns and returning to combat','Orbs, HUD buttons and supported requests use the ordinary activation path.',b,465)
b=''
for i,(count,active) in enumerate([(0,0),(1,0),(2,1),(3,2),(4,3),(5,4)]):
 y=113+i*52;b+=t(40,y+24,'Counter '+str(count),17,'gold' if active==4 else 'text')
 for j,clr in enumerate(['#ed6773','#f1f3f5','#e8c94d','#88c7d0']):
  x=220+j*140;fill=clr if j<active else '#263647';b+=f'<rect x="{x}" y="{y}" width="112" height="35" rx="6" fill="{fill}" stroke="{clr if j<active else C["line"]}"/>'+t(x+14,y+23,['Start','Next','Next','Last'][j],13,'#12212b' if j<active else 'muted',700)
 b+=t(817,y+24,'READY' if active==4 else f'{active} / 4 lit',15,'teal' if active==4 else 'muted',700)
b+=t(40,466,'Example: 4 icons · first activation number 2 · previous icons stay lit',16,'muted')
save('alternate-sequence.svg','A circular counter lights a cumulative sequence','Starting icon and unique Sequence order set the route; First activation number sets the offset.',b,520)
b=box(34,110,442,143,'Encounter tabs',['Alt Ultimates · component charge','Talents · view / change points','Weaknesses · temporary Element overrides'])+box(524,110,442,143,'More encounter tabs',['Stances · Normal / Enhanced form','DoT · timed damage and conditions','Phases · multi-phase boss control'])+box(34,294,932,155,'Footer controls',['Adjusted PC Stats · inspect values     |     Punchline / Skill Points − and + · live totals','Previous / Next Turn · initiative      |     Action Advance · insert an extra turn','End Combat · finish the encounter; this is a live action, not a preview.'],'gold')
save('combat-controls.svg','Read the DM Combat panel','Tabs group encounter controls; the footer stays available below them.',b)
b=f'<rect x="50" y="123" width="425" height="260" rx="15" fill="{C["panel"]}" stroke="{C["line"]}"/><circle cx="168" cy="235" r="70" fill="#34566b" stroke="{C["teal"]}" stroke-width="7"/>'+t(132,241,'Portrait',17)+t(107,336,'HP 18 / 24',19,'gold',700)
for i in range(3):b+=f'<circle cx="{301+i*44}" cy="195" r="9" fill="{C["teal"] if i<2 else C["line"]}"/>'
b+=t(285,234,'Resource 2 / 3',15,'muted')+f'<rect x="280" y="268" width="161" height="51" rx="6" fill="#284d5a" stroke="{C["teal"]}"/>'+t(304,299,'Ability button',15)+box(524,110,442,143,'Configuration',['Link an Actor (live HP) or Item','Set resource style and ability list','Summon / restore / visibility controls'])+box(524,287,442,143,'HUD layout',['Frame = whole companion HUD','Parts = portrait, HP, resource, abilities','Offsets / scales change the display'])+t(50,466,'Illustrative layout: visibility switches, offsets and installed addon version can differ.',14,'muted')
save('memosprite-anatomy.svg','Memosprite HUD and configuration','Linked source, battle-map token and on-screen HUD are separate pieces.',b,510)
print('Built six diagrams')
