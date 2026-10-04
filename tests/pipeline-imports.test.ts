import test from 'node:test';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {DefaultRenderingPipeline} from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline.js';
import {World} from '../client/src/game/World';

test('targeted rendering imports initialize the world and post-processing without barrel side effects',()=>{
 const previous=(globalThis as any).OffscreenCanvas;
 (globalThis as any).OffscreenCanvas=class {getContext(){return {fillRect(){},clearRect(){},fillText(){},measureText(){return {width:10};}};}};
 const engine=new NullEngine(),scene=new Scene(engine);
 try{const camera=new ArcRotateCamera('test',0,1,10,new Vector3(),scene);new World(scene);
 const pipeline=new DefaultRenderingPipeline('test',true,scene,[camera]);pipeline.bloomEnabled=true;pipeline.fxaaEnabled=true;scene.render();pipeline.dispose();
 }finally{scene.dispose();engine.dispose();(globalThis as any).OffscreenCanvas=previous;}
});
