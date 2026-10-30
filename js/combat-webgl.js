// Shared GPU surface. Static batches describe each effect once; the shaders
// advance movement, particles, fades and persistent auras from a time uniform.
(function () {
    'use strict';
    let canvas, gl, program, buffer, uniforms, panel, observer, panelSize;
    let failed = false, lost = false, frame = 0, dirty = true, geometryDirty = true;
    let failureReason='';
    let effects = [], ambient = new Map(), vertexCount = 0, mapId, bounds;
    let viewportWidth = 0, viewportHeight = 0, pixelRatio = 0;
    const epoch = performance.now();
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const corners = [[-1,-1],[1,-1],[-1,1],[-1,1],[1,-1],[1,1]];
    const vertexSource = `
        attribute vec4 a_origin, a_target, a_curve, a_timing, a_color, a_uv;
        uniform vec2 u_viewport, u_origin;
        uniform float u_time;
        varying mediump vec2 v_uv;
        varying mediump vec2 v_size;
        varying mediump vec4 v_color;
        varying mediump vec4 v_info;
        varying mediump vec3 v_glowColor;
        varying mediump float v_pathLength;
        void main() {
            float age = u_time - a_timing.x;
            float t = clamp(age / a_timing.y, 0.0, 1.0);
            vec2 center = a_origin.xy;
            if (a_timing.z > 0.5) {
                float travel = a_timing.z < 1.5 && a_curve.x > 0.0 ? clamp(age/a_curve.x,0.0,1.0) : t;
                float p = a_timing.z > 2.5 ? t*t : travel;
                if (a_timing.z > 1.5) {
                    float q = 1.0-p;
                    center = q*q*q*a_origin.xy + 3.0*q*q*p*a_curve.xy + 3.0*q*p*p*a_curve.zw + p*p*p*a_target.xy;
                } else center = mix(a_origin.xy, a_target.xy, p);
            }
            float scale = mix(a_uv.w, a_target.z, t);
            vec2 local = a_uv.xy * a_origin.zw * scale;
            float angle=a_target.w+(a_timing.w>9.5&&a_timing.w<10.5?t*1.74533:0.0);
            float c = cos(angle), s = sin(angle);
            vec2 pos = center + vec2(c*local.x-s*local.y, s*local.x+c*local.y);
            if (a_timing.w >= 12.0) pos = a_origin.xy;
            vec2 p = (pos + u_origin) / u_viewport;
            gl_Position = vec4(p.x*2.0-1.0, 1.0-p.y*2.0, 0.0, 1.0);
            v_uv = a_uv.xy; v_size=a_timing.w>=12.0?a_origin.zw:a_origin.zw*scale; v_color = a_color;
            v_glowColor = a_timing.w >= 12.0 ? a_curve.xyz : a_color.rgb;
            v_pathLength = a_curve.w;
            v_info = vec4(a_uv.z > 0.5 ? 0.0 : age, a_uv.z > 0.5 ? 1.0 : a_timing.y, a_timing.w, a_target.z);
        }`;
    const fragmentSource = `
        precision mediump float;
        uniform float u_phase, u_glow;
        varying mediump vec2 v_uv;
        varying mediump vec2 v_size;
        varying mediump vec4 v_color, v_info;
        varying mediump vec3 v_glowColor;
        varying mediump float v_pathLength;
        float segmentDistance(vec2 p, vec2 a, vec2 b) {
            vec2 edge=b-a;
            return length(p-a-edge*clamp(dot(p-a,edge)/dot(edge,edge),0.0,1.0));
        }
        void main() {
            float age=v_info.x, duration=v_info.y, style=v_info.z;
            if(age<0.0 || age>duration) discard;
            float t=clamp(age/duration,0.0,1.0), r=length(v_uv);
            float fade=(1.0-smoothstep(0.35,1.0,t)), alpha=0.0;
            vec3 color=v_color.rgb;
            if(style>=12.0) {
                float flight=v_info.w, head=clamp(age/flight,0.0,1.0);
                if(style>14.5 && style<15.5) head*=head;
                float arrival=age-v_uv.x*flight, edge=abs(v_uv.y);
                if(style>12.5 && style<13.5) {
                    if(arrival<0.0) discard;
                    float heat=smoothstep(0.0,0.025,arrival)*(1.0-smoothstep(0.05,0.18,arrival));
                    fade=1.0-smoothstep(duration*0.7,duration,age);
                    float crack=1.0-smoothstep(0.22,0.4,edge);
                    float core=(1.0-smoothstep(0.04,0.15,edge))*heat;
                    float halo=pow(max(0.0,1.0-edge),3.0)*heat*0.65*u_glow;
                    alpha=max(crack*0.95,max(core,halo))*fade;
                    color=mix(vec3(0.18,0.025,0.035),vec3(1.0,0.48,0.12),max(core,halo));
                    color=mix(color,vec3(1.0,0.83,0.42),core);
                } else {
                    if(v_uv.x>head && (style<13.5 || style>15.5)) discard;
                    // Widths and blur radii are CSS pixels, independent of the
                    // padded strip needed to keep the glow from being clipped.
                    float lateral=edge*(v_size.x+v_size.y*3.0);
                    float along=style>13.5 && style<15.5 ? max(0.0,max(head-0.14-v_uv.x,v_uv.x-head))*v_pathLength : 0.0;
                    float distance=length(vec2(lateral,along));
                    float core=1.0-smoothstep(v_size.x-0.5,v_size.x+0.5,distance);
                    float halo=exp(-0.5*pow(max(0.0,distance-v_size.x)/v_size.y,2.0))*0.55*u_glow;
                    if(style>15.5) {
                        float lifetime=duration*0.5+v_uv.x*(duration*0.5-flight);
                        fade=1.0-smoothstep(lifetime*0.45,lifetime,max(0.0,arrival));
                    } else if(style>13.5) {
                        fade=smoothstep(0.0,0.08,t)*(1.0-smoothstep(0.99,1.0,t));
                    } else fade=1.0-smoothstep(0.7,1.0,t);
                    alpha=max(core,halo)*fade;
                    color=mix(v_glowColor,color,core);
                }
            } else if(style<0.5) {
                if(style>0.1) {
                    float distance=length(v_uv*v_size), radius=v_size.x-18.0;
                    float core=1.0-smoothstep(radius-0.5,radius+0.5,distance);
                    float halo=exp(-0.5*pow(max(0.0,distance-radius)/6.0,2.0))*0.65*u_glow;
                    alpha=max(core,halo)*smoothstep(0.0,0.08,t)*(1.0-smoothstep(0.9,1.0,t));
                    color=mix(color,vec3(0.97,0.85,1.0),core);
                } else alpha=pow(max(0.0,1.0-r),2.0)*fade;
            } else if(style<1.5 || (style>9.5 && style<10.5)) {
                float gradient=length(v_uv/max(r,0.001)/max(v_size,vec2(1.0)));
                float d=abs(r-0.75)/max(gradient,0.001);
                if(style>9.5)fade*=smoothstep(0.0,0.25,t);
                alpha=((1.0-smoothstep(0.8,2.0,d))+exp(-d*0.6)*0.15*u_glow)*fade;
            } else if(style<2.5 || (style>10.5 && style<11.5)) {
                float radius=min(12.0,min(v_size.x,v_size.y)*0.25);
                vec2 q=abs(v_uv)*v_size-(v_size-vec2(radius));
                float d=length(max(q,0.0))+min(max(q.x,q.y),0.0)-radius;
                if(style>10.5)fade=1.0-smoothstep(0.85,1.0,t);
                alpha=((1.0-smoothstep(0.8,2.2,abs(d+2.0)))+exp(-abs(d+2.0)*0.3)*0.16*u_glow)*fade;
            } else if(style<3.5) {
                alpha=(1.0-smoothstep(0.75,1.0,abs(v_uv.x)+abs(v_uv.y)))*fade;
            } else if(style<4.5) {
                // Original SVG arrow: M3,0 L-16,-8 L-11,0 L-16,8 Z.
                vec2 p=v_uv*v_size;
                float distance=min(min(segmentDistance(p,vec2(3.0,0.0),vec2(-16.0,-8.0)),
                    segmentDistance(p,vec2(-16.0,-8.0),vec2(-11.0,0.0))),
                    min(segmentDistance(p,vec2(-11.0,0.0),vec2(-16.0,8.0)),
                    segmentDistance(p,vec2(-16.0,8.0),vec2(3.0,0.0))));
                bool inside=p.x<=3.0 && p.x>=-11.0-abs(p.y)*0.625 && abs(p.y)<=(3.0-p.x)*8.0/19.0;
                float signedDistance=inside?-distance:distance;
                float core=1.0-smoothstep(0.25,1.25,signedDistance);
                float outline=smoothstep(-1.25,-0.25,signedDistance);
                float halo=exp(-0.5*pow(max(0.0,signedDistance)/5.0,2.0))*0.6*u_glow;
                alpha=max(core,halo)*smoothstep(0.0,0.01,t)*(1.0-smoothstep(0.7,1.0,t));
                color=mix(color,vec3(1.0),outline*core);
            } else if(style<5.5) {
                float shield=step(abs(v_uv.x),0.88-0.35*max(0.0,v_uv.y))*step(-0.85+abs(v_uv.x)*0.25,v_uv.y)*step(v_uv.y,1.0-abs(v_uv.x)*0.65);
                float cross=max(step(abs(v_uv.x),0.09)*step(abs(v_uv.y),0.55),step(abs(v_uv.y),0.08)*step(abs(v_uv.x),0.45));
                color=mix(color,vec3(0.94,0.99,1.0),cross); alpha=shield*fade;
            } else if(style<6.5) {
                float flame=sin(v_uv.x*32.0+sin(v_uv.x*13.0+u_phase*3.0)*2.0+u_phase*5.0)*0.13;
                float tip=-0.45+flame*3.0;
                alpha=smoothstep(tip,tip+0.2,v_uv.y)*(1.0-smoothstep(0.65,1.0,v_uv.y))*(0.65+0.2*sin(u_phase*7.0+v_uv.x*12.0));
                color=mix(color,vec3(1.0,0.91,0.48),smoothstep(0.0,0.75,v_uv.y));
            } else if(style<7.5) {
                alpha=0.10*max(0.0,v_uv.y);
                for(int i=0;i<3;i++) {
                    float n=float(i), p=fract(u_phase/2.1+n/3.0);
                    vec2 point=vec2(-0.65+n*0.55,0.85-p*1.7);
                    float d=length((v_uv-point)/vec2(0.14-n*0.025,0.14-n*0.025));
                    alpha+=max(0.0,1.0-abs(d-0.8)*4.0)*sin(p*3.14159)*0.8;
                }
            } else if(style<8.5) {
                alpha=0.08;
                for(int i=0;i<3;i++) {
                    float n=float(i), p=fract(u_phase/1.7+n/3.0);
                    vec2 point=vec2(-0.65+n*0.55,-0.9+p*1.8);
                    alpha+=max(0.0,1.0-length((v_uv-point)/vec2(0.075,0.22)))*sin(p*3.14159);
                }
            } else if(style<9.5) {
                float d=max(abs(v_uv.x),abs(v_uv.y));
                alpha=smoothstep(0.65,1.0,d)*0.55+pow(max(0.0,1.0-abs(v_uv.x-v_uv.y)*18.0),3.0)*0.35;
            }
            alpha=clamp(alpha*v_color.a,0.0,1.0);
            gl_FragColor=vec4(color*alpha,alpha);
        }`;

    function initialize() {
        const shaders=[];
        let nextProgram, nextBuffer;
        try {
            for(const [type,source] of [[gl.VERTEX_SHADER,vertexSource],[gl.FRAGMENT_SHADER,fragmentSource]]) {
                const shader=gl.createShader(type); shaders.push(shader); gl.shaderSource(shader,source); gl.compileShader(shader);
            }
            nextProgram=gl.createProgram(); shaders.forEach(shader=>gl.attachShader(nextProgram,shader));
            ['origin','target','curve','timing','color','uv'].forEach((name,index)=>gl.bindAttribLocation(nextProgram,index,'a_'+name));
            gl.linkProgram(nextProgram);
            if(!gl.getProgramParameter(nextProgram,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(nextProgram)+' '+shaders.map(shader=>gl.getShaderInfoLog(shader)).join(' '));
            nextBuffer=gl.createBuffer(); if(!nextBuffer) throw new Error('Effect buffer unavailable');
            program=nextProgram; buffer=nextBuffer;
            uniforms=Object.fromEntries(['viewport','origin','time','phase','glow'].map(name=>[name,gl.getUniformLocation(program,'u_'+name)]));
            gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
            for(let index=0;index<6;index++) {gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index,4,gl.FLOAT,false,96,index*16);}
            gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
            dirty=geometryDirty=true;return true;
        } catch(error) {
            if(nextBuffer)gl.deleteBuffer(nextBuffer);if(nextProgram)gl.deleteProgram(nextProgram);
            failureReason=String(error.message||error);failed=true;return false;
        } finally {shaders.forEach(shader=>gl.deleteShader(shader));}
    }

    function ready(targetPanel,category='abilities',scope='full') {
        const selected=window.CombatSettings?.renderer();
        if(failed||lost||document.hidden||motion.matches||!window.CombatSettings?.enabled(category)||selected==='svg'||scope==='full'&&selected!=='webgl')return false;
        if(!canvas) {
            canvas=document.createElement('canvas');canvas.className='combat-webgl-layer';canvas.setAttribute('aria-hidden','true');canvas.hidden=true;
            canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;clear();dispatchEvent(new Event('combat-renderer-status'));});
            canvas.addEventListener('webglcontextrestored',()=>{lost=false;failed=false;initialize();dispatchEvent(new Event('combat-renderer-status'));});
            try{gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false,stencil:false});}catch{}
            if(!gl||!initialize()){failed=true;dispatchEvent(new Event('combat-renderer-status'));return false;}
            document.body.append(canvas);
        }
        if(panel!==targetPanel) {
            observer?.disconnect();panel=targetPanel;
            observer=new ResizeObserver(entries=>{
                const {width,height}=entries[0].contentRect;
                if(panelSize&&(panelSize.width!==width||panelSize.height!==height))clear();
                panelSize={width,height};dirty=true;
            });observer.observe(panel);
        }
        return true;
    }

    function clear() {
        if(frame)cancelAnimationFrame(frame);frame=0;effects=[];ambient.clear();vertexCount=0;geometryDirty=true;
        if(canvas)canvas.hidden=true;if(gl&&!lost&&!failed)gl.clear(gl.COLOR_BUFFER_BIT);
        dispatchEvent(new Event('combat-webgl-clear'));
    }
    function wake(){geometryDirty=true;dirty=true;if(!frame)frame=requestAnimationFrame(draw);}
    function now(){return (performance.now()-epoch)/1000;}
    function verticesFor(spec) {
        const {x,y,width=20,height=width,endX=x,endY=y,scale=1,rotation=0,style=0,duration=500,delay=0,
            color=[1,1,1],opacity=1,move=0,control1={x,y},control2={x:endX,y:endY},startScale=1,flight=0}=spec;
        const born=now()+delay/1000,seconds=duration/1000;
        const vertices=new Float32Array(144);
        corners.forEach((uv,index)=>vertices.set([x,y,width/2,height/2,endX,endY,scale,rotation,
            move===1?flight/1000:control1.x,control1.y,control2.x,control2.y,born,seconds,move,style,...color,opacity,...uv,spec.persistent?1:0,startScale],index*24));
        return {vertices,expires:born+seconds,category:spec.category||'abilities',type:spec.type||'shape',requiresAbilities:spec.requiresAbilities===true};
    }
    function emit(spec) {
        const effect=verticesFor(spec);effects.push(effect);wake();
        return {remove(){const index=effects.indexOf(effect);if(index>=0){effects.splice(index,1);wake();}}};
    }
    function setAmbient(descriptors) {
        const next=new Map();let changed=ambient.size!==descriptors.length;
        for(const descriptor of descriptors) {
            const old=ambient.get(descriptor.key),signature=JSON.stringify(descriptor);
            if(old?.signature===signature)next.set(descriptor.key,old);
            else {next.set(descriptor.key,{...verticesFor({...descriptor,persistent:true}),signature});changed=true;}
        }
        ambient=next;if(changed)wake();
    }
    function trail({points,flight=400,duration=flight,delay=0,width=6,strokeWidth=3,glowRadius=4,style=12,color=[1,1,1],glowColor=color,category='projectiles',type='trail',parametric=false}) {
        const halfStroke=strokeWidth/2,blur=Math.max(1,glowRadius);
        if(style!==13)width=halfStroke+blur*3;
        const distances=[0];for(let i=1;i<points.length;i++)distances.push(distances[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
        const length=distances[distances.length-1]||1,born=now()+delay/1000;
        const strip=points.map((point,index)=>{
            const before=points[Math.max(0,index-1)],after=points[Math.min(points.length-1,index+1)];
            const dx=after.x-before.x,dy=after.y-before.y,size=Math.hypot(dx,dy)||1;
            return [-1,1].map(side=>[point.x-dy/size*side*width,point.y+dx/size*side*width,halfStroke,blur,
                0,0,flight/1000,0,...glowColor,length,born,duration/1000,0,style,...color,1,parametric?index/(points.length-1):distances[index]/length,side,0,1]);
        });
        const vertices=new Float32Array((points.length-1)*144);let offset=0;
        for(let i=1;i<strip.length;i++)for(const vertex of [strip[i-1][0],strip[i-1][1],strip[i][0],strip[i][0],strip[i-1][1],strip[i][1]]){vertices.set(vertex,offset);offset+=24;}
        const effect={vertices,expires:born+duration/1000,category,type};effects.push(effect);wake();
        return {remove(){const index=effects.indexOf(effect);if(index>=0){effects.splice(index,1);wake();}}};
    }
    function measure() {
        bounds=panel.getBoundingClientRect();const width=document.documentElement.clientWidth,height=innerHeight;
        const ratio=Math.min(devicePixelRatio||1,1.5,2048/Math.max(width,height));
        if(width!==viewportWidth||height!==viewportHeight||ratio!==pixelRatio) {
            viewportWidth=width;viewportHeight=height;pixelRatio=ratio;
            canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));gl.viewport(0,0,canvas.width,canvas.height);
        }dirty=false;
    }
    function draw(timestamp) {
        frame=0;
        if(document.hidden||motion.matches||!window.CombatSettings?.enabled()){clear();return;}
        const time=(timestamp-epoch)/1000,alive=effects.filter(effect=>effect.expires>time);
        if(alive.length!==effects.length){effects=alive;geometryDirty=true;}
        if(!effects.length&&!ambient.size){clear();return;}
        if(dirty)measure();
        if(!bounds.width||!bounds.height||bounds.bottom<=0||bounds.top>=innerHeight||bounds.right<=0||bounds.left>=innerWidth){clear();return;}
        if(geometryDirty) {
            const all=[...ambient.values(),...effects];const size=all.reduce((sum,effect)=>sum+effect.vertices.length,0);
            const vertices=new Float32Array(size);let offset=0;for(const effect of all){vertices.set(effect.vertices,offset);offset+=effect.vertices.length;}
            gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.DYNAMIC_DRAW);vertexCount=size/24;geometryDirty=false;
        }
        gl.disable(gl.SCISSOR_TEST);gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.SCISSOR_TEST);
        const left=Math.max(0,bounds.left),top=Math.max(0,bounds.top),right=Math.min(viewportWidth,bounds.right),bottom=Math.min(viewportHeight,bounds.bottom);
        gl.scissor(Math.floor(left*pixelRatio),Math.floor((innerHeight-bottom)*pixelRatio),Math.max(0,Math.ceil((right-left)*pixelRatio)),Math.max(0,Math.ceil((bottom-top)*pixelRatio)));
        gl.uniform2f(uniforms.viewport,viewportWidth,viewportHeight);gl.uniform2f(uniforms.origin,bounds.left,bounds.top);
        gl.uniform1f(uniforms.time,time);gl.uniform1f(uniforms.phase,time%357);gl.uniform1f(uniforms.glow,window.CombatSettings.enabled('glows')?1:0);
        gl.drawArrays(gl.TRIANGLES,0,vertexCount);canvas.hidden=false;frame=requestAnimationFrame(draw);
    }
    addEventListener('scroll',()=>{dirty=true;},true);
    addEventListener('resize',()=>{clear();dirty=true;});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
    motion.addEventListener('change',()=>{clear();dispatchEvent(new Event('combat-renderer-status'));});
    addEventListener('combat-settings-change',()=>{
        if(!window.CombatSettings.enabled()||window.CombatSettings.renderer()==='svg'){clear();return;}
        effects=effects.filter(effect=>window.CombatSettings.enabled(effect.category)&&(!effect.requiresAbilities||window.CombatSettings.enabled('abilities')));ambient.clear();
        if(effects.length)wake();else clear();
    });
    window.CombatWebGL={ready,emit,trail,setAmbient,clear,
        eruptionChain({panel:targetPanel,...spec}){if(!ready(targetPanel,'abilities','crack'))return false;trail({...spec,width:8,style:13,category:'abilities',type:'eruptionChain'});return true;},
        sync(visible,nextMapId){if(!visible||nextMapId!==mapId)clear();mapId=nextMapId;},
        status(){return {active:effects.length,ambient:ambient.size,running:Boolean(frame),available:!failed&&!lost,reducedMotion:motion.matches,failureReason,
            types:[...new Set([...effects,...ambient.values()].map(effect=>effect.type))]};}
    };
}());
