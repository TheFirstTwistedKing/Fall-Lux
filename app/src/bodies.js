/* ════════════════════════════════════════════════════════════════
   행성 지도의 천체들
   - pos: 스케치(2000×1125)의 위치를 (x-1000)/95, (y-560)/95 로 옮긴 값
   - locked: 스케치에서 자물쇠가 그려진 천체
   - info.exterior 는 스케치를 보고 쓴 '초안'이다. 작가가 고쳐 쓰면 된다.
   ════════════════════════════════════════════════════════════════ */
import { Vector3 } from "three";
const v = (x, y, z) => new Vector3(x, y, z);
const LOCKED = "아직 열리지 않았다.";

export const BODIES = [
  { id: "planet-1", kind: "planet", planetId: 1, look: "planet1", pos: v(1.05, 0.3, -3.3), radius: 1.15, pick: 2.2, ring: 2.1, locked: false,
    info: { label: "행성 01", name: "제 1 행성", fullName: "차원의 틈 : 120 - 494 - 159 - ACU - 추락하는 불빛",
      location: "차원의 틈 : 120 - 494 - 159 - ACU",
      desc: ["추락하는 불빛 인원들이 살고있는 행성이다.", "이 행성의 특징은 “타임라인” 에 영향을 받지 않는 다는 것이다."],
      exterior: "푸른 잿빛의 둥근 행성을 거대한 보랏빛 결정 두 줄기가 꿰뚫고 있다. 결정이 박힌 자리를 따라 표면이 깊은 남색으로 갈라졌고, 떨어져 나온 파편들이 행성 주위를 떠돈다. 노란 궤도를 따라 작은 위성 하나가 돈다." },
    lore: "planet-1" },
  { id: "moon-1", kind: "moon", look: "moon", orbitOf: "planet-1", pos: v(0, 0, 0), radius: 0.2, pick: 0.55, ring: 2.4, locked: true,
    info: { label: "위성", name: "???", location: "제 1 행성의 노란 궤도", desc: [LOCKED], exterior: "옅은 하늘빛의 작은 위성." } },
  { id: "striped", kind: "planet", look: "striped", pos: v(-5.47, 0, -3.05), radius: 0.8, locked: true,
    info: { label: "행성", name: "???", location: "???", desc: [LOCKED], exterior: "하늘빛 줄무늬가 비스듬히 감긴 행성. 한쪽 면에 소용돌이치는 눈 같은 무늬가 있다." } },
  { id: "ringed", kind: "planet", look: "ringed", pos: v(7.05, 0, -3.3), radius: 0.8, ring: 2.6, locked: true,
    info: { label: "행성", name: "???", location: "???", desc: [LOCKED], exterior: "검붉은 표면에 붉은 고리를 두른 행성. 표면 위로 붉은 상처 두 줄이 엇갈려 그어져 있다." } },
  { id: "sun", kind: "planet", look: "sun", pos: v(-4.2, 0.2, 0.05), radius: 0.85, locked: true,
    info: { label: "행성", name: "???", location: "???", desc: [LOCKED], exterior: "스스로 빛나는 노란 행성. 지도 위의 천체들을 비추는 빛이 이곳에서 나온다." } },
  { id: "constellation", kind: "planet", look: "constellation", pos: v(-0.8, 0, 1.5), radius: 1.0, pick: 1.9, ring: 2.1, locked: true,
    info: { label: "행성", name: "???", location: "???", desc: [LOCKED], exterior: "빛나는 점들이 가는 선으로 이어진 별자리. 그 아래에 남색 행성 하나가 떠 있다." } },
  { id: "crystal", kind: "planet", look: "crystal", pos: v(3.26, 0.2, 0.95), radius: 0.75, pick: 1.4, ring: 2.2, locked: true,
    info: { label: "행성", name: "???", location: "???", desc: [LOCKED], exterior: "남색의 마름모꼴 결정. 가운데를 붉은 균열이 가르고, 양옆으로 작은 결정 조각 두 개가 떠 있다." } },
  { id: "amoeba", kind: "planet", look: "amoeba", pos: v(-5.8, 0, 2.95), radius: 0.75, locked: true,
    info: { label: "행성", name: "???", location: "???", desc: [LOCKED], exterior: "청록빛 표면이 천천히 꿈틀거리는 행성. 초록 균열이 표면을 따라 갈라져 있다." } },
  { id: "blackhole", kind: "blackhole", look: "blackhole", pos: v(-9.1, 0, 4.7), radius: 0.35, pick: 1.1, ring: 4.2, locked: true,
    info: { label: "블랙홀", name: "???", location: "???", desc: [LOCKED], exterior: "빛을 삼키는 검은 구. 그 둘레를 뜨거운 원반이 소용돌이친다." } },
  { id: "comet-blue", kind: "comet", look: "comet", pos: v(-8.3, 0.4, -3.4), radius: 0.12, pick: 0.9, locked: false,
    color: "#7fb4ff", glow: "rgba(120,180,255,.45)", tail: v(4.1, 0.3, -2.5),
    info: { label: "혜성", name: "???", location: "???", desc: ["???"], exterior: "푸른 빛의 긴 꼬리를 늘어뜨린 혜성." } },
  { id: "comet-red", kind: "comet", look: "comet", pos: v(7.8, 0.3, 0.5), radius: 0.12, pick: 0.9, locked: false,
    color: "#ff8a8a", glow: "rgba(255,120,120,.45)", tail: v(-3.0, 0, 3.4),
    info: { label: "혜성", name: "???", location: "???", desc: ["???"], exterior: "붉은 빛의 긴 꼬리를 늘어뜨린 혜성." } }
];
