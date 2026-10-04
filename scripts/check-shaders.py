"""Compile/link the game's custom GLSL using a headless EGL GLES2 context (Linux).
No window/browser is created. Requires a system EGL/Mesa implementation.
"""
import ctypes as C, ctypes.util, os, re, json
from pathlib import Path
os.environ.setdefault('EGL_PLATFORM','surfaceless')
os.environ.setdefault('MESA_SHADER_CACHE_DIR','/tmp/kerala-v2-shader-cache')
egl=C.CDLL(ctypes.util.find_library('EGL'))
def bind(lib,name,ret,args):
 f=getattr(lib,name);f.restype=ret;f.argtypes=args;return f
get_display=bind(egl,'eglGetDisplay',C.c_void_p,[C.c_void_p]);init=bind(egl,'eglInitialize',C.c_uint,[C.c_void_p,C.POINTER(C.c_int),C.POINTER(C.c_int)])
choose=bind(egl,'eglChooseConfig',C.c_uint,[C.c_void_p,C.POINTER(C.c_int),C.POINTER(C.c_void_p),C.c_int,C.POINTER(C.c_int)])
bindapi=bind(egl,'eglBindAPI',C.c_uint,[C.c_uint]);context=bind(egl,'eglCreateContext',C.c_void_p,[C.c_void_p,C.c_void_p,C.c_void_p,C.POINTER(C.c_int)])
surface=bind(egl,'eglCreatePbufferSurface',C.c_void_p,[C.c_void_p,C.c_void_p,C.POINTER(C.c_int)]);current=bind(egl,'eglMakeCurrent',C.c_uint,[C.c_void_p,C.c_void_p,C.c_void_p,C.c_void_p]);proc=bind(egl,'eglGetProcAddress',C.c_void_p,[C.c_char_p])
display=get_display(None);major=C.c_int();minor=C.c_int();assert init(display,C.byref(major),C.byref(minor)), 'EGL initialization unavailable'
attrs=(C.c_int*13)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3038);config=C.c_void_p();n=C.c_int();assert choose(display,attrs,C.byref(config),1,C.byref(n)) and n.value
assert bindapi(0x30A0);ctx=context(display,config,None,(C.c_int*3)(0x3098,2,0x3038));assert ctx
surf=surface(display,config,(C.c_int*5)(0x3057,1,0x3056,1,0x3038));assert surf and current(display,surf,surf,ctx)
def gl(name,ret,*args):
 ptr=proc(name.encode());assert ptr,name;return C.CFUNCTYPE(ret,*args)(ptr)
create=gl('glCreateShader',C.c_uint,C.c_uint);source=gl('glShaderSource',None,C.c_uint,C.c_int,C.POINTER(C.c_char_p),C.POINTER(C.c_int));compile_=gl('glCompileShader',None,C.c_uint);get=gl('glGetShaderiv',None,C.c_uint,C.c_uint,C.POINTER(C.c_int));log=gl('glGetShaderInfoLog',None,C.c_uint,C.c_int,C.POINTER(C.c_int),C.c_char_p)
program=gl('glCreateProgram',C.c_uint);attach=gl('glAttachShader',None,C.c_uint,C.c_uint);link=gl('glLinkProgram',None,C.c_uint);getp=gl('glGetProgramiv',None,C.c_uint,C.c_uint,C.POINTER(C.c_int));logp=gl('glGetProgramInfoLog',None,C.c_uint,C.c_int,C.POINTER(C.c_int),C.c_char_p)
text=Path('client/src/game/World.ts').read_text();shaders={};results=[]
for name,code in re.findall(r'Effect.ShadersStore\.(\w+)\s*=\s*`([^`]+)`',text):
 sh=create(0x8B31 if 'VertexShader' in name else 0x8B30);src=C.c_char_p(code.encode());source(sh,1,C.byref(src),None);compile_(sh);ok=C.c_int();get(sh,0x8B81,C.byref(ok));buf=C.create_string_buffer(4096);log(sh,4096,None,buf);assert ok.value,name+': '+buf.value.decode();shaders[name]=sh;results.append({'shader':name,'compiled':True})
for name in ['coastalSky','coastalWater']:
 p=program();attach(p,shaders[name+'VertexShader']);attach(p,shaders[name+'FragmentShader']);link(p);ok=C.c_int();getp(p,0x8B82,C.byref(ok));buf=C.create_string_buffer(4096);logp(p,4096,None,buf);assert ok.value,name+': '+buf.value.decode();results.append({'program':name,'linked':True})
print(json.dumps({'method':'headless EGL GLES2 compile/link; not an in-game visual test','results':results},indent=2))
bind(egl,'eglTerminate',C.c_uint,[C.c_void_p])(display)
