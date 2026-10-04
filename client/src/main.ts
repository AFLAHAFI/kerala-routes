import "@fontsource/noto-sans-malayalam/400.css";
import "./ui/style.css";
import {Engine} from '@babylonjs/core/Engines/engine.js';
import { Game } from "./game/Game";
const canvas = document.querySelector<HTMLCanvasElement>("#world")!;
async function boot() {
  try {
    await document.fonts.load('400 16px "Noto Sans Malayalam"');
    if (!Engine.isSupported())
      throw new Error(
        "This browser cannot start WebGL. Enable hardware acceleration or try a newer browser.",
      );
    new Game(canvas);
  } catch (error) {
    document.querySelector("#app")!.innerHTML =
      '<div class="fatal"><h1>The world could not start.</h1><p id="fatal-message"></p><p>Try refreshing, enabling browser hardware acceleration, or using a modern browser.</p><button onclick="location.reload()">Try again</button></div>';
    document.querySelector("#fatal-message")!.textContent = (
      error as Error
    ).message;
    console.error(error);
  }
}
void boot();
