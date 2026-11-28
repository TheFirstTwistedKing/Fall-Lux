/* 3D 지도와 이야기 지도를 앱(index.html)에 연결하는 진입점 */
import { createMap } from "./map.js";
import { createStoryMap, TYPE_LABEL } from "./story.js";
import { createGame } from "./play.js";
import { BODIES } from "./bodies.js";
window.FallApp3D = { createMap, createStoryMap, createGame, TYPE_LABEL, BODIES };
